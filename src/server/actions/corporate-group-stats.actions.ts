"use server";

import { prisma } from "@/lib/db";
import {
  requireCorporateGroupContext,
  getAccessibleTenantIds,
} from "@/lib/corporate-group-context";

export interface TenantComplianceScore {
  tenantId: string;
  tenantName: string;
  city: string | null;
  employeeCount: number | null;
  overallScore: number;
  routineScore: number;
  riskScore: number;
  documentScore: number;
  inspectionScore: number;
  trainingScore: number;
}

export interface IncidentTrendPoint {
  month: string;
  avvik: number;
  nestenulykker: number;
  ulykker: number;
}

export interface GroupAlert {
  tenantId: string;
  tenantName: string;
  type: "critical" | "warning" | "info";
  message: string;
  category: string;
}

export async function getGroupComplianceScores(): Promise<TenantComplianceScore[]> {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  if (tenantIds.length === 0) return [];

  const tenants = await prisma.corporateGroupTenant.findMany({
    where: { groupId: context.groupId, status: "ACTIVE" },
    include: {
      tenant: {
        select: { id: true, name: true, city: true, employeeCount: true },
      },
    },
  });

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [
    routinesByTenant,
    riskAssessmentsByTenant,
    documentsByTenant,
    inspectionsByTenant,
    trainingByTenant,
    employeeCountByTenant,
  ] = await Promise.all([
    prisma.routine.groupBy({
      by: ["tenantId", "status"],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
    prisma.riskAssessment.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        updatedAt: { gte: twelveMonthsAgo },
      },
      _count: true,
    }),
    prisma.document.groupBy({
      by: ["tenantId", "status"],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
    prisma.inspection.groupBy({
      by: ["tenantId", "status"],
      where: {
        tenantId: { in: tenantIds },
        scheduledDate: { gte: twelveMonthsAgo },
      },
      _count: true,
    }),
    prisma.training.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } },
        ],
      },
      _count: true,
    }),
    prisma.userTenant.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
  ]);

  return tenants.map((gt) => {
    const tid = gt.tenant.id;

    const routines = routinesByTenant.filter((r) => r.tenantId === tid);
    const totalRoutines = routines.reduce((s, r) => s + r._count, 0);
    const activeRoutines = routines.find((r) => r.status === "ACTIVE")?._count ?? 0;
    const routineScore = totalRoutines > 0 ? Math.round((activeRoutines / totalRoutines) * 100) : 0;

    const riskCount = riskAssessmentsByTenant.find((r) => r.tenantId === tid)?._count ?? 0;
    const riskScore = Math.min(100, riskCount * 20);

    const docs = documentsByTenant.filter((d) => d.tenantId === tid);
    const totalDocs = docs.reduce((s, d) => s + d._count, 0);
    const approvedDocs = docs.find((d) => d.status === "APPROVED")?._count ?? 0;
    const documentScore = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;

    const inspections = inspectionsByTenant.filter((i) => i.tenantId === tid);
    const totalInspections = inspections.reduce((s, i) => s + i._count, 0);
    const completedInspections = inspections.find((i) => i.status === "COMPLETED")?._count ?? 0;
    const inspectionScore = totalInspections > 0 ? Math.round((completedInspections / totalInspections) * 100) : 0;

    const employeeCount = employeeCountByTenant.find((e) => e.tenantId === tid)?._count ?? 1;
    const validTraining = trainingByTenant.find((t) => t.tenantId === tid)?._count ?? 0;
    const trainingScore = Math.min(100, Math.round((validTraining / employeeCount) * 100));

    const weights = { routine: 0.25, risk: 0.2, document: 0.2, inspection: 0.2, training: 0.15 };
    const overallScore = Math.round(
      routineScore * weights.routine +
      riskScore * weights.risk +
      documentScore * weights.document +
      inspectionScore * weights.inspection +
      trainingScore * weights.training
    );

    return {
      tenantId: tid,
      tenantName: gt.tenant.name,
      city: gt.tenant.city,
      employeeCount: gt.tenant.employeeCount,
      overallScore,
      routineScore,
      riskScore,
      documentScore,
      inspectionScore,
      trainingScore,
    };
  });
}

export async function getGroupIncidentStats() {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  if (tenantIds.length === 0) {
    return { byTenant: [], byType: [], byStatus: [], trend: [] as IncidentTrendPoint[], totals: { open: 0, closed: 0, total: 0 } };
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [byTenant, byType, byStatus, allIncidents] = await Promise.all([
    prisma.incident.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds }, occurredAt: { gte: twelveMonthsAgo } },
      _count: true,
    }),
    prisma.incident.groupBy({
      by: ["type"],
      where: { tenantId: { in: tenantIds }, occurredAt: { gte: twelveMonthsAgo } },
      _count: true,
    }),
    prisma.incident.groupBy({
      by: ["status"],
      where: { tenantId: { in: tenantIds }, occurredAt: { gte: twelveMonthsAgo } },
      _count: true,
    }),
    prisma.incident.findMany({
      where: { tenantId: { in: tenantIds }, occurredAt: { gte: twelveMonthsAgo } },
      select: { occurredAt: true, type: true },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  const trendMap = new Map<string, { avvik: number; nestenulykker: number; ulykker: number }>();
  for (const inc of allIncidents) {
    const key = `${inc.occurredAt.getFullYear()}-${String(inc.occurredAt.getMonth() + 1).padStart(2, "0")}`;
    const entry = trendMap.get(key) ?? { avvik: 0, nestenulykker: 0, ulykker: 0 };
    if (inc.type === "AVVIK" || inc.type === "KVALITET" || inc.type === "MILJO" || inc.type === "CUSTOMER") {
      entry.avvik++;
    } else if (inc.type === "NESTEN" || inc.type === "FARLIG_SITUASJON") {
      entry.nestenulykker++;
    } else if (inc.type === "ULYKKE" || inc.type === "YRKESSYKDOM") {
      entry.ulykker++;
    }
    trendMap.set(key, entry);
  }

  const trend: IncidentTrendPoint[] = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  const openCount = byStatus.find((s) => s.status === "OPEN")?._count ?? 0;
  const investigatingCount = byStatus.find((s) => s.status === "INVESTIGATING")?._count ?? 0;
  const closedCount = byStatus.find((s) => s.status === "CLOSED")?._count ?? 0;

  return {
    byTenant,
    byType,
    byStatus,
    trend,
    totals: {
      open: openCount + investigatingCount,
      closed: closedCount,
      total: byStatus.reduce((s, b) => s + b._count, 0),
    },
  };
}

export async function getGroupTrainingStatus() {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  if (tenantIds.length === 0) return [];

  const now = new Date();

  const tenants = await prisma.corporateGroupTenant.findMany({
    where: { groupId: context.groupId, status: "ACTIVE" },
    include: { tenant: { select: { id: true, name: true } } },
  });

  const [employeeCounts, validTraining, expiredTraining] = await Promise.all([
    prisma.userTenant.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
    prisma.training.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      _count: true,
    }),
    prisma.training.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        validUntil: { lt: now },
      },
      _count: true,
    }),
  ]);

  return tenants.map((gt) => {
    const tid = gt.tenant.id;
    return {
      tenantId: tid,
      tenantName: gt.tenant.name,
      employees: employeeCounts.find((e) => e.tenantId === tid)?._count ?? 0,
      validCourses: validTraining.find((t) => t.tenantId === tid)?._count ?? 0,
      expiredCourses: expiredTraining.find((t) => t.tenantId === tid)?._count ?? 0,
    };
  });
}

export async function getGroupInspectionStatus() {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  if (tenantIds.length === 0) return [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const tenants = await prisma.corporateGroupTenant.findMany({
    where: { groupId: context.groupId, status: "ACTIVE" },
    include: { tenant: { select: { id: true, name: true } } },
  });

  const inspections = await prisma.inspection.groupBy({
    by: ["tenantId", "status"],
    where: {
      tenantId: { in: tenantIds },
      scheduledDate: { gte: twelveMonthsAgo },
    },
    _count: true,
  });

  const lastCompleted = await prisma.inspection.findMany({
    where: {
      tenantId: { in: tenantIds },
      status: "COMPLETED",
    },
    orderBy: { completedDate: "desc" },
    distinct: ["tenantId"],
    select: { tenantId: true, completedDate: true },
  });

  return tenants.map((gt) => {
    const tid = gt.tenant.id;
    const tenantInspections = inspections.filter((i) => i.tenantId === tid);
    const completed = tenantInspections.find((i) => i.status === "COMPLETED")?._count ?? 0;
    const planned = tenantInspections.find((i) => i.status === "PLANNED")?._count ?? 0;
    const last = lastCompleted.find((l) => l.tenantId === tid);

    return {
      tenantId: tid,
      tenantName: gt.tenant.name,
      completedCount: completed,
      plannedCount: planned,
      lastCompletedDate: last?.completedDate ?? null,
    };
  });
}

export async function getGroupAlerts(): Promise<GroupAlert[]> {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  if (tenantIds.length === 0) return [];

  const tenants = await prisma.corporateGroupTenant.findMany({
    where: { groupId: context.groupId, status: "ACTIVE" },
    include: { tenant: { select: { id: true, name: true } } },
  });

  const tenantMap = new Map(tenants.map((gt) => [gt.tenant.id, gt.tenant.name]));
  const alerts: GroupAlert[] = [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [openIncidents, overdueRoutines, oldRiskAssessments] = await Promise.all([
    prisma.incident.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        status: { in: ["OPEN", "INVESTIGATING"] },
        occurredAt: { lte: thirtyDaysAgo },
      },
      _count: true,
    }),
    prisma.routine.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        status: "NEEDS_REVIEW",
      },
      _count: true,
    }),
    prisma.riskAssessment.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: tenantIds },
        updatedAt: {
          lt: new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()),
        },
      },
      _count: true,
    }),
  ]);

  for (const item of openIncidents) {
    const name = tenantMap.get(item.tenantId) ?? "Ukjent";
    alerts.push({
      tenantId: item.tenantId,
      tenantName: name,
      type: item._count >= 5 ? "critical" : "warning",
      message: `${item._count} ubehandlede hendelser eldre enn 30 dager`,
      category: "incidents",
    });
  }

  for (const item of overdueRoutines) {
    if (item._count > 0) {
      const name = tenantMap.get(item.tenantId) ?? "Ukjent";
      alerts.push({
        tenantId: item.tenantId,
        tenantName: name,
        type: "warning",
        message: `${item._count} rutiner trenger gjennomgang`,
        category: "routines",
      });
    }
  }

  for (const item of oldRiskAssessments) {
    if (item._count > 0) {
      const name = tenantMap.get(item.tenantId) ?? "Ukjent";
      alerts.push({
        tenantId: item.tenantId,
        tenantName: name,
        type: "warning",
        message: `${item._count} risikovurderinger ikke oppdatert siste 12 mnd`,
        category: "risk",
      });
    }
  }

  return alerts.sort((a, b) => {
    const priority = { critical: 0, warning: 1, info: 2 };
    return priority[a.type] - priority[b.type];
  });
}

export async function getGroupOverviewStats() {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [
    totalEmployees,
    totalIncidents,
    openIncidents,
    totalRoutines,
    totalRiskAssessments,
    completedInspections,
  ] = await Promise.all([
    prisma.userTenant.count({ where: { tenantId: { in: tenantIds } } }),
    prisma.incident.count({ where: { tenantId: { in: tenantIds }, occurredAt: { gte: twelveMonthsAgo } } }),
    prisma.incident.count({ where: { tenantId: { in: tenantIds }, status: { in: ["OPEN", "INVESTIGATING"] } } }),
    prisma.routine.count({ where: { tenantId: { in: tenantIds }, status: "ACTIVE" } }),
    prisma.riskAssessment.count({ where: { tenantId: { in: tenantIds }, updatedAt: { gte: twelveMonthsAgo } } }),
    prisma.inspection.count({ where: { tenantId: { in: tenantIds }, status: "COMPLETED", scheduledDate: { gte: twelveMonthsAgo } } }),
  ]);

  return {
    totalTenants: tenantIds.length,
    totalEmployees,
    totalIncidents,
    openIncidents,
    totalRoutines,
    totalRiskAssessments,
    completedInspections,
  };
}
