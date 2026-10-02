import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendRingMegSms } from "@/lib/sms";
import {
  checkRateLimitPolicy,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ringMegSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn").max(100).trim(),
  phone: z.string().min(8, "Oppgi gyldig telefonnummer").max(20).trim(),
});

/**
 * POST /api/ring-meg
 * Sender SMS til salgsavdeling med kundens navn og telefon (proSMS.se, avsender HMS Nova).
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimitPolicy({
      policy: "publicForm",
      scope: "ring-meg",
      identifiers: [getClientIp(request)],
      failClosed: true,
    });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const parsed = ringMegSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = first.name?.[0] ?? first.phone?.[0] ?? "Ugyldig skjema";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { name, phone } = parsed.data;
    const salesPhone = process.env.RING_MEG_SALES_PHONE?.trim() ?? "";
    const lastFour = salesPhone.length >= 4 ? salesPhone.slice(-4) : "????";
    const result = await sendRingMegSms(name, phone);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Kunne ikke sende forespørsel. Prøv igjen senere." },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[ring-meg] SMS sendt til ***" + lastFour);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ring-meg] Error:", error);
    return NextResponse.json(
      { error: "Noe gikk galt. Prøv igjen senere." },
      { status: 500 }
    );
  }
}
