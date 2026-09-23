"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGlobalRoutineTemplateLibrary } from "@/lib/routine-template-library";
import { getGlobalFormTemplateLibrary } from "@/lib/form-template-library";
import { BOARDING_TEMPLATE_LIBRARY } from "@/lib/boarding-template-library";
import { getHrDocumentTemplateLibrary } from "@/lib/hr-document-template-library";
import { toIndustryScopeJson } from "@/lib/industry-scope";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/server-authorization";
import type { Prisma } from "@prisma/client";
import { DocStatus } from "@prisma/client";
import { ZodError } from "zod";
import { isBcmTemplateCategory } from "@/lib/bcm-audit";
import { isHrDocumentCategory, isModuleOwnedDocumentCategory } from "@/lib/document-module-scope";
import { calculateNextReviewDate } from "@/lib/document-utils";
import { generateDocumentPdf } from "@/lib/pdf-brand";
import { getStorage, generateFileKey } from "@/lib/storage";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import {
  buildDocumentTemplatePdfSections,
  documentKindFromTemplateCategory,
  nextCopyName,
  parsePdcaGuidance,
  slugifyDocumentTitle,
} from "@/lib/template-copy";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((e) => e.message).join(". ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

const SYSTEM_HR_LIBRARY_CREATED_BY = "SYSTEM_HR_DOCUMENT_LIBRARY";

async function requirePrivilegedAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true, isSupport: true },
  });
  return !!user && (user.isSuperAdmin || user.isSupport);
}

export async function getTemplateLibraryHubStatus() {
  const hasAccess = await requirePrivilegedAccess();
  if (!hasAccess) return { success: false as const, error: "Ingen tilgang" };

  const [
    routineCount,
    formCount,
    documentCount,
    handbookCount,
    legalRefCount,
  ] = await Promise.all([
    prisma.routineTemplate.count({ where: { tenantId: null, isGlobal: true } }),
    prisma.formTemplate.count({ where: { tenantId: null, isGlobal: true } }),
    prisma.documentTemplate.count({ where: { tenantId: null, isGlobal: true } }),
    prisma.handbookTemplate.count({ where: { isActive: true } }),
    prisma.legalReference.count(),
  ]);

  const routineLibSize = getGlobalRoutineTemplateLibrary().length;
  const formLibSize = getGlobalFormTemplateLibrary().length;
  const hrLibSize = getHrDocumentTemplateLibrary().length;
  const boardingLibSize = BOARDING_TEMPLATE_LIBRARY.reduce((sum, t) => sum + t.tasks.length, 0);

  return {
    success: true as const,
    data: {
      routines: { inDb: routineCount, inLib: routineLibSize },
      forms: { inDb: formCount, inLib: formLibSize },
      documents: { inDb: documentCount, hrInLib: hrLibSize },
      handbook: { inDb: handbookCount },
      boarding: { tasksInLib: boardingLibSize },
      legalReferences: { inDb: legalRefCount },
    },
  };
}

export async function seedHrDocumentTemplates() {
  const hasAccess = await requirePrivilegedAccess();
  if (!hasAccess) return { success: false as const, error: "Ingen tilgang" };

  const library = getHrDocumentTemplateLibrary();
  let created = 0;
  let updated = 0;

  for (const entry of library) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { tenantId: null, isGlobal: true, name: entry.name },
      select: { id: true },
    });

    const data = {
      name: entry.name,
      category: entry.category,
      description: entry.description,
      bodyHtml: entry.bodyHtml,
      variables: entry.variables as Prisma.InputJsonValue,
      industryScope: toIndustryScopeJson(entry.industryScope),
      defaultReviewIntervalMonths: entry.defaultReviewIntervalMonths,
      isGlobal: true,
    };

    if (existing) {
      await prisma.documentTemplate.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.documentTemplate.create({ data });
      created++;
    }
  }

  revalidatePath("/admin/malbibliotek");
  return { success: true as const, data: { created, updated, total: library.length } };
}

export async function fetchGlobalTemplatesForTenant() {
  const context = await requirePermission("canReadDocuments");

  const tenant = await prisma.tenant.findUnique({
    where: { id: context.tenantId },
    select: { industry: true },
  });
  const industry = tenant?.industry?.toLowerCase() ?? "other";

  const [routines, forms, documents] = await Promise.all([
    prisma.routineTemplate.findMany({
      where: { tenantId: null, isGlobal: true, isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        industryScope: true,
        legalReference: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.formTemplate.findMany({
      where: { tenantId: null, isGlobal: true, isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        industryScope: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.documentTemplate.findMany({
      where: { tenantId: null, isGlobal: true },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        industryScope: true,
        bodyHtml: true,
        variables: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    success: true as const,
    data: { routines, forms, documents, tenantIndustry: industry },
  };
}

export async function copyDocumentTemplateToTenant(templateId: string) {
  try {
    const context = await requirePermission("canCreateDocuments");

    const template = await prisma.documentTemplate.findFirst({
      where: { id: templateId, isGlobal: true },
    });

    if (!template) return { success: false as const, error: "Mal ikke funnet" };

    if (isBcmTemplateCategory(template.category)) {
      return {
        success: false as const,
        error: "Beredskapsmaler aktiveres under Beredskap, ikke i Dokumenter.",
      };
    }

    if (isHrDocumentCategory(template.category)) {
      const existing = await prisma.documentTemplate.findFirst({
        where: { tenantId: context.tenantId, isGlobal: false, name: template.name },
        select: { id: true, name: true },
      });

      const copy =
        existing ??
        (await prisma.documentTemplate.create({
          data: {
            tenantId: context.tenantId,
            name: template.name,
            category: template.category,
            description: template.description,
            bodyHtml: template.bodyHtml,
            variables: template.variables ?? undefined,
            industryScope: template.industryScope ?? undefined,
            pdcaGuidance: template.pdcaGuidance ?? undefined,
            defaultReviewIntervalMonths: template.defaultReviewIntervalMonths,
            isGlobal: false,
          },
          select: { id: true, name: true },
        }));

      revalidatePath("/dashboard/maler");
      revalidatePath("/dashboard/personalarkiv");
      revalidatePath("/dashboard/hr");
      return {
        success: true as const,
        data: { id: copy.id, name: copy.name, href: "/dashboard/personalarkiv" },
      };
    }

    if (isModuleOwnedDocumentCategory(template.category)) {
      return {
        success: false as const,
        error: "Denne malen hører hjemme i en egen modul, ikke i Dokumenter.",
      };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: context.tenantId },
      select: { name: true, orgNumber: true, address: true, logoUrl: true },
    });

    const existingCount = await prisma.document.count({
      where: { tenantId: context.tenantId, title: { contains: template.name } },
    });
    const title = nextCopyName(template.name, existingCount);

    const baseSlug = slugifyDocumentTitle(title);
    let slug = baseSlug;
    for (let n = 2; n < 50; n++) {
      const clash = await prisma.document.findUnique({
        where: { tenantId_slug: { tenantId: context.tenantId, slug } },
        select: { id: true },
      });
      if (!clash) break;
      slug = `${baseSlug}-${n}`;
    }

    const pdca = parsePdcaGuidance(template.pdcaGuidance);
    const reviewInterval = template.defaultReviewIntervalMonths || 12;
    const effectiveFrom = new Date();
    const pdfBuffer = await generateDocumentPdf({
      title,
      subtitle: template.description ?? undefined,
      reportLabel: "Dokumentmal",
      tenant: {
        name: tenant?.name ?? "Bedrift",
        orgNumber: tenant?.orgNumber,
        address: tenant?.address,
        logoUrl: tenant?.logoUrl,
      },
      generatedBy: context.userEmail,
      sections: buildDocumentTemplatePdfSections({
        description: template.description,
        bodyHtml: template.bodyHtml,
        pdcaGuidance: template.pdcaGuidance,
      }),
    });

    const storage = getStorage();
    const fileKey = generateFileKey(context.tenantId, "documents", `${baseSlug}.pdf`);
    await storage.upload(fileKey, new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }));

    const document = await prisma.document.create({
      data: {
        tenantId: context.tenantId,
        kind: documentKindFromTemplateCategory(template.category),
        title,
        slug,
        version: "v1.0",
        status: DocStatus.DRAFT,
        fileKey,
        mime: "application/pdf",
        createdBy: context.userEmail,
        updatedBy: context.userEmail,
        templateId: template.id,
        reviewIntervalMonths: reviewInterval,
        effectiveFrom,
        nextReviewDate: calculateNextReviewDate(effectiveFrom, reviewInterval),
        planSummary: pdca.plan ?? null,
        doSummary: pdca.do ?? null,
        checkSummary: pdca.check ?? null,
        actSummary: pdca.act ?? null,
        versions: {
          create: {
            tenantId: context.tenantId,
            version: "v1.0",
            fileKey,
            mime: "application/pdf",
            uploadedBy: context.userEmail,
            uploadedById: context.userId,
            changeComment: `Opprettet fra mal: ${template.name}`,
          },
        },
      },
    });

    revalidatePath("/dashboard/maler");
    revalidatePath("/dashboard/documents");
    triggerRealtimeEvent(context.tenantId, "document-updated");
    return {
      success: true as const,
      data: { id: document.id, name: document.title, href: `/dashboard/documents/${document.id}` },
    };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: formatActionError(error, "Kunne ikke hente dokumentmalen"),
    };
  }
}
