"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";
import { getAuthContext } from "@/lib/server-authorization";
import { listVisibleEmployeeIds } from "@/server/lib/leader-employees";

/** AML § 3-2: krav gjelder arbeidet den ansatte er tildelt, ikke alle i bedriften. */
async function requiredCourseKeysByUser(tenantId: string): Promise<Record<string, string[]>> {
  const assignments = await prisma.userCompetenceProfile.findMany({
    where: { tenantId },
    select: {
      userId: true,
      profile: {
        select: {
          requirements: {
            where: { requiredLevel: "REQUIRED" },
            select: { courseKey: true },
          },
        },
      },
    },
  });

  const map = new Map<string, Set<string>>();
  for (const row of assignments) {
    const keys = map.get(row.userId) ?? new Set<string>();
    for (const requirement of row.profile.requirements) {
      keys.add(requirement.courseKey);
    }
    map.set(row.userId, keys);
  }

  return Object.fromEntries([...map].map(([userId, keys]) => [userId, [...keys]]));
}

export async function fetchTrainingList() {
  const auth = await getAuthContext();
  if (!auth) return { trainingsRaw: [], tenantUsers: [], courseTemplates: [], reminderDays: 30, requiredCourseKeysByUser: {} };
  const { tenantId } = auth;
  const visibleIds = await listVisibleEmployeeIds(auth);

  const [trainingsRaw, tenantUsers, courseTemplates, tenant, requiredByUser] = await Promise.all([
    prisma.training.findMany({
      where: { tenantId, ...(visibleIds ? { userId: { in: visibleIds } } : {}) },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        ...(visibleIds ? { id: { in: visibleIds } } : {}),
        tenants: { some: { tenantId } },
      },
      select: { id: true, name: true, email: true },
    }),
    prisma.courseTemplate.findMany({
      where: {
        OR: [
          { tenantId, isActive: true },
          { isGlobal: true, isActive: true },
        ],
      },
      orderBy: { title: "asc" },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { trainingReminderDaysBefore: true },
    }),
    requiredCourseKeysByUser(tenantId),
  ]);

  // Dedupliser: tenant-overstyring erstatter globalt kurs med samme courseKey
  const tenantKeys = new Set(
    courseTemplates.filter((c) => c.tenantId === tenantId).map((c) => c.courseKey),
  );
  const deduped = courseTemplates.filter(
    (c) => c.tenantId === tenantId || !tenantKeys.has(c.courseKey),
  );

  return JSON.parse(JSON.stringify({
    trainingsRaw,
    tenantUsers,
    courseTemplates: deduped,
    reminderDays: tenant?.trainingReminderDaysBefore ?? 30,
    requiredCourseKeysByUser: requiredByUser,
  }));
}

export async function fetchTrainingDetail(id: string) {
  const auth = await getAuthContext();
  if (!auth) return null;
  const { tenantId } = auth;

  const training = await prisma.training.findUnique({
    where: { id, tenantId },
  });

  if (!training) return null;
  const visibleIds = await listVisibleEmployeeIds(auth);
  if (visibleIds && !visibleIds.includes(training.userId)) return null;

  const trainedUser = await prisma.user.findUnique({
    where: { id: training.userId },
    select: { id: true, name: true, email: true },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { trainingReminderDaysBefore: true },
  });

  return JSON.parse(JSON.stringify({
    training,
    trainedUser,
    reminderDays: tenant?.trainingReminderDaysBefore ?? 30,
  }));
}

export async function fetchTrainingCourses() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return { globalCourses: [], tenantCourses: [] };
  const { tenantId } = ctx;

  const [globalCourses, tenantCourses] = await Promise.all([
    prisma.courseTemplate.findMany({
      where: { isGlobal: true, isActive: true },
      orderBy: { title: "asc" },
    }),
    prisma.courseTemplate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return JSON.parse(JSON.stringify({ globalCourses, tenantCourses }));
}

export async function fetchTrainingMatrix() {
  const auth = await getAuthContext();
  if (!auth) return { matrix: [], courseTemplates: [], reminderDays: 30, requiredCourseKeysByUser: {} };
  const { tenantId } = auth;
  const visibleIds = await listVisibleEmployeeIds(auth);

  const [users, trainings, courseTemplates, requiredByUser] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(visibleIds ? { id: { in: visibleIds } } : {}),
        tenants: { some: { tenantId } },
      },
      select: { id: true, name: true, email: true },
    }),
    prisma.training.findMany({
      where: { tenantId, ...(visibleIds ? { userId: { in: visibleIds } } : {}) },
      orderBy: { courseKey: "asc" },
    }),
    prisma.courseTemplate.findMany({
      where: {
        OR: [
          { tenantId, isActive: true },
          { isGlobal: true, isActive: true },
        ],
      },
      orderBy: { title: "asc" },
    }),
    requiredCourseKeysByUser(tenantId),
  ]);

  const matrix = users.map((u) => ({
    user: u,
    trainings: trainings.filter((t) => t.userId === u.id),
  }));

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { trainingReminderDaysBefore: true },
  });

  // Dedupliser: tenant-overstyring erstatter globalt kurs med samme courseKey
  const matrixTenantKeys = new Set(
    courseTemplates.filter((c) => c.tenantId === tenantId).map((c) => c.courseKey),
  );
  const dedupedTemplates = courseTemplates.filter(
    (c) => c.tenantId === tenantId || !matrixTenantKeys.has(c.courseKey),
  );

  // Inkluder kurs fra faktiske opplæringer som ikke har en mal
  const templateKeys = new Set(dedupedTemplates.map((t) => t.courseKey));
  const extraCourseKeys = new Set<string>();
  for (const t of trainings) {
    if (!templateKeys.has(t.courseKey)) {
      extraCourseKeys.add(t.courseKey);
    }
  }
  const extraCourses = [...extraCourseKeys].sort().map((key) => ({
    id: `extra-${key}`,
    courseKey: key,
    title: trainings.find((t) => t.courseKey === key)?.title ?? key,
    description: null,
    provider: null,
    isRequired: false,
    validityYears: null,
    isGlobal: false,
    isActive: true,
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return JSON.parse(JSON.stringify({
    matrix,
    courseTemplates: [...dedupedTemplates, ...extraCourses],
    reminderDays: tenant?.trainingReminderDaysBefore ?? 30,
    requiredCourseKeysByUser: requiredByUser,
  }));
}
