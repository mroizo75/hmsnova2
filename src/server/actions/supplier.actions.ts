"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuditLog } from "@/lib/audit-log";
import { requirePermission } from "@/lib/server-authorization";
import {
  SUPPLIER_CRITICALITIES,
  SUPPLIER_STATUSES,
  approvalRequiresCriteria,
  normalizeOrgNumber,
  validateSupplierApproval,
} from "@/lib/supplier-management";

const supplierSchema = z.object({
  name: z.string().trim().min(2, "Navn må være minst 2 tegn").max(200),
  orgNumber: z.string().trim().max(20).optional().or(z.literal("")),
  scope: z.string().trim().max(4000).optional().or(z.literal("")),
  status: z.enum(SUPPLIER_STATUSES),
  criticality: z.enum(SUPPLIER_CRITICALITIES),
  criteria: z.string().trim().max(8000).optional().or(z.literal("")),
  nextReviewAt: z.string().optional().or(z.literal("")),
  validUntil: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(8000).optional().or(z.literal("")),
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

function toData(input: z.infer<typeof supplierSchema>, userId: string) {
  const nextReviewAt = parseDate(input.nextReviewAt);
  const validUntil = parseDate(input.validUntil);
  const criteria = input.criteria?.trim() || null;
  const check = validateSupplierApproval({
    status: input.status,
    criteria: criteria ?? "",
    nextReviewAt,
    now: new Date(),
  });
  if (check.ok === false) {
    throw new Error(check.message);
  }
  const approved = approvalRequiresCriteria(input.status);
  return {
    name: input.name.trim(),
    orgNumber: normalizeOrgNumber(input.orgNumber ?? ""),
    scope: input.scope?.trim() || null,
    status: input.status,
    criticality: input.criticality,
    criteria,
    nextReviewAt,
    validUntil,
    notes: input.notes?.trim() || null,
    approvedById: approved ? userId : null,
    approvedAt: approved ? new Date() : null,
  };
}

export async function createSupplier(formData: FormData) {
  try {
    const context = await requirePermission("canCreateAudits");
    const parsed = supplierSchema.parse(Object.fromEntries(formData.entries()));
    const supplier = await prisma.supplier.create({
      data: { tenantId: context.tenantId, ...toData(parsed, context.userId) },
    });
    AuditLog.log(context.tenantId, context.userId, "SUPPLIER_CREATED", "Supplier", supplier.id, {
      name: supplier.name,
      status: supplier.status,
    }).catch(() => {});
    revalidatePath("/dashboard/leverandorer");
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
      data: toData(parsed, context.userId),
    });
    AuditLog.log(context.tenantId, context.userId, "SUPPLIER_UPDATED", "Supplier", supplier.id, {
      status: supplier.status,
    }).catch(() => {});
    revalidatePath("/dashboard/leverandorer");
    revalidatePath(`/dashboard/leverandorer/${id}`);
    return { success: true as const, id: supplier.id };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke oppdatere leverandør") };
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
    revalidatePath(`/dashboard/leverandorer/${supplierId}`);
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
    revalidatePath(`/dashboard/leverandorer/${supplierId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke koble avvik") };
  }
}
