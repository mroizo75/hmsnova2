"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { requirePermission } from "@/lib/server-authorization";
import {
  SUPPLIER_EVALUATION_OUTCOMES,
  serializeSupplierQuestions,
  statusFromOutcome,
  supplierAssessmentEmail,
  supplierAssessmentUrl,
  validateEvaluationRecord,
  validateSupplierApproval,
  type SupplierEvaluationOutcomeValue,
  type SupplierQuestion,
} from "@/lib/supplier-management";

const reviewSchema = z.object({
  outcome: z.enum(SUPPLIER_EVALUATION_OUTCOMES),
  summary: z.string().trim().min(10).max(8000),
  actions: z.string().trim().max(8000).optional().or(z.literal("")),
  nextReviewAt: z.string().optional().or(z.literal("")),
});

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function parseDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidateSupplier(id: string) {
  revalidatePath("/dashboard/leverandorer");
  revalidatePath(`/dashboard/leverandorer/${id}`);
}

async function deliverAssessment(input: {
  tenantName: string;
  supplierName: string;
  email: string;
  dueAt: Date;
  token: string;
  reminder: boolean;
}) {
  const message = supplierAssessmentEmail({
    tenantName: input.tenantName,
    supplierName: input.supplierName,
    dueAt: input.dueAt,
    url: supplierAssessmentUrl(input.token),
    reminder: input.reminder,
  });
  await sendEmail({ to: input.email, subject: message.subject, html: message.html });
}

export async function sendSupplierAssessment(supplierId: string, formData: FormData) {
  try {
    const context = await requirePermission("canCreateAudits");
    const dueAt = parseDate(String(formData.get("dueAt") ?? ""));
    if (!dueAt) return { success: false as const, error: "Velg en svarfrist." };
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (dueAt < start) return { success: false as const, error: "Svarfristen må være i dag eller senere." };

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId: context.tenantId },
      include: { tenant: { select: { name: true } } },
    });
    if (!supplier) return { success: false as const, error: "Leverandør ikke funnet" };
    if (!supplier.contactEmail) {
      return { success: false as const, error: "Registrer e-post før selvevalueringen sendes." };
    }
    if ((supplier.criteria ?? "").trim().length < 10) {
      return { success: false as const, error: "Skriv kriteriene for vurdering før skjemaet sendes (ISO 9001 pkt. 8.4.1)." };
    }
    if ((supplier.requirements ?? "").trim().length < 10) {
      return { success: false as const, error: "Skriv kravene som skal kommuniseres før skjemaet sendes (ISO 9001 pkt. 8.4.3)." };
    }
    if ((supplier.controls ?? "").trim().length < 10) {
      return { success: false as const, error: "Skriv type og omfang av styring før skjemaet sendes (ISO 9001 pkt. 8.4.2)." };
    }

    const form = await prisma.supplierFormTemplate.findUnique({
      where: { tenantId: context.tenantId },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
    if (!form || form.questions.length === 0) {
      return { success: false as const, error: "Definer spørsmålene i skjemaet før det sendes." };
    }
    const questions: SupplierQuestion[] = form.questions.map((question) => ({
      id: question.id,
      label: question.label,
      helpText: question.helpText ?? "",
      fieldType: question.fieldType,
      required: question.required,
    }));

    await prisma.supplierAssessment.updateMany({
      where: { supplierId: supplier.id, status: "SENT" },
      data: { status: "CANCELLED" },
    });

    const assessment = await prisma.supplierAssessment.create({
      data: {
        tenantId: context.tenantId,
        supplierId: supplier.id,
        token: randomBytes(24).toString("hex"),
        status: "SENT",
        dueAt,
        sentAt: new Date(),
        sentToEmail: supplier.contactEmail,
        requirementsSnapshot: supplier.requirements!.trim(),
        controlsSnapshot: supplier.controls!.trim(),
        worksOnSite: supplier.worksOnSite,
        questionsSnapshot: serializeSupplierQuestions(questions),
        createdById: context.userId,
      },
    });

    try {
      await deliverAssessment({
        tenantName: supplier.tenant.name,
        supplierName: supplier.name,
        email: supplier.contactEmail,
        dueAt,
        token: assessment.token,
        reminder: false,
      });
    } catch {
      revalidateSupplier(supplierId);
      return {
        success: false as const,
        error: "Forespørselen er lagret, men e-posten ble ikke sendt. Bruk send på nytt.",
      };
    }

    revalidateSupplier(supplierId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke sende selvevaluering") };
  }
}

export async function resendSupplierAssessment(assessmentId: string) {
  try {
    const context = await requirePermission("canCreateAudits");
    const assessment = await prisma.supplierAssessment.findFirst({
      where: { id: assessmentId, tenantId: context.tenantId, status: "SENT" },
      include: { supplier: { select: { id: true, name: true } }, tenant: { select: { name: true } } },
    });
    if (!assessment) return { success: false as const, error: "Forespørselen kan ikke sendes på nytt" };
    await deliverAssessment({
      tenantName: assessment.tenant.name,
      supplierName: assessment.supplier.name,
      email: assessment.sentToEmail,
      dueAt: assessment.dueAt,
      token: assessment.token,
      reminder: true,
    });
    await prisma.supplierAssessment.update({
      where: { id: assessment.id },
      data: { reminderSentAt: new Date() },
    });
    revalidateSupplier(assessment.supplier.id);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke sende e-posten på nytt") };
  }
}

export async function reviewSupplierAssessment(assessmentId: string, formData: FormData) {
  try {
    const context = await requirePermission("canCreateAudits");
    const assessment = await prisma.supplierAssessment.findFirst({
      where: { id: assessmentId, tenantId: context.tenantId, status: "ANSWERED" },
      select: {
        id: true,
        supplierId: true,
        supplier: { select: { criteria: true, controls: true, requirements: true, contactEmail: true } },
      },
    });
    if (!assessment) return { success: false as const, error: "Svaret er ikke klart for behandling" };

    const parsed = reviewSchema.parse(Object.fromEntries(formData.entries()));
    const nextReviewAt = parseDate(parsed.nextReviewAt);
    const check = validateEvaluationRecord({
      outcome: parsed.outcome,
      summary: parsed.summary,
      nextReviewAt,
      now: new Date(),
    });
    if (check.ok === false) return { success: false as const, error: check.message };
    const approval = validateSupplierApproval({
      status: parsed.outcome,
      criteria: assessment.supplier.criteria ?? "",
      controls: assessment.supplier.controls ?? "",
      requirements: assessment.supplier.requirements ?? "",
      contactEmail: assessment.supplier.contactEmail ?? "",
      nextReviewAt,
      now: new Date(),
    });
    if (approval.ok === false) return { success: false as const, error: approval.message };

    const outcome = parsed.outcome as SupplierEvaluationOutcomeValue;
    const approved = outcome === "APPROVED" || outcome === "CONDITIONAL";
    const now = new Date();
    await prisma.$transaction([
      prisma.supplierEvaluation.create({
        data: {
          tenantId: context.tenantId,
          supplierId: assessment.supplierId,
          method: "SELF_ASSESSMENT",
          outcome,
          summary: parsed.summary.trim(),
          actions: parsed.actions?.trim() || null,
          evaluatedAt: now,
          evaluatedById: context.userId,
          nextReviewAt,
          assessmentId: assessment.id,
        },
      }),
      prisma.supplierAssessment.update({
        where: { id: assessment.id },
        data: {
          status: approved ? "ACCEPTED" : "REJECTED",
          reviewNote: parsed.actions?.trim() || null,
          reviewedById: context.userId,
          reviewedAt: now,
        },
      }),
      prisma.supplier.update({
        where: { id: assessment.supplierId },
        data: {
          status: statusFromOutcome(outcome),
          nextReviewAt,
          approvedById: approved ? context.userId : null,
          approvedAt: approved ? now : null,
        },
      }),
    ]);
    revalidateSupplier(assessment.supplierId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke behandle svaret") };
  }
}
