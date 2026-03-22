"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getGlobalRoutineTemplateLibrary,
  type RoutineTemplateLibraryEntry,
} from "@/lib/routine-template-library";
import { parseIndustryScope, toIndustryScopeJson } from "@/lib/industry-scope";

const SYSTEM_LIBRARY_CREATED_BY = "SYSTEM_ROUTINE_LIBRARY";
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
  if (!session?.user?.email) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      isSuperAdmin: true,
      isSupport: true,
    },
  });

  return !!user && (user.isSuperAdmin || user.isSupport);
}

function mapLibraryEntryToPersistence(entry: RoutineTemplateLibraryEntry) {
  return {
    title: entry.title,
    description: entry.description,
    category: entry.category,
    content: entry.content as Prisma.InputJsonValue,
    legalReference: entry.legalReference,
    isGlobal: true,
    isActive: true,
    industryScope: toIndustryScopeJson(entry.industryScope),
    createdBy: SYSTEM_LIBRARY_CREATED_BY,
  };
}

export async function seedGlobalRoutineTemplateLibrary() {
  const library = getGlobalRoutineTemplateLibrary();
  let created = 0;
  let updated = 0;

  for (const entry of library) {
    const mapped = mapLibraryEntryToPersistence(entry);
    const existing = await prisma.routineTemplate.findFirst({
      where: {
        tenantId: null,
        isGlobal: true,
        title: entry.title,
      },
      select: {
        id: true,
        description: true,
        category: true,
        content: true,
        legalReference: true,
        isGlobal: true,
        isActive: true,
        industryScope: true,
        createdBy: true,
      },
    });

    if (!existing) {
      await prisma.routineTemplate.create({
        data: mapped,
      });
      created += 1;
      continue;
    }

    const isUnchanged =
      existing.description === mapped.description &&
      existing.category === mapped.category &&
      JSON.stringify(existing.content) === JSON.stringify(mapped.content) &&
      existing.legalReference === mapped.legalReference &&
      existing.isGlobal === mapped.isGlobal &&
      existing.isActive === mapped.isActive &&
      JSON.stringify(existing.industryScope) === JSON.stringify(mapped.industryScope) &&
      existing.createdBy === mapped.createdBy;

    if (!isUnchanged) {
      await prisma.routineTemplate.update({
        where: { id: existing.id },
        data: mapped,
      });
      updated += 1;
    }
  }

  return {
    success: true as const,
    data: {
      created,
      updated,
      total: library.length,
    },
  };
}

export async function ensureGlobalRoutineTemplateLibrarySeeded() {
  const libraryTitles = getGlobalRoutineTemplateLibrary().map((entry) => entry.title);
  const existingCount = await prisma.routineTemplate.count({
    where: {
      tenantId: null,
      isGlobal: true,
      title: {
        in: libraryTitles,
      },
    },
  });

  if (existingCount === libraryTitles.length) {
    return { success: true as const, data: { seeded: false } };
  }

  await seedGlobalRoutineTemplateLibrary();
  return { success: true as const, data: { seeded: true } };
}

export async function getRoutineLibraryStatus() {
  const hasAccess = await requirePrivilegedAccess();
  if (!hasAccess) {
    return { success: false as const, error: "Ingen tilgang" };
  }

  const library = getGlobalRoutineTemplateLibrary();
  const libraryTitles = new Set(library.map((entry) => entry.title));
  const expectedByIndustry = Object.fromEntries(
    INDUSTRY_KEYS.map((industry) => [industry, 0]),
  ) as Record<IndustryKey, number>;

  for (const entry of library) {
    for (const scope of entry.industryScope) {
      const key = scope as IndustryKey;
      if (key in expectedByIndustry) {
        expectedByIndustry[key] += 1;
      }
    }
  }

  const templates = await prisma.routineTemplate.findMany({
    where: {
      tenantId: null,
      isGlobal: true,
      title: {
        in: Array.from(libraryTitles),
      },
    },
    select: {
      title: true,
      industryScope: true,
      updatedAt: true,
      isActive: true,
      createdBy: true,
    },
  });

  const existingByIndustry = Object.fromEntries(
    INDUSTRY_KEYS.map((industry) => [industry, 0]),
  ) as Record<IndustryKey, number>;

  for (const template of templates) {
    const scopes = parseIndustryScope(template.industryScope);
    for (const scope of scopes) {
      const key = scope as IndustryKey;
      if (key in existingByIndustry) {
        existingByIndustry[key] += 1;
      }
    }
  }

  const syncedTemplates = templates.filter(
    (template) => template.createdBy === SYSTEM_LIBRARY_CREATED_BY,
  );
  const lastSyncedAt =
    syncedTemplates.length > 0
      ? syncedTemplates
          .map((template) => template.updatedAt)
          .sort((a, b) => b.getTime() - a.getTime())[0]
      : null;

  const perIndustry = INDUSTRY_KEYS.map((industry) => ({
    industry,
    expected: expectedByIndustry[industry],
    existing: existingByIndustry[industry],
    missing: Math.max(expectedByIndustry[industry] - existingByIndustry[industry], 0),
  }));

  const totalExpected = perIndustry.reduce((sum, item) => sum + item.expected, 0);
  const totalExisting = perIndustry.reduce((sum, item) => sum + item.existing, 0);
  const missingTotal = perIndustry.reduce((sum, item) => sum + item.missing, 0);
  const activeCount = templates.filter((template) => template.isActive).length;

  return {
    success: true as const,
    data: {
      totalTemplates: library.length,
      totalExpected,
      totalExisting,
      missingTotal,
      activeCount,
      lastSyncedAt,
      health: missingTotal === 0 ? "HEALTHY" : "MISSING",
      perIndustry,
    },
  };
}

export async function syncRoutineLibraryNow() {
  const hasAccess = await requirePrivilegedAccess();
  if (!hasAccess) {
    return { success: false as const, error: "Ingen tilgang" };
  }

  const result = await seedGlobalRoutineTemplateLibrary();
  return {
    success: true as const,
    data: result.data,
  };
}
