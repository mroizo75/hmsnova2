"use server";

/**
 * Server actions for personalarkiv.
 * Hjemmel: GDPR art. 5, 6, 15 og 17. AML § 14-5/14-6.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { getStorage } from "@/lib/storage";
import {
  DeletePersonnelDocumentSchema,
  UpdatePersonnelDocumentSchema,
  type DeletePersonnelDocumentInput,
  type UpdatePersonnelDocumentInput,
} from "@/features/personnel/schemas/personnel.schema";

function revalidatePersonnel(userId: string) {
  revalidatePath("/dashboard/personalarkiv");
  revalidatePath(`/dashboard/personalarkiv/${userId}`);
  revalidatePath("/ansatt/personalmappe");
}

export async function updatePersonnelDocument(input: UpdatePersonnelDocumentInput) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canUploadPersonnelFile) {
      return { success: false as const, error: "Du har ikke tilgang til å endre personalmapper" };
    }

    const validated = UpdatePersonnelDocumentSchema.parse(input);

    const existing = await prisma.personnelDocument.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!existing) {
      return { success: false as const, error: "Dokumentet ble ikke funnet" };
    }

    await prisma.personnelDocument.update({
      where: { id: existing.id },
      data: {
        title: validated.title ?? existing.title,
        notes: validated.notes ?? existing.notes,
        retainUntil:
          validated.retainUntil === undefined
            ? existing.retainUntil
            : validated.retainUntil
              ? new Date(validated.retainUntil)
              : null,
      },
    });

    revalidatePersonnel(existing.userId);
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke oppdatere dokument";
    return { success: false as const, error: message };
  }
}

export async function deletePersonnelDocument(input: DeletePersonnelDocumentInput) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canDeletePersonnelFile) {
      return { success: false as const, error: "Du har ikke tilgang til å slette personalmapper" };
    }

    const validated = DeletePersonnelDocumentSchema.parse(input);

    const existing = await prisma.personnelDocument.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!existing) {
      return { success: false as const, error: "Dokumentet ble ikke funnet" };
    }

    const storage = getStorage();
    await storage.delete(existing.fileKey);

    await prisma.personnelDocument.delete({
      where: { id: existing.id },
    });

    revalidatePersonnel(existing.userId);
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke slette dokument";
    return { success: false as const, error: message };
  }
}
