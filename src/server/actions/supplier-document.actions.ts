"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/server-authorization";
import { generateFileKey, getStorage } from "@/lib/storage";
import {
  SUPPLIER_DOCUMENT_KINDS,
  SUPPLIER_DOCUMENT_MAX_BYTES,
  SUPPLIER_DOCUMENT_MIME_TYPES,
} from "@/lib/supplier-management";

const documentSchema = z.object({
  title: z.string().trim().min(2, "Skriv et navn på dokumentet").max(200),
  kind: z.enum(SUPPLIER_DOCUMENT_KINDS),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
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

export async function addSupplierDocument(supplierId: string, formData: FormData) {
  try {
    const context = await requirePermission("canCreateAudits");
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId: context.tenantId },
      select: { id: true },
    });
    if (!supplier) return { success: false as const, error: "Leverandør ikke funnet" };

    const parsed = documentSchema.parse({
      title: formData.get("title"),
      kind: formData.get("kind"),
      reference: formData.get("reference") ?? "",
      expiresAt: formData.get("expiresAt") ?? "",
      notes: formData.get("notes") ?? "",
    });

    const file = formData.get("file");
    let fileKey: string | null = null;
    let fileName: string | null = null;
    let mimeType: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > SUPPLIER_DOCUMENT_MAX_BYTES) {
        return { success: false as const, error: "Filen kan være maks 10 MB." };
      }
      if (!SUPPLIER_DOCUMENT_MIME_TYPES.includes(file.type as (typeof SUPPLIER_DOCUMENT_MIME_TYPES)[number])) {
        return { success: false as const, error: "Last opp PDF eller bilde." };
      }
      fileKey = generateFileKey(context.tenantId, "suppliers", file.name);
      fileName = file.name;
      mimeType = file.type;
      await getStorage().upload(fileKey, file);
    }

    await prisma.supplierDocument.create({
      data: {
        tenantId: context.tenantId,
        supplierId: supplier.id,
        title: parsed.title,
        kind: parsed.kind,
        reference: parsed.reference?.trim() || null,
        expiresAt: parseDate(parsed.expiresAt),
        fileKey,
        fileName,
        mimeType,
        notes: parsed.notes?.trim() || null,
        createdById: context.userId,
      },
    });
    revalidatePath(`/dashboard/leverandorer/${supplierId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre dokumentet") };
  }
}

export async function deleteSupplierDocument(documentId: string) {
  try {
    const context = await requirePermission("canCreateAudits");
    const document = await prisma.supplierDocument.findFirst({
      where: { id: documentId, tenantId: context.tenantId },
      select: { id: true, supplierId: true, fileKey: true },
    });
    if (!document) return { success: false as const, error: "Dokumentet finnes ikke" };
    await prisma.supplierDocument.delete({ where: { id: document.id } });
    if (document.fileKey) {
      await getStorage().delete(document.fileKey).catch(() => {});
    }
    revalidatePath(`/dashboard/leverandorer/${document.supplierId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke slette dokumentet") };
  }
}
