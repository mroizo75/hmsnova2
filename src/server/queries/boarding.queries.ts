"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchBoardings(type?: "ONBOARDING" | "OFFBOARDING") {
  const auth = await getAuthContext();
  const { tenantId, userId, permissions } = auth;

  if (!permissions.canReadAllBoarding && !permissions.canReadOwnBoarding) {
    return [];
  }

  const where: any = { tenantId };
  if (type) where.type = type;

  if (!permissions.canReadAllBoarding) {
    where.employeeId = userId;
  }

  const boardings = await prisma.boarding.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, name: true } },
      tasks: {
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify(boardings));
}

export async function fetchBoardingById(id: string) {
  const auth = await getAuthContext();
  const { tenantId, userId, permissions } = auth;

  const boarding = await prisma.boarding.findFirst({
    where: { id, tenantId },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, name: true } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          completedBy: { select: { id: true, name: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!boarding) return null;

  if (!permissions.canReadAllBoarding && boarding.employeeId !== userId) {
    const isAssignee = boarding.tasks.some((t) => t.assigneeId === userId);
    if (!isAssignee) return null;
  }

  return JSON.parse(JSON.stringify(boarding));
}

export async function fetchTemplates(type?: "ONBOARDING" | "OFFBOARDING") {
  const auth = await getAuthContext();
  const { tenantId, permissions } = auth;

  if (!permissions.canReadAllBoarding && !permissions.canManageBoardingTemplates) {
    return [];
  }

  const where: any = { tenantId };
  if (type) where.type = type;

  const templates = await prisma.boardingTemplate.findMany({
    where,
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
      _count: { select: { boardings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify(templates));
}

export async function fetchTemplateById(id: string) {
  const auth = await getAuthContext();
  const { tenantId, permissions } = auth;

  if (!permissions.canManageBoardingTemplates && !permissions.canReadAllBoarding) {
    return null;
  }

  const template = await prisma.boardingTemplate.findFirst({
    where: { id, tenantId },
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
    },
  });

  return template ? JSON.parse(JSON.stringify(template)) : null;
}

export async function fetchMyBoardingTasks() {
  const auth = await getAuthContext();
  const { tenantId, userId } = auth;

  const tasks = await prisma.boardingTask.findMany({
    where: {
      assigneeId: userId,
      status: "PENDING",
      boarding: { tenantId },
    },
    include: {
      boarding: {
        include: {
          employee: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return JSON.parse(JSON.stringify(tasks));
}
