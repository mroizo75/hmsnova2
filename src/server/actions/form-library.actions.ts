"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getGlobalFormTemplateLibrary,
  type FormTemplateLibraryEntry,
} from "@/lib/form-template-library";
import { toIndustryScopeJson, parseIndustryScope } from "@/lib/industry-scope";

const SYSTEM_LIBRARY_CREATED_BY = "SYSTEM_FORM_LIBRARY";
const INDUSTRY_KEYS = [
  "all",
  "construction",
  "healthcare",
  "transport",
  "manufacturing",
  "retail",
  "hospitality",
  "education",
  "technology",
  "agriculture",
  "other",
] as const;

type IndustryKey = (typeof INDUSTRY_KEYS)[number];

async function requirePrivilegedAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true, isSupport: true },
  });
  return !!user && (user.isSuperAdmin || user.isSupport);
}

export async function seedGlobalFormTemplateLibrary() {
  const library = getGlobalFormTemplateLibrary();
  let created = 0;
  let updated = 0;

  for (const entry of library) {
    const existing = await prisma.formTemplate.findFirst({
      where: { tenantId: null, isGlobal: true, title: entry.title },
      select: { id: true },
    });

    const fieldData = entry.fields.map((f, i) => ({
      fieldType: f.fieldType,
      label: f.label,
      helpText: f.helpText ?? null,
      placeholder: f.placeholder ?? null,
      isRequired: f.isRequired ?? false,
      options: f.options ? JSON.stringify(f.options) : null,
      order: i,
    }));

    if (existing) {
      await prisma.formTemplate.update({
        where: { id: existing.id },
        data: {
          description: entry.description,
          category: entry.category,
          industryScope: toIndustryScopeJson(entry.industryScope),
          requiresSignature: entry.requiresSignature ?? true,
        },
      });
      updated++;
    } else {
      await prisma.formTemplate.create({
        data: {
          title: entry.title,
          description: entry.description,
          category: entry.category,
          isGlobal: true,
          allowTenantDeletion: false,
          industryScope: toIndustryScopeJson(entry.industryScope),
          requiresSignature: entry.requiresSignature ?? true,
          createdBy: SYSTEM_LIBRARY_CREATED_BY,
          fields: { create: fieldData },
        },
      });
      created++;
    }
  }

  return { success: true as const, data: { created, updated, total: library.length } };
}

export async function getFormLibraryStatus() {
  const hasAccess = await requirePrivilegedAccess();
  if (!hasAccess) return { success: false as const, error: "Ingen tilgang" };

  const library = getGlobalFormTemplateLibrary();
  const libraryTitles = new Set(library.map((e) => e.title));

  const expectedByIndustry = Object.fromEntries(
    INDUSTRY_KEYS.map((k) => [k, 0]),
  ) as Record<IndustryKey, number>;

  for (const entry of library) {
    for (const scope of entry.industryScope) {
      const key = scope as IndustryKey;
      if (key in expectedByIndustry) expectedByIndustry[key] += 1;
    }
  }

  const templates = await prisma.formTemplate.findMany({
    where: { tenantId: null, isGlobal: true, title: { in: Array.from(libraryTitles) } },
    select: { title: true, industryScope: true, updatedAt: true, isActive: true, createdBy: true },
  });

  const existingByIndustry = Object.fromEntries(
    INDUSTRY_KEYS.map((k) => [k, 0]),
  ) as Record<IndustryKey, number>;

  for (const t of templates) {
    const scopes = parseIndustryScope(t.industryScope);
    for (const scope of scopes) {
      const key = scope as IndustryKey;
      if (key in existingByIndustry) existingByIndustry[key] += 1;
    }
  }

  const synced = templates.filter((t) => t.createdBy === SYSTEM_LIBRARY_CREATED_BY);
  const lastSyncedAt =
    synced.length > 0
      ? synced.map((t) => t.updatedAt).sort((a, b) => b.getTime() - a.getTime())[0]
      : null;

  const perIndustry = INDUSTRY_KEYS.map((industry) => ({
    industry,
    expected: expectedByIndustry[industry],
    existing: existingByIndustry[industry],
    missing: Math.max(expectedByIndustry[industry] - existingByIndustry[industry], 0),
  }));

  return {
    success: true as const,
    data: {
      totalTemplates: library.length,
      activeCount: templates.filter((t) => t.isActive).length,
      missingTotal: perIndustry.reduce((s, r) => s + r.missing, 0),
      lastSyncedAt,
      health: perIndustry.every((r) => r.missing === 0) ? "HEALTHY" : "MISSING",
      perIndustry,
    },
  };
}

export async function syncFormLibraryNow() {
  const hasAccess = await requirePrivilegedAccess();
  if (!hasAccess) return { success: false as const, error: "Ingen tilgang" };
  return seedGlobalFormTemplateLibrary();
}
