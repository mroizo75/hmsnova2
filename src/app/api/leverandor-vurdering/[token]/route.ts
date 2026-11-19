import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitPolicy, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { submitSupplierAssessment } from "@/server/supplier-assessment";

const bodySchema = z.object({
  respondentName: z.string().trim().min(2).max(200),
  respondentEmail: z.string().trim().email("Skriv en gyldig e-postadresse.").max(200),
  answers: z.array(z.object({
    questionId: z.string().trim().min(1).max(80),
    value: z.string().max(8000),
  })).max(40),
});

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const rateLimit = await checkRateLimitPolicy({
    policy: "publicForm",
    scope: "supplier-assessment",
    identifiers: [getClientIp(request)],
    failClosed: true,
  });
  if (!rateLimit.success) return createRateLimitResponse(rateLimit);

  try {
    const { token } = await context.params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(". ") },
        { status: 400 },
      );
    }
    const result = await submitSupplierAssessment(token, parsed.data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Kunne ikke lagre svaret." }, { status: 500 });
  }
}
