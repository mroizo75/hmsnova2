import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { surveySentiment, syncCustomerSatisfactionGoal } from "@/server/satisfaction";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  summary: z.string().trim().min(5, "Skriv minst en setning om opplevelsen.").max(2000),
  customerName: z.string().trim().max(140).optional().or(z.literal("")),
  customerCompany: z.string().trim().max(140).optional().or(z.literal("")),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const survey = await prisma.satisfactionSurvey.findUnique({ where: { token } });
    if (!survey || !survey.active) {
      return NextResponse.json({ error: "Lenken er ikke aktiv." }, { status: 404 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(". ") },
        { status: 400 },
      );
    }

    const rating = parsed.data.rating;
    await prisma.customerFeedback.create({
      data: {
        tenantId: survey.tenantId,
        recordedById: survey.createdById,
        source: "SURVEY",
        sentiment: surveySentiment(rating),
        rating,
        summary: parsed.data.summary,
        customerName: parsed.data.customerName?.trim() || null,
        customerCompany: parsed.data.customerCompany?.trim() || null,
        contactEmail: parsed.data.contactEmail?.trim() || null,
        feedbackDate: new Date(),
        followUpStatus: rating <= 2 ? "FOLLOW_UP" : "NEW",
      },
    });

    await syncCustomerSatisfactionGoal(survey.tenantId, survey.createdById);
    revalidatePath("/dashboard/feedback");
    revalidatePath("/dashboard/goals");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Kunne ikke lagre tilbakemeldingen." }, { status: 500 });
  }
}
