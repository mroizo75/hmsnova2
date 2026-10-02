import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  checkRateLimitPolicy,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/rate-limit";
import { sendRingMegSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

const tierEnum = z.enum(["SMALL", "MEDIUM", "LARGE"]);
const typeEnum = z.enum(["WAITLIST", "CONTACT"]);

const leadSchema = z.object({
  email: z.string().email("Oppgi gyldig e-post").max(255).trim().toLowerCase(),
  name: z.string().min(1, "Navn må fylles ut").max(100).trim().optional(),
  phone: z.string().max(20).trim().optional(),
  tier: tierEnum,
  type: typeEnum,
});

type PrismaWithPackageLead = typeof prisma & {
  packageLead?: {
    create: (args: {
      data: {
        email: string;
        name: string | null;
        phone: string | null;
        tier: string;
        type: string;
        source: string;
      };
    }) => Promise<unknown>;
  };
};

/**
 * POST /api/komplett-pakke/lead
 * Registrer venteliste eller tilbudsforespørsel for Komplett HMS-pakke.
 * Ved type CONTACT og phone sendes også SMS til salg (Ring meg).
 * Krever at Prisma-migrasjon for PackageLead er kjørt og at `npx prisma generate` er kjørt.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimitPolicy({
      policy: "publicForm",
      scope: "komplett-pakke",
      identifiers: [getClientIp(request)],
      failClosed: true,
    });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message =
        first.email?.[0] ?? first.name?.[0] ?? first.tier?.[0] ?? first.type?.[0] ?? "Ugyldig skjema";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, name, phone, tier, type } = parsed.data;

    const db = prisma as PrismaWithPackageLead;
    if (db.packageLead) {
      await db.packageLead.create({
        data: {
          email,
          name: name ?? null,
          phone: phone ?? null,
          tier,
          type,
          source: "komplett-pakke",
        },
      });
    }

    if (type === "CONTACT" && phone && phone.length >= 8) {
      const displayName = name?.trim() || "Komplett pakke-kunde";
      const smsResult = await sendRingMegSms(displayName, phone.trim());
      if (!smsResult.success && process.env.NODE_ENV === "production") {
        // Log but don't fail – lead is saved
        console.warn("[komplett-pakke] SMS til salg feilet:", smsResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        type === "WAITLIST"
          ? "Du er satt på ventelisten. Vi tar kontakt når vi har plass."
          : "Takk! Vi tar kontakt så snart vi kan.",
    });
  } catch (error) {
    console.error("[komplett-pakke/lead] Error:", error);
    return NextResponse.json(
      { error: "Kunne ikke registrere. Prøv igjen senere." },
      { status: 500 }
    );
  }
}
