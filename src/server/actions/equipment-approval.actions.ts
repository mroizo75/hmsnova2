"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/server-authorization";
import { getStorage, generateFileKey } from "@/lib/storage";
import { validateElectroUploadFile } from "@/lib/electro-upload";
import {
  EQUIPMENT_APPROVAL_PATH,
  equipmentApprovalInputSchema,
  industryHasEquipmentApproval,
  parseDateOnly,
  type EquipmentApprovalInput,
} from "@/lib/equipment-approval";

type ActionError = { code: string; message: string };

function fail(code: string, message: string): { success: false; error: ActionError } {
  return { success: false, error: { code, message } };
}

function formatActionError(error: unknown, fallback: string): ActionError {
  if (error instanceof ZodError) {
    return { code: "VALIDATION", message: error.issues.map((issue) => issue.message).join(". ") };
  }
  if (error instanceof Error) return { code: "ERROR", message: error.message };
  return { code: "ERROR", message: fallback };
}

async function requireEquipmentAccess(mode: "read" | "write") {
  const context = await requirePermission(
    mode === "write" ? "canCreateInspections" : "canReadInspections",
  );
  const tenant = await prisma.tenant.findUnique({
    where: { id: context.tenantId },
    select: { industry: true },
  });
  if (!industryHasEquipmentApproval(tenant?.industry)) {
    throw new Error("Utstyr med godkjenning er ikke tilgjengelig for denne bransjen.");
  }
  return context;
}

function readInput(formData: FormData): EquipmentApprovalInput {
  return equipmentApprovalInputSchema.parse({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    supplierName: String(formData.get("supplierName") ?? ""),
    approvalBody: String(formData.get("approvalBody") ?? ""),
    certificateNumber: String(formData.get("certificateNumber") ?? ""),
    serialNumber: String(formData.get("serialNumber") ?? ""),
    location: String(formData.get("location") ?? ""),
    validFrom: String(formData.get("validFrom") ?? ""),
    validTo: String(formData.get("validTo") ?? ""),
    operationalStatus: String(formData.get("operationalStatus") ?? "IN_USE"),
    notes: String(formData.get("notes") ?? ""),
  });
}

function collectFiles(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

async function storeDocuments(tenantId: string, equipmentId: string, userId: string, files: File[]) {
  if (files.length > 8) {
    throw new Error("Du kan laste opp maks 8 filer om gangen.");
  }
  for (const file of files) {
    const validation = validateElectroUploadFile(file);
    if (validation) throw new Error(validation.message);
  }
  const storage = getStorage();
  for (const file of files) {
    const fileKey = generateFileKey(tenantId, "equipment-approvals", file.name);
    await storage.upload(fileKey, file);
    await prisma.equipmentApprovalDocument.create({
      data: {
        tenantId,
        equipmentId,
        fileKey,
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        uploadedById: userId,
      },
    });
  }
}

function revalidateEquipment(id?: string) {
  revalidatePath(EQUIPMENT_APPROVAL_PATH);
  if (id) revalidatePath(`${EQUIPMENT_APPROVAL_PATH}/${id}`);
}

export async function createEquipmentApproval(formData: FormData) {
  try {
    const context = await requireEquipmentAccess("write");
    const input = readInput(formData);
    const files = collectFiles(formData);
    const created = await prisma.equipmentApproval.create({
      data: {
        tenantId: context.tenantId,
        name: input.name,
        category: input.category,
        supplierName: input.supplierName,
        approvalBody: input.approvalBody,
        certificateNumber: input.certificateNumber,
        serialNumber: input.serialNumber,
        location: input.location,
        validFrom: parseDateOnly(input.validFrom),
        validTo: parseDateOnly(input.validTo),
        operationalStatus: input.operationalStatus,
        notes: input.notes,
        createdById: context.userId,
      },
      select: { id: true },
    });
    let warning: string | null = null;
    try {
      await storeDocuments(context.tenantId, created.id, context.userId, files);
    } catch (error: unknown) {
      warning = error instanceof Error ? error.message : "Kunne ikke laste opp dokumentet";
    }
    revalidateEquipment(created.id);
    return { success: true as const, data: created, warning };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre utstyret") };
  }
}

export async function updateEquipmentApproval(id: string, formData: FormData) {
  try {
    const context = await requireEquipmentAccess("write");
    const existing = await prisma.equipmentApproval.findFirst({
      where: { id, tenantId: context.tenantId },
      select: { id: true },
    });
    if (!existing) return fail("NOT_FOUND", "Fant ikke utstyret.");
    const input = readInput(formData);
    await prisma.equipmentApproval.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        category: input.category,
        supplierName: input.supplierName,
        approvalBody: input.approvalBody,
        certificateNumber: input.certificateNumber,
        serialNumber: input.serialNumber,
        location: input.location,
        validFrom: parseDateOnly(input.validFrom),
        validTo: parseDateOnly(input.validTo),
        operationalStatus: input.operationalStatus,
        notes: input.notes,
      },
    });
    revalidateEquipment(existing.id);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke oppdatere utstyret") };
  }
}

export async function uploadEquipmentDocuments(equipmentId: string, formData: FormData) {
  try {
    const context = await requireEquipmentAccess("write");
    const existing = await prisma.equipmentApproval.findFirst({
      where: { id: equipmentId, tenantId: context.tenantId },
      select: { id: true },
    });
    if (!existing) return fail("NOT_FOUND", "Fant ikke utstyret.");
    const files = collectFiles(formData);
    if (files.length === 0) return fail("MISSING_FILE", "Velg minst ett dokument.");
    await storeDocuments(context.tenantId, existing.id, context.userId, files);
    revalidateEquipment(existing.id);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke laste opp dokumentet") };
  }
}

export async function deleteEquipmentDocument(documentId: string) {
  try {
    const context = await requireEquipmentAccess("write");
    const document = await prisma.equipmentApprovalDocument.findFirst({
      where: { id: documentId, tenantId: context.tenantId },
    });
    if (!document) return fail("NOT_FOUND", "Fant ikke dokumentet.");
    await prisma.equipmentApprovalDocument.delete({ where: { id: document.id } });
    try {
      await getStorage().delete(document.fileKey);
    } catch {
      // Filen kan allerede være borte. Registeret skal likevel oppdateres.
    }
    revalidateEquipment(document.equipmentId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke slette dokumentet") };
  }
}

export async function linkEquipmentRoutine(equipmentId: string, routineId: string) {
  try {
    const context = await requireEquipmentAccess("write");
    const [equipment, routine] = await Promise.all([
      prisma.equipmentApproval.findFirst({
        where: { id: equipmentId, tenantId: context.tenantId },
        select: { id: true },
      }),
      prisma.routine.findFirst({
        where: { id: routineId, tenantId: context.tenantId },
        select: { id: true },
      }),
    ]);
    if (!equipment || !routine) return fail("NOT_FOUND", "Utstyr eller rutine finnes ikke.");
    await prisma.equipmentRoutineLink.create({
      data: { equipmentId, routineId },
    });
    revalidateEquipment(equipmentId);
    return { success: true as const };
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "P2002") return fail("DUPLICATE", "Rutinen er allerede knyttet til utstyret.");
    return { success: false as const, error: formatActionError(error, "Kunne ikke knytte rutinen") };
  }
}

export async function unlinkEquipmentRoutine(equipmentId: string, routineId: string) {
  try {
    const context = await requireEquipmentAccess("write");
    const equipment = await prisma.equipmentApproval.findFirst({
      where: { id: equipmentId, tenantId: context.tenantId },
      select: { id: true },
    });
    if (!equipment) return fail("NOT_FOUND", "Fant ikke utstyret.");
    await prisma.equipmentRoutineLink.deleteMany({ where: { equipmentId, routineId } });
    revalidateEquipment(equipmentId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke fjerne rutinen") };
  }
}

export async function linkEquipmentRisk(equipmentId: string, riskId: string) {
  try {
    const context = await requireEquipmentAccess("write");
    const [equipment, risk] = await Promise.all([
      prisma.equipmentApproval.findFirst({
        where: { id: equipmentId, tenantId: context.tenantId },
        select: { id: true },
      }),
      prisma.risk.findFirst({
        where: { id: riskId, tenantId: context.tenantId },
        select: { id: true },
      }),
    ]);
    if (!equipment || !risk) return fail("NOT_FOUND", "Utstyr eller risiko finnes ikke.");
    await prisma.equipmentRiskLink.create({ data: { equipmentId, riskId } });
    revalidateEquipment(equipmentId);
    return { success: true as const };
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "P2002") return fail("DUPLICATE", "Risikoen er allerede knyttet til utstyret.");
    return { success: false as const, error: formatActionError(error, "Kunne ikke knytte risikoen") };
  }
}

export async function unlinkEquipmentRisk(equipmentId: string, riskId: string) {
  try {
    const context = await requireEquipmentAccess("write");
    const equipment = await prisma.equipmentApproval.findFirst({
      where: { id: equipmentId, tenantId: context.tenantId },
      select: { id: true },
    });
    if (!equipment) return fail("NOT_FOUND", "Fant ikke utstyret.");
    await prisma.equipmentRiskLink.deleteMany({ where: { equipmentId, riskId } });
    revalidateEquipment(equipmentId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke fjerne risikoen") };
  }
}
