"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/server-authorization";
import {
  SUPPLIER_QUESTION_TYPES,
  validateSupplierQuestions,
  type SupplierQuestionDraft,
  type SupplierQuestionTypeValue,
} from "@/lib/supplier-management";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function saveSupplierForm(formData: FormData) {
  try {
    const context = await requirePermission("canCreateAudits");
    const title = String(formData.get("title") ?? "").trim();
    if (title.length < 2 || title.length > 120) {
      return { success: false as const, error: "Skriv et navn på skjemaet." };
    }
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("questions") ?? ""));
    } catch {
      return { success: false as const, error: "Spørsmålene kunne ikke leses." };
    }
    if (!Array.isArray(raw)) {
      return { success: false as const, error: "Spørsmålene kunne ikke leses." };
    }
    const questions: SupplierQuestionDraft[] = raw.map((item) => {
      const row = item as Partial<SupplierQuestionDraft>;
      return {
        label: String(row.label ?? ""),
        helpText: String(row.helpText ?? ""),
        fieldType: String(row.fieldType ?? "TEXTAREA") as SupplierQuestionTypeValue,
        required: row.required !== false,
      };
    });
    if (questions.some((question) => !SUPPLIER_QUESTION_TYPES.includes(question.fieldType))) {
      return { success: false as const, error: "Velg en gyldig svartype." };
    }
    const check = validateSupplierQuestions(questions);
    if (check.ok === false) return { success: false as const, error: check.message };

    const template = await prisma.supplierFormTemplate.upsert({
      where: { tenantId: context.tenantId },
      update: { title, updatedById: context.userId },
      create: { tenantId: context.tenantId, title, updatedById: context.userId },
    });
    await prisma.$transaction([
      prisma.supplierFormQuestion.deleteMany({ where: { templateId: template.id } }),
      prisma.supplierFormQuestion.createMany({
        data: questions.map((question, index) => ({
          templateId: template.id,
          label: question.label.trim(),
          helpText: question.helpText.trim() || null,
          fieldType: question.fieldType,
          required: question.required,
          sortOrder: index,
        })),
      }),
    ]);
    revalidatePath("/dashboard/leverandorer/skjema");
    revalidatePath("/dashboard/leverandorer");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre skjemaet") };
  }
}
