"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export async function fetchTrainingList() {
  const { tenantId } = await getRequiredTenantContext();

  const [trainingsRaw, tenantUsers, courseTemplates] = await Promise.all([
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
  ]);

  return JSON.parse(JSON.stringify({ trainingsRaw, tenantUsers, courseTemplates }));
}

export async function fetchTrainingDetail(id: string) {
  const { tenantId } = await getRequiredTenantContext();

  const training = await prisma.training.findUnique({
    where: { id, tenantId },
  });

  if (!training) return null;

  const trainedUser = await prisma.user.findUnique({
    where: { id: training.userId },
    select: { id: true, name: true, email: true },
  });

  return JSON.parse(JSON.stringify({ training, trainedUser }));
}

export async function fetchTrainingCourses() {
  const { tenantId } = await getRequiredTenantContext();

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
  const { tenantId } = await getRequiredTenantContext();

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

  return JSON.parse(JSON.stringify({ matrix, courseTemplates }));
}
