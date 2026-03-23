"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";
import { requirePermission, getAuthContext } from "@/lib/server-authorization";
import { validateElectroUploadFile } from "@/lib/electro-upload";

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

export async function listRoutineUploadedDocumentsForDashboard() {
  try {
    const context = await requirePermission("canReadDocuments");
    const rows = await prisma.routineUploadedDocument.findMany({
      where: { tenantId: context.tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });
    return { success: true as const, data: rows };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke hente opplastede rutiner";
    return { success: false as const, error: message };
  }
}

export async function listRoutineUploadedDocumentsForEmployee() {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false as const, error: "Ikke innlogget" };
    }
    if (!context.permissions.canReadDocuments) {
      return { success: false as const, error: "Ingen tilgang" };
    }
    const rows = await prisma.routineUploadedDocument.findMany({
      where: { tenantId: context.tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        documentType: true,
        fileKey: true,
        mime: true,
        originalFileName: true,
        createdAt: true,
      },
    });
    return { success: true as const, data: rows };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke hente opplastede rutiner";
    return { success: false as const, error: message };
  }
}

export async function createRoutineUploadedDocument(formData: FormData) {
  try {
    const context = await requirePermission("canCreateRoutines");
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false as const, error: { code: "MISSING_FILE", message: "Velg en fil." } };
    }
    const valErr = validateElectroUploadFile(file);
    if (valErr) {
      return { success: false as const, error: valErr };
    }
    const title = sanitizeTitle(String(formData.get("title") ?? ""));
    const description = sanitizeOptionalText(String(formData.get("description") ?? ""), 4000);
    const rawType = String(formData.get("documentType") ?? "RUTINE").trim();
    const documentType = rawType === "INSTRUKS" ? "INSTRUKS" : "RUTINE";

    const last = await prisma.routineUploadedDocument.findFirst({
      where: { tenantId: context.tenantId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? 0) + 1;

    const storage = getStorage();
    const fileKey = generateFileKey(context.tenantId, "routines/uploads", file.name);
    await storage.upload(fileKey, file);

    await prisma.routineUploadedDocument.create({
      data: {
        tenantId: context.tenantId,
        title,
        description,
        documentType,
        fileKey,
        mime: file.type || "application/octet-stream",
        originalFileName: file.name,
        sortOrder,
        createdById: context.userId,
      },
    });

    revalidatePath("/dashboard/rutiner");
    revalidatePath("/ansatt/rutiner");
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke lagre dokumentet";
    return { success: false as const, error: { code: "CREATE_FAILED", message } };
  }
}

export async function deleteRoutineUploadedDocument(id: string) {
  try {
    const context = await requirePermission("canReadRoutines");
    const row = await prisma.routineUploadedDocument.findFirst({
      where: { id, tenantId: context.tenantId },
    });
    if (!row) {
      return { success: false as const, error: { code: "NOT_FOUND", message: "Fant ikke dokumentet." } };
    }
    const mayDelete =
      context.permissions.canManageRoutines ||
      (context.permissions.canCreateRoutines && row.createdById === context.userId);
    if (!mayDelete) {
      return {
        success: false as const,
        error: { code: "FORBIDDEN", message: "Du har ikke tilgang til å slette dette dokumentet." },
      };
    }
    await prisma.routineUploadedDocument.delete({ where: { id: row.id } });
    try {
      const storage = getStorage();
      await storage.delete(row.fileKey);
    } catch {
      // ignore
    }
    revalidatePath("/dashboard/rutiner");
    revalidatePath("/ansatt/rutiner");
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke slette";
    return { success: false as const, error: { code: "DELETE_FAILED", message } };
  }
}
