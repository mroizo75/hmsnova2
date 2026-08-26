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
import { calculateNextReviewDate, parseDateInput } from "@/lib/document-utils";
import { convertDocumentToPDF } from "@/lib/adobe-pdf";
import { triggerRealtimeEvent } from "@/lib/pusher-server";

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

const sanitizeText = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseIntInput = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

async function assertTenantUser(tenantId: string, userId: string) {
  const member = await prisma.userTenant.findFirst({
    where: { tenantId, userId },
  });

  if (!member) {
    throw new Error("Ugyldig bruker for denne virksomheten");
  }
}

async function resolveTemplate(tenantId: string, templateId: string) {
  const template = await prisma.documentTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ tenantId }, { isGlobal: true }],
    },
  });

  if (!template) {
    throw new Error("Fant ikke valgt dokumentmal");
  }

  return template;
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

    const fileEntry = formData.get("file");
    const changeComment = formData.get("changeComment") as string | null;
    const visibleToRolesStr = formData.get("visibleToRoles") as string | null;
    const ownerIdRaw = (formData.get("ownerId") as string | null) || null;
    const templateIdRaw = (formData.get("templateId") as string | null) || null;
    const reviewIntervalRaw = formData.get("reviewIntervalMonths") as string | null;
    const reviewIntervalValue = parseIntInput(reviewIntervalRaw);
    const reviewIntervalProvided = typeof reviewIntervalValue === "number" && !Number.isNaN(reviewIntervalValue);
    const effectiveFromValue = parseDateInput(formData.get("effectiveFrom") as string | null);
    const effectiveToValue = parseDateInput(formData.get("effectiveTo") as string | null);
    const planSummary = sanitizeText(formData.get("planSummary") as string | null);
    const doSummary = sanitizeText(formData.get("doSummary") as string | null);
    const checkSummary = sanitizeText(formData.get("checkSummary") as string | null);
    const actSummary = sanitizeText(formData.get("actSummary") as string | null);
    const data = {
      tenantId: formData.get("tenantId") as string,
      kind: formData.get("kind") as string,
      title: formData.get("title") as string,
      version: formData.get("version") as string || "v1.0",
    };

    // Valider at fil er en Blob (File extends Blob)
    if (!fileEntry || typeof fileEntry === "string") {
      return { success: false, error: "Fil er påkrevd" };
    }

    const file = fileEntry as Blob & { name: string };
    const validated = createDocumentSchema.parse({
      ...data,
      ownerId: ownerIdRaw,
      templateId: templateIdRaw,
      reviewIntervalMonths: reviewIntervalValue,
      effectiveFrom: effectiveFromValue,
      effectiveTo: effectiveToValue,
      planSummary,
      doSummary,
      checkSummary,
      actSummary,
      file,
    });

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

    // Parse visibleToRoles
    let visibleToRoles: string[] | null = null;
    if (visibleToRolesStr) {
      try {
        visibleToRoles = JSON.parse(visibleToRolesStr);
      } catch (e) {
        console.error("Failed to parse visibleToRoles:", e);
      }
    }

    if (validated.ownerId) {
      try {
        await assertTenantUser(validated.tenantId, validated.ownerId);
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }

    let template: Awaited<ReturnType<typeof resolveTemplate>> | null = null;
    if (validated.templateId) {
      try {
        template = await resolveTemplate(validated.tenantId, validated.templateId);
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }

    const resolvedReviewInterval = reviewIntervalProvided
      ? validated.reviewIntervalMonths
      : template?.defaultReviewIntervalMonths || validated.reviewIntervalMonths;

    const resolvedEffectiveFrom = validated.effectiveFrom ?? new Date();
    const nextReviewDate = calculateNextReviewDate(resolvedEffectiveFrom, resolvedReviewInterval);

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
        mime: file.type || "application/octet-stream",
        updatedBy: context.userEmail,
        ownerId: validated.ownerId,
        templateId: validated.templateId,
        reviewIntervalMonths: resolvedReviewInterval,
        effectiveFrom: resolvedEffectiveFrom,
        effectiveTo: validated.effectiveTo,
        planSummary: validated.planSummary ?? null,
        doSummary: validated.doSummary ?? null,
        checkSummary: validated.checkSummary ?? null,
        actSummary: validated.actSummary ?? null,
        nextReviewDate,
        visibleToRoles: visibleToRoles || null,
        versions: {
          create: {
            tenantId: validated.tenantId,
            version: validated.version,
            fileKey,
            mime: file.type || "application/octet-stream",
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
        templateId: validated.templateId,
        ownerId: validated.ownerId,
        reviewIntervalMonths: resolvedReviewInterval,
      }
    );

    revalidatePath(`/dashboard/documents`);
    triggerRealtimeEvent(validated.tenantId, "document-updated");
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
    const fileEntry = formData.get("file");
    const version = formData.get("version") as string;
    const changeComment = formData.get("changeComment") as string;

    // Valider at fil er en Blob (File extends Blob)
    if (!fileEntry || typeof fileEntry === "string" || !version || !changeComment) {
      return { success: false, error: "Fil, versjon og endringskommentar er påkrevd" };
    }

    const file = fileEntry as Blob & { name: string };

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
        mime: file.type || "application/octet-stream",
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
        mime: file.type || "application/octet-stream",
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

    // Invalider PDF-visningscache (docx→pdf) slik at ny versjon vises
    const viewCacheKey = `${document.tenantId}/documents/pdf/${document.id}.pdf`;
    try {
      await storage.delete(viewCacheKey);
    } catch {
      // Ignorer hvis cache ikke finnes
    }

    revalidatePath(`/dashboard/documents`);
    revalidatePath(`/dashboard/documents/${documentId}`);
    triggerRealtimeEvent(document.tenantId, "document-updated");
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

    const hasField = (key: string) => Object.prototype.hasOwnProperty.call(input, key);
    const reviewIntervalProvided = hasField("reviewIntervalMonths");
    const payload = {
      ...input,
      reviewIntervalMonths: reviewIntervalProvided ? parseIntInput(input.reviewIntervalMonths) : undefined,
      effectiveFrom: hasField("effectiveFrom") ? parseDateInput(input.effectiveFrom as string | null) : undefined,
      effectiveTo: hasField("effectiveTo") ? parseDateInput(input.effectiveTo as string | null) : undefined,
      planSummary: hasField("planSummary") ? sanitizeText(input.planSummary) : undefined,
      doSummary: hasField("doSummary") ? sanitizeText(input.doSummary) : undefined,
      checkSummary: hasField("checkSummary") ? sanitizeText(input.checkSummary) : undefined,
      actSummary: hasField("actSummary") ? sanitizeText(input.actSummary) : undefined,
    };

    const validated = updateDocumentSchema.parse(payload);

    const document = await prisma.document.findUnique({
      where: { id: validated.id },
    });

    if (!document) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    if (document.isLockedByGroup) {
      return { success: false, error: "Dette dokumentet er styrt av konsernet og kan ikke redigeres lokalt" };
    }

    if (validated.ownerId) {
      try {
        await assertTenantUser(document.tenantId, validated.ownerId);
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }

    let template: Awaited<ReturnType<typeof resolveTemplate>> | null = null;
    const templateFieldProvided = hasField("templateId");
    if (validated.templateId) {
      try {
        template = await resolveTemplate(document.tenantId, validated.templateId);
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }

    const resolvedReviewInterval = (() => {
      if (reviewIntervalProvided && validated.reviewIntervalMonths) {
        return validated.reviewIntervalMonths;
      }
      if (templateFieldProvided && template) {
        return template.defaultReviewIntervalMonths;
      }
      return document.reviewIntervalMonths ?? 12;
    })();

    const resolvedEffectiveFrom = hasField("effectiveFrom")
      ? validated.effectiveFrom ?? null
      : document.effectiveFrom;

    const effectiveFromForCalc = resolvedEffectiveFrom ?? document.effectiveFrom ?? new Date();
    const nextReviewDate = calculateNextReviewDate(effectiveFromForCalc, resolvedReviewInterval);

    const updateData: any = {
      updatedBy: context.userEmail,
      updatedAt: new Date(),
    };

    if (validated.title) updateData.title = validated.title;
    if (validated.kind) updateData.kind = validated.kind;
    if (validated.version) updateData.version = validated.version;
    if (hasField("visibleToRoles")) {
      updateData.visibleToRoles =
        validated.visibleToRoles && validated.visibleToRoles.length > 0 ? validated.visibleToRoles : null;
    }
    if (hasField("ownerId")) {
      updateData.ownerId = validated.ownerId ?? null;
    }
    if (templateFieldProvided) {
      updateData.templateId = validated.templateId ?? null;
    }
    if (hasField("planSummary")) updateData.planSummary = validated.planSummary ?? null;
    if (hasField("doSummary")) updateData.doSummary = validated.doSummary ?? null;
    if (hasField("checkSummary")) updateData.checkSummary = validated.checkSummary ?? null;
    if (hasField("actSummary")) updateData.actSummary = validated.actSummary ?? null;
    if (hasField("effectiveFrom")) updateData.effectiveFrom = resolvedEffectiveFrom;
    if (hasField("effectiveTo")) updateData.effectiveTo = validated.effectiveTo ?? null;

    if (reviewIntervalProvided || templateFieldProvided || hasField("effectiveFrom")) {
      updateData.reviewIntervalMonths = resolvedReviewInterval;
      updateData.nextReviewDate = nextReviewDate;
    }

    const updated = await prisma.document.update({
      where: { id: validated.id },
      data: updateData,
    });

    await logAudit(
      updated.tenantId,
      context.userId,
      "DOCUMENT_UPDATED",
      `Document:${updated.id}`,
      {
        ...validated,
        reviewIntervalMonths: resolvedReviewInterval,
      }
    );

    revalidatePath(`/dashboard/documents`);
    revalidatePath(`/dashboard/documents/${validated.id}`);
    triggerRealtimeEvent(updated.tenantId, "document-updated");
    return { success: true, data: updated };
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

    const reviewIntervalMonths = document.reviewIntervalMonths ?? 12;
    const effectiveFrom = document.effectiveFrom ?? new Date();
    const nextReviewDate = calculateNextReviewDate(effectiveFrom, reviewIntervalMonths);

    // Oppdater dokument til APPROVED
    const approved = await prisma.document.update({
      where: { id: validated.id },
      data: {
        status: DocStatus.APPROVED,
        approvedBy: validated.approvedBy,
        approvedAt: new Date(),
        nextReviewDate,
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
    triggerRealtimeEvent(document.tenantId, "document-updated");
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
      return { success: false, error: "Lover og regler kan ikke slettes" };
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

    // Slett PDF-visningscache (docx→pdf) hvis den finnes
    const viewCacheKey = `${document.tenantId}/documents/pdf/${document.id}.pdf`;
    try {
      await storage.delete(viewCacheKey);
    } catch {
      // Ignorer
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
    triggerRealtimeEvent(document.tenantId, "document-updated");
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

export async function convertDocumentToPDFAction(id: string) {
  try {
    const context = await requireResourceAccess("document", id);

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    const isWordDocument = 
      document.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      document.mime === "application/msword";

    if (!isWordDocument) {
      return { success: false, error: "Kun Word-dokumenter kan konverteres til PDF" };
    }

    const storage = getStorage();
    const documentBuffer = await storage.get(document.fileKey);

    if (!documentBuffer) {
      return { success: false, error: "Kunne ikke laste dokument" };
    }

    const pdfBuffer = await convertDocumentToPDF(documentBuffer, document.mime);

    const pdfKey = generateFileKey(
      context.tenantId,
      "documents/pdf",
      `${document.title}-converted.pdf`
    );

    await storage.upload(pdfKey, pdfBuffer, { "Content-Type": "application/pdf" });

    const pdfUrl = await storage.getUrl(pdfKey, 3600);

    return { success: true, data: { url: pdfUrl, filename: `${document.title}.pdf` } };
  } catch (error: any) {
    console.error("Convert to PDF error:", error);
    return { success: false, error: error.message || "Kunne ikke konvertere til PDF" };
  }
}
