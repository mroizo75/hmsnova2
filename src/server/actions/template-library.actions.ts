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
import { isModuleOwnedDocumentCategory } from "@/lib/document-module-scope";

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
  const context = await requirePermission("canCreateDocuments");

  const template = await prisma.documentTemplate.findFirst({
    where: { id: templateId, isGlobal: true },
  });

  if (!template) return { success: false as const, error: "Mal ikke funnet" };

  if (isModuleOwnedDocumentCategory(template.category)) {
    return {
      success: false as const,
      error: "Beredskapsmaler aktiveres under Beredskap, ikke i Dokumenter.",
    };
  }

  const existingCount = await prisma.documentTemplate.count({
    where: { tenantId: context.tenantId, name: { contains: template.name } },
  });

  const name = existingCount === 0 ? template.name : `${template.name} (${existingCount + 1})`;

  const copy = await prisma.documentTemplate.create({
    data: {
      tenantId: context.tenantId,
      name,
      category: template.category,
      description: template.description,
      bodyHtml: template.bodyHtml,
      variables: template.variables ?? undefined,
      industryScope: template.industryScope ?? undefined,
      pdcaGuidance: template.pdcaGuidance ?? undefined,
      defaultReviewIntervalMonths: template.defaultReviewIntervalMonths,
      isGlobal: false,
    },
  });

  revalidatePath("/dashboard/maler");
  revalidatePath("/dashboard/documents");
  return { success: true as const, data: { id: copy.id, name: copy.name } };
}
