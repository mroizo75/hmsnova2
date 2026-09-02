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

  const [openIncidents, overdueRoutines, oldRiskAssessments, openWhistleblowing] = await Promise.all([
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
    Promise.resolve([] as Array<{ tenantId: string; _count: number }>),
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

  for (const item of openWhistleblowing) {
    if (item._count > 0) {
      const name = tenantMap.get(item.tenantId) ?? "Ukjent";
      alerts.push({
        tenantId: item.tenantId,
        tenantName: name,
        type: item._count >= 3 ? "critical" : "warning",
        message: `${item._count} varslingssak${item._count !== 1 ? "er" : ""} venter behandling`,
        category: "whistleblowing",
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
    openWhistleblowing,
    totalWhistleblowing,
  ] = await Promise.all([
    prisma.userTenant.count({ where: { tenantId: { in: tenantIds } } }),
    prisma.incident.count({ where: { tenantId: { in: tenantIds }, occurredAt: { gte: twelveMonthsAgo } } }),
    prisma.incident.count({ where: { tenantId: { in: tenantIds }, status: { in: ["OPEN", "INVESTIGATING"] } } }),
    prisma.routine.count({ where: { tenantId: { in: tenantIds }, status: "ACTIVE" } }),
    prisma.riskAssessment.count({ where: { tenantId: { in: tenantIds }, updatedAt: { gte: twelveMonthsAgo } } }),
    prisma.inspection.count({ where: { tenantId: { in: tenantIds }, status: "COMPLETED", scheduledDate: { gte: twelveMonthsAgo } } }),
    Promise.resolve(0),
    Promise.resolve(0),
  ]);

  return {
    totalTenants: tenantIds.length,
    totalEmployees,
    totalIncidents,
    openIncidents,
    totalRoutines,
    totalRiskAssessments,
    completedInspections,
    openWhistleblowing,
    totalWhistleblowing,
  };
}

// ── Psykososialt arbeidsmiljø (GDPR Art. 9 — helseopplysninger) ──────────────

const WELLBEING_MIN_RESPONSES = 5;

// ── Varsling-status per bedrift (aggregert, ingen innholdsdetaljer — GDPR) ──

export async function getGroupWhistleblowingStatus() {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  if (tenantIds.length === 0) return [];

  const tenants = await prisma.corporateGroupTenant.findMany({
    where: { groupId: context.groupId, status: "ACTIVE" },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
  });

  return tenants.map((gt) => ({
    tenantId: gt.tenant.id,
    tenantName: gt.tenant.name,
    channelActive: Boolean(gt.tenant.slug),
    total: 0,
    open: 0,
    resolved: 0,
  }));
}

// ── HMS Årshjul-status per bedrift ──────────────────────────────────────────

export async function getGroupAnnualPlanStatus() {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  if (tenantIds.length === 0) return [];

  const currentYear = new Date().getFullYear();

  const tenants = await prisma.corporateGroupTenant.findMany({
    where: { groupId: context.groupId, status: "ACTIVE" },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          hmsAnnualPlanEnabled: true,
          hmsAnnualPlanConfig: true,
        },
      },
    },
  });

  const completions = await prisma.hmsAnnualPlanCompletion.groupBy({
    by: ["tenantId"],
    where: { tenantId: { in: tenantIds }, year: currentYear },
    _count: true,
  });

  return tenants.map((gt) => {
    const tid = gt.tenant.id;
    const config = gt.tenant.hmsAnnualPlanConfig as Record<string, unknown> | null;
    const totalSteps = config && typeof config === "object"
      ? Object.keys(config).length
      : 12;
    const completedSteps = completions.find((c) => c.tenantId === tid)?._count ?? 0;

    return {
      tenantId: tid,
      tenantName: gt.tenant.name,
      enabled: gt.tenant.hmsAnnualPlanEnabled,
      totalSteps,
      completedSteps,
      progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    };
  });
}

export interface TenantWellbeingOverview {
  tenantId: string;
  tenantName: string;
  totalResponses: number;
  averageScore: number | null;
  sectionScores: Array<{ section: string; average: number }>;
  criticalCount: number;
  lastSurveyDate: Date | null;
}

const SECTION_KEYWORDS: Record<string, string[]> = {
  "Arbeidsbelastning": ["arbeidsmengde", "tid", "stress", "krav"],
  "Rolle og forutsigbarhet": ["forvent", "ansvar", "endring", "forutsigbar"],
  "Sosialt arbeidsmiljø": ["stemning", "respekt", "inkludert", "samarbeid"],
  "Ledelse og støtte": ["støtte", "leder", "tilbakemelding", "konflikt", "rettferdig"],
};

export async function getGroupWellbeingOverview(): Promise<TenantWellbeingOverview[]> {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  if (tenantIds.length === 0) return [];

  await prisma.corporateGroupAuditLog.create({
    data: {
      groupId: context.groupId,
      userId: context.userId,
      action: "VIEW_TENANT_WELLBEING",
      targetType: "group",
      targetId: context.groupId,
    },
  });

  const tenants = await prisma.corporateGroupTenant.findMany({
    where: { groupId: context.groupId, status: "ACTIVE" },
    include: { tenant: { select: { id: true, name: true } } },
  });

  const submissions = await prisma.formSubmission.findMany({
    where: {
      tenantId: { in: tenantIds },
      status: { in: ["SUBMITTED", "APPROVED"] },
      formTemplate: { category: "WELLBEING" },
    },
    select: {
      tenantId: true,
      createdAt: true,
      fieldValues: {
        select: {
          value: true,
          field: { select: { fieldType: true, label: true } },
        },
      },
    },
  });

  const byTenant = new Map<string, typeof submissions>();
  for (const sub of submissions) {
    const arr = byTenant.get(sub.tenantId) ?? [];
    arr.push(sub);
    byTenant.set(sub.tenantId, arr);
  }

  return tenants.map((gt) => {
    const tid = gt.tenant.id;
    const tenantSubs = byTenant.get(tid) ?? [];
    const totalResponses = tenantSubs.length;

    if (totalResponses < WELLBEING_MIN_RESPONSES) {
      return {
        tenantId: tid,
        tenantName: gt.tenant.name,
        totalResponses,
        averageScore: null,
        sectionScores: [],
        criticalCount: 0,
        lastSurveyDate: tenantSubs.length > 0
          ? tenantSubs.reduce((latest, s) => (s.createdAt > latest ? s.createdAt : latest), tenantSubs[0].createdAt)
          : null,
      };
    }

    const allLikert: number[] = [];
    const sectionValues: Record<string, number[]> = {};
    let criticalCount = 0;

    for (const sub of tenantSubs) {
      let hasCritical = false;
      for (const fv of sub.fieldValues) {
        if (fv.field.fieldType === "LIKERT_SCALE" && fv.value) {
          const num = parseInt(fv.value, 10);
          if (num > 0 && num <= 5) {
            allLikert.push(num);
            const label = fv.field.label.toLowerCase();
            for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
              if (keywords.some((kw) => label.includes(kw))) {
                (sectionValues[section] ??= []).push(num);
                break;
              }
            }
          }
        }
        if (fv.field.fieldType === "RADIO" && fv.value && fv.value !== "Aldri") {
          hasCritical = true;
        }
      }
      if (hasCritical) criticalCount++;
    }

    const averageScore = allLikert.length > 0
      ? parseFloat((allLikert.reduce((a, b) => a + b, 0) / allLikert.length).toFixed(1))
      : null;

    const sectionScores = Object.entries(sectionValues).map(([section, vals]) => ({
      section,
      average: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
    }));

    const lastSurveyDate = tenantSubs.reduce(
      (latest, s) => (s.createdAt > latest ? s.createdAt : latest),
      tenantSubs[0].createdAt,
    );

    return {
      tenantId: tid,
      tenantName: gt.tenant.name,
      totalResponses,
      averageScore,
      sectionScores,
      criticalCount,
      lastSurveyDate,
    };
  });
}

// ── Konsern HMS-årsrapport ───────────────────────────────────────────────────

export interface GroupAnnualReportData {
  year: number;
  groupName: string;
  groupOrgNumber: string | null;
  groupLogo: string | null;
  generatedAt: Date;
  summary: {
    totalTenants: number;
    totalEmployees: number;
    averageHmsScore: number;
    totalIncidents: number;
    openIncidents: number;
  };
  tenantScores: TenantComplianceScore[];
  incidentStats: {
    byType: Array<{ type: string; _count: number }>;
    trend: IncidentTrendPoint[];
    totals: { open: number; closed: number; total: number };
  };
  trainingStatus: Array<{
    tenantName: string;
    employees: number;
    validCourses: number;
    expiredCourses: number;
  }>;
  inspectionStatus: Array<{
    tenantName: string;
    completedCount: number;
    plannedCount: number;
    lastCompletedDate: Date | null;
  }>;
  wellbeing: TenantWellbeingOverview[];
  alerts: GroupAlert[];
}

export async function generateGroupAnnualReport(year: number): Promise<GroupAnnualReportData> {
  const context = await requireCorporateGroupContext();

  const group = await prisma.corporateGroup.findUniqueOrThrow({
    where: { id: context.groupId },
    select: { name: true, orgNumber: true, logo: true },
  });

  const [
    scores,
    incidentStats,
    trainingStatus,
    inspectionStatus,
    wellbeing,
    overview,
    alerts,
  ] = await Promise.all([
    getGroupComplianceScores(),
    getGroupIncidentStats(),
    getGroupTrainingStatus(),
    getGroupInspectionStatus(),
    getGroupWellbeingOverview(),
    getGroupOverviewStats(),
    getGroupAlerts(),
  ]);

  const averageHmsScore = scores.length > 0
    ? Math.round(scores.reduce((s, t) => s + t.overallScore, 0) / scores.length)
    : 0;

  await prisma.corporateGroupAuditLog.create({
    data: {
      groupId: context.groupId,
      userId: context.userId,
      action: "GENERATE_REPORT",
      targetType: "report",
      targetId: String(year),
    },
  });

  return {
    year,
    groupName: group.name,
    groupOrgNumber: group.orgNumber,
    groupLogo: group.logo,
    generatedAt: new Date(),
    summary: {
      totalTenants: overview.totalTenants,
      totalEmployees: overview.totalEmployees,
      averageHmsScore,
      totalIncidents: overview.totalIncidents,
      openIncidents: overview.openIncidents,
    },
    tenantScores: scores,
    incidentStats: {
      byType: incidentStats.byType,
      trend: incidentStats.trend,
      totals: incidentStats.totals,
    },
    trainingStatus: trainingStatus.map((t) => ({
      tenantName: t.tenantName,
      employees: t.employees,
      validCourses: t.validCourses,
      expiredCourses: t.expiredCourses,
    })),
    inspectionStatus: inspectionStatus.map((i) => ({
      tenantName: i.tenantName,
      completedCount: i.completedCount,
      plannedCount: i.plannedCount,
      lastCompletedDate: i.lastCompletedDate,
    })),
    wellbeing,
    alerts,
  };
}
