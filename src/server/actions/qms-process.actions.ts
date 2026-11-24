"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { prisma } from "@/lib/db";
import { AuditLog } from "@/lib/audit-log";
import { requirePermission } from "@/lib/server-authorization";
import {
  QMS_PROCESS_KINDS,
  QMS_PROCESS_STARTERS,
  QMS_PROCESS_STATUSES,
  isQmsModuleHref,
  processRecordError,
  type QmsProcessStepInput,
} from "@/lib/qms-processes";

const stepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

const formSchema = z.object({
  name: z.string().trim().min(2, "Navn må være minst 2 tegn").max(200),
  kind: z.enum(QMS_PROCESS_KINDS),
  status: z.enum(QMS_PROCESS_STATUSES),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  purpose: z.string().trim().max(8000).optional().or(z.literal("")),
  inputs: z.string().trim().max(8000).optional().or(z.literal("")),
  outputs: z.string().trim().max(8000).optional().or(z.literal("")),
  criteria: z.string().trim().max(8000).optional().or(z.literal("")),
  resources: z.string().trim().max(8000).optional().or(z.literal("")),
  risksAndOpportunities: z.string().trim().max(8000).optional().or(z.literal("")),
  scopeReason: z.string().trim().max(8000).optional().or(z.literal("")),
  evaluationNote: z.string().trim().max(8000).optional().or(z.literal("")),
  lastEvaluatedAt: z.string().optional().or(z.literal("")),
  nextReviewAt: z.string().optional().or(z.literal("")),
  ownerId: z.string().optional().or(z.literal("")),
  routineId: z.string().optional().or(z.literal("")),
  moduleHref: z.string().optional().or(z.literal("")),
});

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) return error.issues.map((issue) => issue.message).join(". ");
  if (error instanceof Error) return error.message;
  return fallback;
}

function blank(value: string | undefined): string | null {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseSteps(raw: string): QmsProcessStepInput[] {
  if (!raw.trim()) return [];
  try {
    const parsed = z.array(stepSchema).max(30).parse(JSON.parse(raw));
    return parsed.map((step) => ({
      title: step.title,
      description: step.description?.trim() ? step.description.trim() : undefined,
    }));
  } catch (error: unknown) {
    if (error instanceof ZodError) throw error;
    throw new Error("Stegene kunne ikke leses.");
  }
}

async function assertOwnerAndRoutine(tenantId: string, ownerId: string, routineId: string) {
  if (ownerId) {
    const member = await prisma.userTenant.findFirst({ where: { tenantId, userId: ownerId }, select: { userId: true } });
    if (!member) throw new Error("Prosesseieren må være en bruker i bedriften.");
  }
  if (routineId) {
    const routine = await prisma.routine.findFirst({ where: { tenantId, id: routineId }, select: { id: true } });
    if (!routine) throw new Error("Rutinen finnes ikke i bedriften.");
  }
}

function readPayload(formData: FormData) {
  const parsed = formSchema.parse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    status: formData.get("status"),
    sortOrder: formData.get("sortOrder") || "0",
    purpose: formData.get("purpose"),
    inputs: formData.get("inputs"),
    outputs: formData.get("outputs"),
    criteria: formData.get("criteria"),
    resources: formData.get("resources"),
    risksAndOpportunities: formData.get("risksAndOpportunities"),
    scopeReason: formData.get("scopeReason"),
    evaluationNote: formData.get("evaluationNote"),
    lastEvaluatedAt: formData.get("lastEvaluatedAt"),
    nextReviewAt: formData.get("nextReviewAt"),
    ownerId: formData.get("ownerId"),
    routineId: formData.get("routineId"),
    moduleHref: formData.get("moduleHref"),
  });
  const steps = parseSteps(String(formData.get("stepsJson") ?? "[]"));
  const moduleHref = parsed.moduleHref?.trim() ?? "";
  if (!isQmsModuleHref(moduleHref)) throw new Error("Ukjent modulkobling.");
  const deliversTo = [...new Set(formData.getAll("deliversTo").map((value) => String(value)).filter(Boolean))];
  const recordError = processRecordError({
    name: parsed.name,
    status: parsed.status,
    purpose: parsed.purpose ?? "",
    inputs: parsed.inputs ?? "",
    outputs: parsed.outputs ?? "",
    criteria: parsed.criteria ?? "",
    resources: parsed.resources ?? "",
    risksAndOpportunities: parsed.risksAndOpportunities ?? "",
    scopeReason: parsed.scopeReason ?? "",
    ownerId: parsed.ownerId ?? "",
    nextReviewAt: parsed.nextReviewAt ?? "",
    steps,
  });
  if (recordError) throw new Error(recordError);
  const evaluationNote = blank(parsed.evaluationNote);
  const lastEvaluatedAt = parseDate(parsed.lastEvaluatedAt) ?? (evaluationNote ? new Date() : null);
  return {
    data: {
      name: parsed.name,
      kind: parsed.kind,
      status: parsed.status,
      sortOrder: parsed.sortOrder,
      purpose: blank(parsed.purpose),
      inputs: blank(parsed.inputs),
      outputs: blank(parsed.outputs),
      criteria: blank(parsed.criteria),
      resources: blank(parsed.resources),
      risksAndOpportunities: blank(parsed.risksAndOpportunities),
      scopeReason: blank(parsed.scopeReason),
      evaluationNote,
      lastEvaluatedAt,
      nextReviewAt: parseDate(parsed.nextReviewAt),
      ownerId: blank(parsed.ownerId),
      routineId: blank(parsed.routineId),
      moduleHref: moduleHref || null,
    },
    steps,
    deliversTo,
  };
}

async function replaceStepsAndLinks(
  tenantId: string,
  processId: string,
  steps: QmsProcessStepInput[],
  deliversTo: string[],
) {
  const targets = deliversTo.filter((id) => id !== processId);
  if (targets.length > 0) {
    const found = await prisma.qmsProcess.findMany({
      where: { tenantId, id: { in: targets } },
      select: { id: true },
    });
    if (found.length !== targets.length) throw new Error("En av prosessene som er valgt som neste ledd, finnes ikke.");
  }
  await prisma.qmsProcessStep.deleteMany({ where: { processId, tenantId } });
  if (steps.length > 0) {
    await prisma.qmsProcessStep.createMany({
      data: steps.map((step, index) => ({
        tenantId,
        processId,
        sortOrder: (index + 1) * 10,
        title: step.title.trim(),
        description: step.description?.trim() || null,
      })),
    });
  }
  await prisma.qmsProcessLink.deleteMany({ where: { fromProcessId: processId, tenantId } });
  if (targets.length > 0) {
    await prisma.qmsProcessLink.createMany({
      data: targets.map((toProcessId) => ({ tenantId, fromProcessId: processId, toProcessId })),
    });
  }
}

function refresh() {
  revalidatePath("/dashboard/prosesser");
  revalidatePath("/dashboard/hms-handbok");
}

export async function createQmsProcess(formData: FormData): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const context = await requirePermission("canCreateDocuments");
    const payload = readPayload(formData);
    await assertOwnerAndRoutine(context.tenantId, payload.data.ownerId ?? "", payload.data.routineId ?? "");
    const process = await prisma.qmsProcess.create({
      data: { ...payload.data, tenantId: context.tenantId, createdById: context.userId },
    });
    await replaceStepsAndLinks(context.tenantId, process.id, payload.steps, payload.deliversTo);
    await AuditLog.log(context.tenantId, context.userId, "QMS_PROCESS_CREATED", "QmsProcess", process.id, {
      name: process.name,
    });
    refresh();
    return { success: true, id: process.id };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke lagre prosessen.") };
  }
}

export async function updateQmsProcess(
  id: string,
  formData: FormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const context = await requirePermission("canCreateDocuments");
    const existing = await prisma.qmsProcess.findFirst({ where: { id, tenantId: context.tenantId }, select: { id: true } });
    if (!existing) return { success: false, error: "Prosessen finnes ikke." };
    const payload = readPayload(formData);
    await assertOwnerAndRoutine(context.tenantId, payload.data.ownerId ?? "", payload.data.routineId ?? "");
    await prisma.qmsProcess.update({
      where: { id },
      data: { ...payload.data, updatedById: context.userId },
    });
    await replaceStepsAndLinks(context.tenantId, id, payload.steps, payload.deliversTo);
    await AuditLog.log(context.tenantId, context.userId, "QMS_PROCESS_UPDATED", "QmsProcess", id, {
      name: payload.data.name,
      status: payload.data.status,
    });
    refresh();
    revalidatePath(`/dashboard/prosesser/${id}`);
    return { success: true, id };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke lagre prosessen.") };
  }
}

export async function deleteQmsProcess(id: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await requirePermission("canCreateDocuments");
    const existing = await prisma.qmsProcess.findFirst({
      where: { id, tenantId: context.tenantId },
      select: { id: true, name: true },
    });
    if (!existing) return { success: false, error: "Prosessen finnes ikke." };
    await prisma.qmsProcess.delete({ where: { id } });
    await AuditLog.log(context.tenantId, context.userId, "QMS_PROCESS_DELETED", "QmsProcess", id, {
      name: existing.name,
    });
    refresh();
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke slette prosessen.") };
  }
}

export async function seedQmsProcessStarters(): Promise<{ success: true; created: number } | { success: false; error: string }> {
  try {
    const context = await requirePermission("canCreateDocuments");
    const existing = await prisma.qmsProcess.findMany({
      where: { tenantId: context.tenantId, sourceKey: { not: null } },
      select: { id: true, sourceKey: true },
    });
    const byKey = new Map(existing.flatMap((row) => (row.sourceKey ? [[row.sourceKey, row.id] as const] : [])));
    const createdIds = new Set<string>();
    let created = 0;
    for (const starter of QMS_PROCESS_STARTERS) {
      if (byKey.has(starter.sourceKey)) continue;
      const process = await prisma.qmsProcess.create({
        data: {
          tenantId: context.tenantId,
          sourceKey: starter.sourceKey,
          name: starter.name,
          kind: starter.kind,
          status: "DRAFT",
          sortOrder: starter.sortOrder,
          purpose: starter.purpose,
          inputs: starter.inputs,
          outputs: starter.outputs,
          criteria: starter.criteria,
          resources: starter.resources,
          risksAndOpportunities: starter.risksAndOpportunities,
          moduleHref: starter.moduleHref || null,
          createdById: context.userId,
          steps: {
            create: starter.steps.map((step, index) => ({
              tenantId: context.tenantId,
              sortOrder: (index + 1) * 10,
              title: step.title,
              description: step.description ?? null,
            })),
          },
        },
      });
      byKey.set(starter.sourceKey, process.id);
      createdIds.add(process.id);
      created += 1;
    }
    const links = QMS_PROCESS_STARTERS.flatMap((starter) => {
      const fromProcessId = byKey.get(starter.sourceKey);
      if (!fromProcessId) return [];
      return starter.deliversTo.flatMap((key) => {
        const toProcessId = byKey.get(key);
        if (!toProcessId || toProcessId === fromProcessId) return [];
        if (!createdIds.has(fromProcessId) && !createdIds.has(toProcessId)) return [];
        return [{ tenantId: context.tenantId, fromProcessId, toProcessId }];
      });
    });
    if (links.length > 0) {
      await prisma.qmsProcessLink.createMany({ data: links, skipDuplicates: true });
    }
    await AuditLog.log(context.tenantId, context.userId, "QMS_PROCESS_STARTERS_SEEDED", "QmsProcess", context.tenantId, {
      created,
    });
    refresh();
    return { success: true, created };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke legge inn forslagene.") };
  }
}
