"use server";

import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isSuperAdmin: true, isSupport: true },
  });
  if (!user || (!user.isSuperAdmin && !user.isSupport)) return null;
  return user;
}

export interface TenantHmsRow {
  id: string;
  name: string;
  orgNumber: string | null;
  industry: string | null;
  status: string;
  complianceScore: number;
  incidentsOpen: number;
  incidentsClosed90d: number;
  riskAssessments: number;
  inspections: number;
  trainings: number;
  measuresPending: number;
  measuresCompleted: number;
  lastActivity: Date | null;
}

export interface HmsKpiSummary {
  activeTenants: number;
  avgCompliance: number;
  incidentsThisMonth: number;
  measuresCompletedRate: number;
}

export interface HmsTrendPoint {
  month: string;
  incidents: number;
  measures: number;
}

export async function getAggregatedHmsStats(): Promise<{
  kpi: HmsKpiSummary;
  rows: TenantHmsRow[];
  trends: HmsTrendPoint[];
} | null> {
  const staff = await requireStaff();
  if (!staff) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const tenants = await prisma.tenant.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    select: { id: true, name: true, orgNumber: true, industry: true, status: true },
    orderBy: { name: "asc" },
  });

  const tenantIds = tenants.map((t) => t.id);

  type GroupRow = { tenantId: string; cnt: bigint };
  type MaxRow = { tenantId: string; maxDate: Date | null };

  const [
    incidentsByTenantRaw,
    incidentsClosed90dRaw,
    risksByTenantRaw,
    inspectionsByTenantRaw,
    trainingsByTenantRaw,
    measuresPendingRaw,
    measuresCompletedRaw,
    incidentsThisMonth,
    lastActivityRaw,
  ] = await Promise.all([
    prisma.$queryRaw<GroupRow[]>`
      SELECT tenantId, COUNT(*) as cnt FROM Incident
      WHERE tenantId IN (${Prisma.join(tenantIds)})
        AND status IN ('OPEN', 'IN_PROGRESS')
      GROUP BY tenantId
    `,
    prisma.$queryRaw<GroupRow[]>`
      SELECT tenantId, COUNT(*) as cnt FROM Incident
      WHERE tenantId IN (${Prisma.join(tenantIds)})
        AND status = 'CLOSED'
        AND updatedAt >= ${ninetyDaysAgo}
      GROUP BY tenantId
    `,
    prisma.$queryRaw<GroupRow[]>`
      SELECT tenantId, COUNT(*) as cnt FROM RiskAssessment
      WHERE tenantId IN (${Prisma.join(tenantIds)})
      GROUP BY tenantId
    `,
    prisma.$queryRaw<GroupRow[]>`
      SELECT tenantId, COUNT(*) as cnt FROM Inspection
      WHERE tenantId IN (${Prisma.join(tenantIds)})
      GROUP BY tenantId
    `,
    prisma.$queryRaw<GroupRow[]>`
      SELECT tenantId, COUNT(*) as cnt FROM Training
      WHERE tenantId IN (${Prisma.join(tenantIds)})
      GROUP BY tenantId
    `,
    prisma.$queryRaw<GroupRow[]>`
      SELECT tenantId, COUNT(*) as cnt FROM Measure
      WHERE tenantId IN (${Prisma.join(tenantIds)})
        AND status IN ('PENDING', 'IN_PROGRESS')
      GROUP BY tenantId
    `,
    prisma.$queryRaw<GroupRow[]>`
      SELECT tenantId, COUNT(*) as cnt FROM Measure
      WHERE tenantId IN (${Prisma.join(tenantIds)})
        AND status = 'DONE'
      GROUP BY tenantId
    `,
    prisma.incident.count({
      where: { tenantId: { in: tenantIds }, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.$queryRaw<MaxRow[]>`
      SELECT tenantId, MAX(createdAt) as maxDate FROM Incident
      WHERE tenantId IN (${Prisma.join(tenantIds)})
      GROUP BY tenantId
    `,
  ]);

  const incidentsByTenant = incidentsByTenantRaw;
  const incidentsClosed90d = incidentsClosed90dRaw;
  const risksByTenant = risksByTenantRaw;
  const inspectionsByTenant = inspectionsByTenantRaw;
  const trainingsByTenant = trainingsByTenantRaw;
  const measuresPending = measuresPendingRaw;
  const measuresCompleted = measuresCompletedRaw;
  const lastActivityByTenant = lastActivityRaw;

  const toMap = (rows: GroupRow[]) =>
    new Map(rows.map((r) => [r.tenantId, Number(r.cnt)]));

  const openMap = toMap(incidentsByTenant);
  const closedMap = toMap(incidentsClosed90d);
  const risksMap = toMap(risksByTenant);
  const inspMap = toMap(inspectionsByTenant);
  const trainMap = toMap(trainingsByTenant);
  const measPendMap = toMap(measuresPending);
  const measDoneMap = toMap(measuresCompleted);
  const lastActMap = new Map(
    lastActivityByTenant.map((r) => [r.tenantId, r.maxDate])
  );

  const rows: TenantHmsRow[] = tenants.map((t) => {
    const open = openMap.get(t.id) || 0;
    const closed = closedMap.get(t.id) || 0;
    const risks = risksMap.get(t.id) || 0;
    const insp = inspMap.get(t.id) || 0;
    const train = trainMap.get(t.id) || 0;
    const measPend = measPendMap.get(t.id) || 0;
    const measDone = measDoneMap.get(t.id) || 0;

    const score = computeComplianceScore({ risks, insp, train, measDone, measPend, open, closed });

    return {
      id: t.id,
      name: t.name,
      orgNumber: t.orgNumber,
      industry: t.industry,
      status: t.status,
      complianceScore: score,
      incidentsOpen: open,
      incidentsClosed90d: closed,
      riskAssessments: risks,
      inspections: insp,
      trainings: train,
      measuresPending: measPend,
      measuresCompleted: measDone,
      lastActivity: lastActMap.get(t.id) || null,
    };
  });

  const totalMeasures = rows.reduce((s, r) => s + r.measuresPending + r.measuresCompleted, 0);
  const totalDone = rows.reduce((s, r) => s + r.measuresCompleted, 0);

  const kpi: HmsKpiSummary = {
    activeTenants: tenants.length,
    avgCompliance: rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.complianceScore, 0) / rows.length)
      : 0,
    incidentsThisMonth: incidentsThisMonth,
    measuresCompletedRate: totalMeasures > 0 ? Math.round((totalDone / totalMeasures) * 100) : 0,
  };

  const trends = await getMonthlyTrends(tenantIds);

  return { kpi, rows, trends };
}

function computeComplianceScore(data: {
  risks: number;
  insp: number;
  train: number;
  measDone: number;
  measPend: number;
  open: number;
  closed: number;
}): number {
  let score = 0;
  if (data.risks > 0) score += 20;
  if (data.insp > 0) score += 20;
  if (data.train > 0) score += 15;

  const totalMeasures = data.measDone + data.measPend;
  if (totalMeasures > 0) {
    score += Math.round((data.measDone / totalMeasures) * 25);
  } else {
    score += 12;
  }

  const totalIncidents = data.open + data.closed;
  if (totalIncidents > 0) {
    const closeRate = data.closed / totalIncidents;
    score += Math.round(closeRate * 20);
  } else {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

async function getMonthlyTrends(tenantIds: string[]): Promise<HmsTrendPoint[]> {
  const points: HmsTrendPoint[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

    const [incidents, measures] = await Promise.all([
      prisma.incident.count({
        where: { tenantId: { in: tenantIds }, createdAt: { gte: start, lte: end } },
      }),
      prisma.measure.count({
        where: { tenantId: { in: tenantIds }, status: "DONE", updatedAt: { gte: start, lte: end } },
      }),
    ]);

    points.push({ month, incidents, measures: measures });
  }

  return points;
}
