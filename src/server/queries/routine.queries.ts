"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";
import { listTenantRoutines, getRoutineById, listAllRoutineTemplates, listRecommendedRoutineTemplates } from "@/server/actions/routine.actions";

export async function fetchRoutines(query?: string) {
  const result = await listTenantRoutines(query);
  if (!result.success) return null;
  return JSON.parse(JSON.stringify(result.data));
}

export async function fetchRoutineTemplates(params: { showAll: boolean; query?: string }) {
  const result = params.showAll
    ? await listAllRoutineTemplates({ query: params.query })
    : await listRecommendedRoutineTemplates({ query: params.query });

  if (!result.success) return null;
  return JSON.parse(JSON.stringify(result.data));
}

export async function fetchRoutineDetail(id: string) {
  const result = await getRoutineById(id);
  if (!result.success) return null;

  const routine = result.data;
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const [linkedIncidents, linkedRisks, versions] = await Promise.all([
    prisma.incident.findMany({
      where: { relatedRoutineId: routine.id },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        severity: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: "desc" },
      take: 10,
    }),
    prisma.riskRoutineLink.findMany({
      where: { routineId: routine.id },
      include: {
        risk: {
          select: {
            id: true,
            title: true,
            score: true,
            status: true,
            category: true,
          },
        },
      },
    }),
    prisma.routineVersion.findMany({
      where: { routineId: routine.id },
      include: {
        changedBy: { select: { name: true, email: true } },
      },
      orderBy: { versionNumber: "desc" },
      take: 20,
    }),
  ]);

  return JSON.parse(JSON.stringify({
    routine,
    linkedIncidents,
    linkedRisks,
    versions: versions.map((v) => ({
      ...v,
      content: v.content as Record<string, unknown>,
      createdAt: v.createdAt.toISOString(),
    })),
  }));
}
