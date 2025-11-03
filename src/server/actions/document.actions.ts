"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createDocumentSchema,
  updateDocumentSchema,
  approveDocumentSchema,
} from "@/features/documents/schemas/document.schema";
import { getStorage, generateFileKey } from "@/lib/storage";
import { DocStatus } from "@prisma/client";
import { requirePermission, requireResourceAccess } from "@/lib/server-authorization";

// Helper: Logg til audit log
async function logAudit(
  tenantId: string,
  userId: string,
  action: string,
  resource: string,
  metadata?: any
) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action,
      resource,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function getDocuments(tenantId: string) {
  try {
    // Sjekk tilgang
    const context = await requirePermission("canReadDocuments");

    const documents = await prisma.document.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 5, // Siste 5 versjoner
        },
      },
    });

    return { success: true, data: documents };
  } catch (error: any) {
    console.error("Get documents error:", error);
    return { success: false, error: error.message || "Kunne ikke hente dokumenter" };
  }
}

export async function getDocument(id: string) {
  try {
    // Sjekk tilgang til ressursen
    const context = await requireResourceAccess("document", id);

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
        versions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!document) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    return { success: true, data: document };
  } catch (error: any) {
    console.error("Get document error:", error);
    return { success: false, error: error.message || "Kunne ikke hente dokument" };
  }
}

export async function createDocument(formData: FormData) {
  try {
    // Sjekk tilgang
    const context = await requirePermission("canCreateDocuments");

    const file = formData.get("file") as File | null;
    const changeComment = formData.get("changeComment") as string | null;
    const data = {
      tenantId: formData.get("tenantId") as string,
      kind: formData.get("kind") as string,
      title: formData.get("title") as string,
      version: formData.get("version") as string || "v1.0",
    };

    const validated = createDocumentSchema.parse({ ...data, file: file || undefined });

    if (!file) {
      return { success: false, error: "Fil er påkrevd" };
    }

    // Generer slug fra tittel
    const baseSlug = validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // VIKTIG: Sjekk om dokument med samme slug allerede eksisterer
    const existingBySlug = await prisma.document.findUnique({
      where: {
        tenantId_slug: {
          tenantId: validated.tenantId,
          slug: baseSlug,
        },
      },
    });

    if (existingBySlug) {
      // Dokument eksisterer - dette er en ny versjon!
      return { 
        success: false, 
        error: `Dokument "${validated.title}" eksisterer allerede. Bruk "Last opp ny versjon" i stedet.`,
        existingDocumentId: existingBySlug.id,
      };
    }

    // Last opp fil
    const storage = getStorage();
    const fileKey = generateFileKey(validated.tenantId, "documents", file.name);
    await storage.upload(fileKey, file);

    // Opprett nytt dokument med første versjon
    const document = await prisma.document.create({
      data: {
        tenantId: validated.tenantId,
        kind: validated.kind,
        title: validated.title,
        slug: baseSlug,
        version: validated.version,
        status: DocStatus.DRAFT, // ALLTID DRAFT først - MÅ godkjennes
        fileKey,
        updatedBy: context.userEmail,
        nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 år
        versions: {
          create: {
            tenantId: validated.tenantId,
            version: validated.version,
            fileKey,
            uploadedBy: context.userEmail,
            changeComment: changeComment || "Første versjon opprettet",
          },
        },
      },
      include: {
        versions: true,
      },
    });

    // Audit log
    await logAudit(
      validated.tenantId,
      context.userId,
      "DOCUMENT_CREATED",
      `Document:${document.id}`,
      {
        title: validated.title,
        version: validated.version,
        kind: validated.kind,
      }
    );

    revalidatePath(`/dashboard/documents`);
    return { success: true, data: document };
  } catch (error: any) {
    console.error("Create document error:", error);
    return { success: false, error: "Kunne ikke opprette dokument" };
  }
}

export async function uploadNewVersion(formData: FormData) {
  try {
    // Sjekk tilgang
    const context = await requirePermission("canCreateDocuments");

    const documentId = formData.get("documentId") as string;
    const file = formData.get("file") as File | null;
    const version = formData.get("version") as string;
    const changeComment = formData.get("changeComment") as string;

    if (!file || !version || !changeComment) {
      return { success: false, error: "Fil, versjon og endringskommentar er påkrevd" };
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { versions: true },
    });

    if (!document) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    // Sjekk om versjon allerede eksisterer
    const versionExists = document.versions.some((v) => v.version === version);
    if (versionExists) {
      return { 
        success: false, 
        error: `Versjon ${version} eksisterer allerede. Bruk et nytt versjonsnummer.` 
      };
    }

    // Last opp ny fil
    const storage = getStorage();
    const fileKey = generateFileKey(document.tenantId, "documents", file.name);
    await storage.upload(fileKey, file);

    // Marker forrige versjon som "superseded"
    await prisma.documentVersion.updateMany({
      where: {
        documentId: document.id,
        supersededAt: null,
      },
      data: {
        supersededAt: new Date(),
      },
    });

    // Opprett ny versjon
    const newVersion = await prisma.documentVersion.create({
      data: {
        tenantId: document.tenantId,
        documentId: document.id,
        version,
        fileKey,
        uploadedBy: context.userEmail,
        changeComment,
      },
    });

    // Oppdater hovedDokument til DRAFT (må godkjennes på nytt)
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        version,
        fileKey,
        status: DocStatus.DRAFT, // Tilbake til DRAFT - må godkjennes
        approvedBy: null,
        approvedAt: null,
        updatedBy: context.userEmail,
      },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Audit log
    await logAudit(
      document.tenantId,
      context.userId,
      "DOCUMENT_VERSION_UPLOADED",
      `Document:${document.id}`,
      {
        version,
        changeComment,
        previousVersion: document.version,
      }
    );

    revalidatePath(`/dashboard/documents`);
    revalidatePath(`/dashboard/documents/${documentId}`);
    return { success: true, data: updatedDocument };
  } catch (error: any) {
    console.error("Upload new version error:", error);
    return { success: false, error: error.message || "Kunne ikke laste opp ny versjon" };
  }
}

export async function updateDocument(input: any) {
  try {
    // Sjekk tilgang
    const context = await requirePermission("canCreateDocuments");

    const validated = updateDocumentSchema.parse(input);

    const document = await prisma.document.update({
      where: { id: validated.id },
      data: {
        ...validated,
        updatedBy: context.userEmail,
        updatedAt: new Date(),
      },
    });

    await logAudit(
      document.tenantId,
      context.userId,
      "DOCUMENT_UPDATED",
      `Document:${document.id}`,
      validated
    );

    revalidatePath(`/dashboard/documents`);
    revalidatePath(`/dashboard/documents/${validated.id}`);
    return { success: true, data: document };
  } catch (error: any) {
    console.error("Update document error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere dokument" };
  }
}

export async function approveDocument(input: any) {
  try {
    // Sjekk tilgang til å godkjenne
    const context = await requirePermission("canApproveDocuments");

    const validated = approveDocumentSchema.parse(input);

    const document = await prisma.document.findUnique({
      where: { id: validated.id },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!document) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    // Oppdater dokument til APPROVED
    const approved = await prisma.document.update({
      where: { id: validated.id },
      data: {
        status: DocStatus.APPROVED,
        approvedBy: validated.approvedBy,
        approvedAt: new Date(),
        nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 år fra nå
      },
    });

    // Godkjenn også siste versjon
    if (document.versions.length > 0) {
      await prisma.documentVersion.update({
        where: { id: document.versions[0].id },
        data: {
          approvedBy: validated.approvedBy,
          approvedAt: new Date(),
        },
      });
    }

    await logAudit(
      document.tenantId,
      context.userId,
      "DOCUMENT_APPROVED",
      `Document:${document.id}`,
      {
        version: document.version,
        approvedBy: validated.approvedBy,
      }
    );

    revalidatePath(`/dashboard/documents`);
    revalidatePath(`/dashboard/documents/${validated.id}`);
    return { success: true, data: approved };
  } catch (error: any) {
    console.error("Approve document error:", error);
    return { success: false, error: error.message || "Kunne ikke godkjenne dokument" };
  }
}

export async function deleteDocument(id: string) {
  try {
    // Sjekk tilgang til å slette
    const context = await requirePermission("canDeleteDocuments");

    const document = await prisma.document.findUnique({
      where: { id },
      include: { versions: true },
    });

    if (!document) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    // Sjekk om det er et lovdokument (kan ikke slettes)
    if (document.kind === "LAW") {
      return { success: false, error: "Lovdokumenter kan ikke slettes" };
    }

    const storage = getStorage();

    // Slett alle versjonsfiler
    for (const version of document.versions) {
      try {
        await storage.delete(version.fileKey);
      } catch (error) {
        console.error(`Failed to delete file ${version.fileKey}:`, error);
      }
    }

    // Slett gjeldende fil (hvis forskjellig)
    try {
      await storage.delete(document.fileKey);
    } catch (error) {
      console.error(`Failed to delete file ${document.fileKey}:`, error);
    }

    await logAudit(
      document.tenantId,
      context.userId,
      "DOCUMENT_DELETED",
      `Document:${document.id}`,
      {
        title: document.title,
        version: document.version,
      }
    );

    // Slett fra database (cascade sletter versjoner)
    await prisma.document.delete({
      where: { id },
    });

    revalidatePath(`/dashboard/documents`);
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Delete document error:", error);
    return { success: false, error: error.message || "Kunne ikke slette dokument" };
  }
}

export async function getDocumentDownloadUrl(id: string) {
  try {
    // Sjekk tilgang
    const context = await requireResourceAccess("document", id);

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    const storage = getStorage();
    const url = await storage.getUrl(document.fileKey, 3600); // 1 time

    return { success: true, data: { url } };
  } catch (error: any) {
    console.error("Get download URL error:", error);
    return { success: false, error: error.message || "Kunne ikke generere nedlastingslenke" };
  }
}
