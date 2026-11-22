"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuditLog } from "@/lib/audit-log";
import { requirePermission } from "@/lib/server-authorization";
import {
  SUPPLIER_CRITICALITIES,
  SUPPLIER_EVALUATION_OUTCOMES,
  SUPPLIER_MANUAL_METHODS,
  normalizeEmail,
  normalizeOrgNumber,
  statusFromOutcome,
  validateEvaluationRecord,
  validateSupplierApproval,
  type SupplierEvaluationMethodValue,
  type SupplierEvaluationOutcomeValue,
} from "@/lib/supplier-management";

const supplierSchema = z.object({
  name: z.string().trim().min(2, "Navn må være minst 2 tegn").max(200),
  orgNumber: z.string().trim().max(20).optional().or(z.literal("")),
  scope: z.string().trim().max(4000).optional().or(z.literal("")),
  contactName: z.string().trim().max(200).optional().or(z.literal("")),
  contactEmail: z.string().trim().max(200).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  worksOnSite: z.string().optional().or(z.literal("")),
  criticality: z.enum(SUPPLIER_CRITICALITIES),
  criteria: z.string().trim().max(8000).optional().or(z.literal("")),
  controls: z.string().trim().max(8000).optional().or(z.literal("")),
  requirements: z.string().trim().max(8000).optional().or(z.literal("")),
  notes: z.string().trim().max(8000).optional().or(z.literal("")),
});

const evaluationSchema = z.object({
  method: z.enum(SUPPLIER_MANUAL_METHODS),
  outcome: z.enum(SUPPLIER_EVALUATION_OUTCOMES),
  summary: z.string().trim().min(10, "Vurderingen må beskrive hva som er gjennomgått.").max(8000),
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

function toData(input: z.infer<typeof supplierSchema>) {
  return {
    name: input.name.trim(),
    orgNumber: normalizeOrgNumber(input.orgNumber ?? ""),
    scope: input.scope?.trim() || null,
    contactName: input.contactName?.trim() || null,
    contactEmail: normalizeEmail(input.contactEmail ?? ""),
    contactPhone: input.contactPhone?.trim() || null,
    worksOnSite: input.worksOnSite === "on" || input.worksOnSite === "true",
    criticality: input.criticality,
    criteria: input.criteria?.trim() || null,
    controls: input.controls?.trim() || null,
    requirements: input.requirements?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

function revalidateSupplier(id?: string) {
  revalidatePath("/dashboard/leverandorer");
  if (id) revalidatePath(`/dashboard/leverandorer/${id}`);
}

export async function createSupplier(formData: FormData) {
  try {
    const context = await requirePermission("canCreateAudits");
    const parsed = supplierSchema.parse(Object.fromEntries(formData.entries()));
    const supplier = await prisma.supplier.create({
      data: { tenantId: context.tenantId, status: "PENDING", ...toData(parsed) },
    });
    AuditLog.log(context.tenantId, context.userId, "SUPPLIER_CREATED", "Supplier", supplier.id, {
      name: supplier.name,
      status: supplier.status,
    }).catch(() => {});
    revalidateSupplier(supplier.id);
    return { success: true as const, id: supplier.id };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre leverandør") };
  }
}

export async function updateSupplier(id: string, formData: FormData) {
  try {
    const context = await requirePermission("canCreateAudits");
    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId: context.tenantId },
      select: { id: true },
    });
    if (!existing) return { success: false as const, error: "Leverandør ikke funnet" };
    const parsed = supplierSchema.parse(Object.fromEntries(formData.entries()));
    const supplier = await prisma.supplier.update({
      where: { id },
      data: toData(parsed),
    });
    AuditLog.log(context.tenantId, context.userId, "SUPPLIER_UPDATED", "Supplier", supplier.id, {
      status: supplier.status,
    }).catch(() => {});
    revalidateSupplier(id);
    return { success: true as const, id: supplier.id };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke oppdatere leverandør") };
  }
}

export async function recordSupplierEvaluation(supplierId: string, formData: FormData) {
  try {
    const context = await requirePermission("canCreateAudits");
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId: context.tenantId },
      select: { id: true, criteria: true, controls: true, requirements: true, contactEmail: true },
    });
    if (!supplier) return { success: false as const, error: "Leverandør ikke funnet" };
    const parsed = evaluationSchema.parse(Object.fromEntries(formData.entries()));
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
      criteria: supplier.criteria ?? "",
      controls: supplier.controls ?? "",
      requirements: supplier.requirements ?? "",
      contactEmail: supplier.contactEmail ?? "",
      nextReviewAt,
      now: new Date(),
    });
    if (approval.ok === false) return { success: false as const, error: approval.message };

    const outcome = parsed.outcome as SupplierEvaluationOutcomeValue;
    const approved = outcome === "APPROVED" || outcome === "CONDITIONAL";
    await prisma.$transaction([
      prisma.supplierEvaluation.create({
        data: {
          tenantId: context.tenantId,
          supplierId: supplier.id,
          method: parsed.method as SupplierEvaluationMethodValue,
          outcome,
          summary: parsed.summary.trim(),
          actions: parsed.actions?.trim() || null,
          evaluatedAt: new Date(),
          evaluatedById: context.userId,
          nextReviewAt,
        },
      }),
      prisma.supplier.update({
        where: { id: supplier.id },
        data: {
          status: statusFromOutcome(outcome),
          nextReviewAt,
          approvedById: approved ? context.userId : null,
          approvedAt: approved ? new Date() : null,
        },
      }),
    ]);
    revalidateSupplier(supplierId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre vurderingen") };
  }
}

export async function linkSupplierAudit(supplierId: string, auditId: string) {
  try {
    const context = await requirePermission("canCreateAudits");
    const [supplier, audit] = await Promise.all([
      prisma.supplier.findFirst({ where: { id: supplierId, tenantId: context.tenantId }, select: { id: true } }),
      prisma.audit.findFirst({
        where: { id: auditId, tenantId: context.tenantId, auditType: "SUPPLIER" },
        select: { id: true },
      }),
    ]);
    if (!supplier || !audit) {
      return { success: false as const, error: "Leverandørrevisjonen finnes ikke" };
    }
    await prisma.audit.update({ where: { id: audit.id }, data: { supplierId: supplier.id } });
    revalidateSupplier(supplierId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke koble revisjon") };
  }
}

export async function linkSupplierIncident(supplierId: string, incidentId: string) {
  try {
    const context = await requirePermission("canCreateAudits");
    const [supplier, incident] = await Promise.all([
      prisma.supplier.findFirst({ where: { id: supplierId, tenantId: context.tenantId }, select: { id: true } }),
      prisma.incident.findFirst({
        where: { id: incidentId, tenantId: context.tenantId, type: "KVALITET" },
        select: { id: true },
      }),
    ]);
    if (!supplier || !incident) {
      return { success: false as const, error: "Kvalitetsavviket finnes ikke" };
    }
    await prisma.incident.update({ where: { id: incident.id }, data: { supplierId: supplier.id } });
    revalidateSupplier(supplierId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke koble avvik") };
  }
}
