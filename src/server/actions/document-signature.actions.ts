"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { DocumentSignerRole } from "@prisma/client";
import { requirePermission, requireResourceAccess } from "@/lib/server-authorization";

export async function getDocumentSignatures(documentId: string) {
  try {
    await requireResourceAccess("document", documentId);

    const signatures = await prisma.documentSignature.findMany({
      where: { documentId },
      include: {
        signedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { role: "asc" },
        { signedAt: "asc" },
      ],
    });

    return { success: true, data: signatures };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente signaturer" };
  }
}

export async function signDocument(input: {
  documentId: string;
  role: DocumentSignerRole;
  signatureImg: string;
  comment?: string;
}) {
  try {
    const context = await requirePermission("canReadDocuments");

    const document = await prisma.document.findUnique({
      where: { id: input.documentId },
    });

    if (!document) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    if (document.tenantId !== context.tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }

    if (input.role === "GODKJENT_AV") {
      const approveCtx = await requirePermission("canApproveDocuments");
      if (!approveCtx) {
        return { success: false, error: "Kun godkjenner-roller kan signere som godkjenner" };
      }
    }

    if (!input.signatureImg || !input.signatureImg.startsWith("data:image/")) {
      return { success: false, error: "Ugyldig signatur" };
    }

    const signature = await prisma.documentSignature.upsert({
      where: {
        documentId_signedById_role: {
          documentId: input.documentId,
          signedById: context.userId,
          role: input.role,
        },
      },
      update: {
        signatureImg: input.signatureImg,
        comment: input.comment ?? null,
        signedAt: new Date(),
      },
      create: {
        tenantId: context.tenantId,
        documentId: input.documentId,
        signedById: context.userId,
        role: input.role,
        signatureImg: input.signatureImg,
        comment: input.comment ?? null,
      },
      include: {
        signedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        action: "DOCUMENT_SIGNED",
        resource: `Document:${input.documentId}`,
        metadata: JSON.stringify({
          role: input.role,
          documentTitle: document.title,
        }),
      },
    });

    revalidatePath(`/dashboard/documents/${input.documentId}`);
    return { success: true, data: signature };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke signere dokument" };
  }
}

export async function removeDocumentSignature(signatureId: string) {
  try {
    const context = await requirePermission("canApproveDocuments");

    const signature = await prisma.documentSignature.findUnique({
      where: { id: signatureId },
    });

    if (!signature) {
      return { success: false, error: "Signatur ikke funnet" };
    }

    if (signature.tenantId !== context.tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }

    await prisma.documentSignature.delete({
      where: { id: signatureId },
    });

    revalidatePath(`/dashboard/documents/${signature.documentId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke fjerne signatur" };
  }
}
