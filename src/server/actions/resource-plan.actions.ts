"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext, requirePermission } from "@/lib/server-authorization";
import { findOverlappingAssignments } from "@/lib/time/resource-overlap";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function listResourceWeek(weekStartIso: string) {
  const ctx = await requirePermission("canApproveTimesheet");
  const from = new Date(`${weekStartIso.slice(0, 10)}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);

  const [assignments, users, projects] = await Promise.all([
    prisma.resourceAssignment.findMany({
      where: {
        tenantId: ctx.tenantId,
        startDate: { lte: to },
        endDate: { gte: from },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, parentId: true } },
      },
    }),
    prisma.userTenant.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId, status: { in: ["ACTIVE", "PLANNING"] } },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return JSON.parse(JSON.stringify({ assignments, users, projects, from, to }));
}

export async function upsertResourceAssignment(input: {
  id?: string;
  userId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  plannedHours?: number;
}) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    const startDate = new Date(`${input.startDate.slice(0, 10)}T12:00:00`);
    const endDate = new Date(`${input.endDate.slice(0, 10)}T12:00:00`);
    if (endDate < startDate) {
      return { success: false as const, error: "Sluttdato kan ikke være før startdato" };
    }

    const existing = await prisma.resourceAssignment.findMany({
      where: { tenantId: ctx.tenantId, userId: input.userId },
    });
    const overlaps = findOverlappingAssignments(
      { id: input.id, userId: input.userId, startDate, endDate },
      existing
    );

    const data = {
      tenantId: ctx.tenantId,
      userId: input.userId,
      projectId: input.projectId,
      startDate,
      endDate,
      plannedHours: input.plannedHours ?? null,
    };

    const row = input.id
      ? await prisma.resourceAssignment.update({ where: { id: input.id }, data })
      : await prisma.resourceAssignment.create({ data });

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/time-registration");
    return {
      success: true as const,
      data: row,
      overlapWarning: overlaps.length > 0,
      overlaps: overlaps.map((o) => o.id),
    };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre plan") };
  }
}

export async function deleteResourceAssignment(id: string) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    await prisma.resourceAssignment.deleteMany({ where: { id, tenantId: ctx.tenantId } });
    revalidatePath("/dashboard/projects");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke slette") };
  }
}

export async function suggestedProjectForToday() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const today = new Date();
  const assignment = await prisma.resourceAssignment.findFirst({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { startDate: "desc" },
  });
  return assignment?.project ?? null;
}
