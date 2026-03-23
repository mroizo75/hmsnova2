"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";
import { requirePermission, getAuthContext } from "@/lib/server-authorization";
import { validateElectroUploadFile } from "@/lib/electro-upload";

export async function getElectroForDashboard() {
  try {
    const context = await requirePermission("canReadDocuments");
    const compliance = await prisma.electroComplianceDeclaration.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });
    return { success: true as const, data: { compliance } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke hente elektro-dokumenter";
    return { success: false as const, error: message };
  }
}

export async function getElectroForEmployee() {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false as const, error: "Ikke innlogget" };
    }
    const compliance = await prisma.electroComplianceDeclaration.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        fileKey: true,
        mime: true,
        originalFileName: true,
        contractorName: true,
        workCompletedAt: true,
        notes: true,
        createdAt: true,
      },
    });
    return { success: true as const, data: { compliance } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke hente elektro-dokumenter";
    return { success: false as const, error: message };
  }
}

function sanitizeTitle(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) {
    throw new Error("Tittel er påkrevd");
  }
  if (t.length > 200) {
    throw new Error("Tittel er for lang (maks 200 tegn)");
  }
  return t;
}

function sanitizeOptionalText(raw: string | null | undefined, max: number): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (t.length > max) {
    throw new Error(`Tekst er for lang (maks ${max} tegn)`);
  }
  return t;
}

function parseWorkDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Ugyldig dato for utført arbeid");
  }
  return d;
}

export async function createElectroComplianceDeclaration(formData: FormData) {
  try {
    const context = await requirePermission("canCreateDocuments");
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false as const, error: { code: "MISSING_FILE", message: "Velg en fil." } };
    }
    const err = validateElectroUploadFile(file);
    if (err) {
      return { success: false as const, error: err };
    }
    const title = sanitizeTitle(String(formData.get("title") ?? ""));
    const rawCategory = String(formData.get("category") ?? "ELEKTRO").trim();
    const ALLOWED_CATEGORIES = new Set(["ELEKTRO", "RORLEGGER", "VENTILASJON", "BRANN", "ANNET"]);
    const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : "ELEKTRO";
    const contractorName = sanitizeOptionalText(String(formData.get("contractorName") ?? ""), 200);
    const notes = sanitizeOptionalText(String(formData.get("notes") ?? ""), 4000);
    const workCompletedAt = parseWorkDate(String(formData.get("workCompletedAt") ?? ""));

    const storage = getStorage();
    const fileKey = generateFileKey(context.tenantId, "electro/compliance", file.name);
    await storage.upload(fileKey, file);

    await prisma.electroComplianceDeclaration.create({
      data: {
        tenantId: context.tenantId,
        title,
        category,
        fileKey,
        mime: file.type || "application/octet-stream",
        originalFileName: file.name,
        contractorName,
        workCompletedAt,
        notes,
        createdById: context.userId,
      },
    });

    revalidatePath("/dashboard/samsvarserklaringer");
    revalidatePath("/ansatt/samsvarserklaringer");
    revalidatePath("/ansatt");
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke lagre samsvarserklæring";
    return { success: false as const, error: { code: "CREATE_FAILED", message } };
  }
}

export async function deleteElectroComplianceDeclaration(id: string) {
  try {
    const context = await requirePermission("canReadDocuments");
    const row = await prisma.electroComplianceDeclaration.findFirst({
      where: { id, tenantId: context.tenantId },
    });
    if (!row) {
      return { success: false as const, error: { code: "NOT_FOUND", message: "Fant ikke dokumentet." } };
    }
    const mayDelete =
      context.permissions.canDeleteDocuments ||
      (context.permissions.canCreateDocuments && row.createdById === context.userId);
    if (!mayDelete) {
      return {
        success: false as const,
        error: { code: "FORBIDDEN", message: "Du har ikke tilgang til å slette dette dokumentet." },
      };
    }
    await prisma.electroComplianceDeclaration.delete({ where: { id: row.id } });
    try {
      const storage = getStorage();
      await storage.delete(row.fileKey);
    } catch {
      // Fil kan allerede være slettet – behold DB-konsistens
    }
    revalidatePath("/dashboard/samsvarserklaringer");
    revalidatePath("/ansatt/samsvarserklaringer");
    revalidatePath("/ansatt");
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke slette";
    return { success: false as const, error: { code: "DELETE_FAILED", message } };
  }
}
