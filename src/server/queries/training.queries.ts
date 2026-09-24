"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchTrainingList() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return { trainingsRaw: [], tenantUsers: [], courseTemplates: [], reminderDays: 30 };
  const { tenantId } = ctx;

  const [trainingsRaw, tenantUsers, courseTemplates, tenant] = await Promise.all([
    prisma.training.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { tenants: { some: { tenantId } } },
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
  ]);

  return JSON.parse(JSON.stringify({
    trainingsRaw,
    tenantUsers,
    courseTemplates,
    reminderDays: tenant?.trainingReminderDaysBefore ?? 30,
  }));
}

export async function fetchTrainingDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const training = await prisma.training.findUnique({
    where: { id, tenantId },
  });

  if (!training) return null;

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
  const ctx = await getTenantContextSafe();
  if (!ctx) return { matrix: [], courseTemplates: [], reminderDays: 30 };
  const { tenantId } = ctx;

  const [users, trainings, courseTemplates] = await Promise.all([
    prisma.user.findMany({
      where: { tenants: { some: { tenantId } } },
      select: { id: true, name: true, email: true },
    }),
    prisma.training.findMany({
      where: { tenantId },
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
  ]);

  const matrix = users.map((u) => ({
    user: u,
    trainings: trainings.filter((t) => t.userId === u.id),
  }));

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { trainingReminderDaysBefore: true },
  });

  return JSON.parse(JSON.stringify({
    matrix,
    courseTemplates,
    reminderDays: tenant?.trainingReminderDaysBefore ?? 30,
  }));
}
