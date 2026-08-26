"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchGoals() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const goals = await prisma.goal.findMany({
    where: { tenantId },
    include: {
      measurements: {
        orderBy: { measurementDate: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify(goals));
}

export async function fetchGoalDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const goal = await prisma.goal.findUnique({
    where: { id, tenantId },
    include: {
      measurements: {
        orderBy: { measurementDate: "desc" },
      },
      actions: {
        where: { goalId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!goal) return null;

  const owner = await prisma.user.findUnique({
    where: { id: goal.ownerId },
  });

  return JSON.parse(JSON.stringify({ goal, owner }));
}
