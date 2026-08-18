import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { type TenantDataBucket } from "./anonymizer";

interface TenantContext {
  id: string;
  industry: string | null;
  employeeCount: number | null;
}

/**
 * Samler HMS-data for alle tenants som IKKE eksplisitt har opted-out.
 * Default: alle aktive tenants er med (opt-out modell).
 * Perioden dekker siste 90 dager (brukes for maanedlige/kvartalsvise snapshots).
 */
export async function collectTenantBuckets(): Promise<TenantDataBucket[]> {
  const optedOutTenants = await prisma.intelligenceConsent.findMany({
    where: { optedIn: false },
    select: { tenantId: true },
  });

  const excludeIds = optedOutTenants.map((t) => t.tenantId);

  const tenants = await prisma.tenant.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      id: { notIn: excludeIds.length > 0 ? excludeIds : ["__none__"] },
    },
    select: { id: true, industry: true, employeeCount: true },
  });

  if (tenants.length === 0) return [];

  const activeTenantIds = tenants.map((t) => t.id);
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    incidentData,
    riskData,
    measureData,
    trainingData,
    inspectionData,
    chemicalData,
  ] = await Promise.all([
    collectIncidentData(activeTenantIds, ninetyDaysAgo),
    collectRiskData(activeTenantIds),
    collectMeasureData(activeTenantIds, ninetyDaysAgo),
    collectTrainingData(activeTenantIds),
    collectInspectionData(activeTenantIds, ninetyDaysAgo),
    collectChemicalData(activeTenantIds),
  ]);

  return tenants.map((tenant) => buildBucket(
    tenant,
    incidentData.get(tenant.id),
    riskData.get(tenant.id),
    measureData.get(tenant.id),
    trainingData.get(tenant.id),
    inspectionData.get(tenant.id),
    chemicalData.get(tenant.id),
  ));
}

function buildBucket(
  tenant: TenantContext,
  incidents: IncidentBucket | undefined,
  risks: RiskBucket | undefined,
  measures: MeasureBucket | undefined,
  training: TrainingBucket | undefined,
  inspections: InspectionBucket | undefined,
  chemicals: ChemicalBucket | undefined,
): TenantDataBucket {
  return {
    tenantId: tenant.id,
    industry: tenant.industry || "other",
    employeeCount: tenant.employeeCount || 0,
    incidents: incidents ?? { total: 0, byType: {}, bySeverity: {}, avgMttrDays: null, trir: null, ltir: null },
    risks: risks ?? { openCount: 0, avgScore: null, byCategory: {} },
    measures: measures ?? { total: 0, completed: 0, avgDaysToComplete: null },
    training: training ?? { complianceRate: null, expiredCount: 0 },
    inspections: inspections ?? { count: 0, findingsAvgSeverity: null },
    chemicals: chemicals ?? { highRiskCount: 0 },
  };
}

interface IncidentBucket {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  avgMttrDays: number | null;
  trir: number | null;
  ltir: number | null;
}

async function collectIncidentData(
  tenantIds: string[],
  since: Date,
): Promise<Map<string, IncidentBucket>> {
  const incidents = await prisma.incident.findMany({
    where: { tenantId: { in: tenantIds }, createdAt: { gte: since } },
    select: {
      tenantId: true,
      type: true,
      severity: true,
      createdAt: true,
      closedAt: true,
      isLostTimeIncident: true,
      lostWorkdays: true,
      isFatal: true,
      isRestrictedWork: true,
      isFirstAidCase: true,
    },
  });

  const tenantEmployees = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, employeeCount: true },
  });
  const empMap = new Map(tenantEmployees.map((t) => [t.id, t.employeeCount || 0]));

  const map = new Map<string, IncidentBucket>();

  const grouped = new Map<string, typeof incidents>();
  for (const inc of incidents) {
    const existing = grouped.get(inc.tenantId) ?? [];
    existing.push(inc);
    grouped.set(inc.tenantId, existing);
  }

  for (const [tenantId, incs] of grouped) {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const mttrDays: number[] = [];
    let recordable = 0;
    let lostTimeCount = 0;

    for (const inc of incs) {
      byType[inc.type] = (byType[inc.type] || 0) + 1;
      const sev = String(inc.severity ?? 0);
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;

      if (inc.closedAt && inc.createdAt) {
        const days = (inc.closedAt.getTime() - inc.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        mttrDays.push(days);
      }

      if (inc.isFatal || inc.isLostTimeIncident || inc.isRestrictedWork || inc.isFirstAidCase) {
        recordable++;
      }
      if (inc.isLostTimeIncident) {
        lostTimeCount++;
      }
    }

    const employees = empMap.get(tenantId) || 0;
    const manHours = employees * 2000;
    const trir = manHours > 0 ? (recordable * 200000) / manHours : null;
    const ltir = manHours > 0 ? (lostTimeCount * 200000) / manHours : null;

    map.set(tenantId, {
      total: incs.length,
      byType,
      bySeverity,
      avgMttrDays: mttrDays.length > 0 ? mttrDays.reduce((a, b) => a + b, 0) / mttrDays.length : null,
      trir,
      ltir,
    });
  }

  return map;
}

interface RiskBucket {
  openCount: number;
  avgScore: number | null;
  byCategory: Record<string, number>;
}

async function collectRiskData(tenantIds: string[]): Promise<Map<string, RiskBucket>> {
  const risks = await prisma.risk.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { tenantId: true, status: true, score: true, category: true },
  });

  const map = new Map<string, RiskBucket>();
  const grouped = new Map<string, typeof risks>();

  for (const r of risks) {
    const existing = grouped.get(r.tenantId) ?? [];
    existing.push(r);
    grouped.set(r.tenantId, existing);
  }

  for (const [tenantId, riskList] of grouped) {
    const openStatuses = ["OPEN", "MITIGATING"];
    const openCount = riskList.filter((r) => openStatuses.includes(r.status)).length;
    const scores = riskList.filter((r) => r.score != null).map((r) => r.score!);
    const byCategory: Record<string, number> = {};

    for (const r of riskList) {
      if (r.category) {
        byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      }
    }

    map.set(tenantId, {
      openCount,
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      byCategory,
    });
  }

  return map;
}

interface MeasureBucket {
  total: number;
  completed: number;
  avgDaysToComplete: number | null;
}

async function collectMeasureData(
  tenantIds: string[],
  since: Date,
): Promise<Map<string, MeasureBucket>> {
  const measures = await prisma.measure.findMany({
    where: { tenantId: { in: tenantIds }, createdAt: { gte: since } },
    select: { tenantId: true, status: true, createdAt: true, completedAt: true },
  });

  const map = new Map<string, MeasureBucket>();
  const grouped = new Map<string, typeof measures>();

  for (const m of measures) {
    const existing = grouped.get(m.tenantId) ?? [];
    existing.push(m);
    grouped.set(m.tenantId, existing);
  }

  for (const [tenantId, mList] of grouped) {
    const completed = mList.filter((m) => m.status === "DONE").length;
    const daysList: number[] = [];

    for (const m of mList) {
      if (m.completedAt && m.createdAt) {
        daysList.push((m.completedAt.getTime() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    map.set(tenantId, {
      total: mList.length,
      completed,
      avgDaysToComplete: daysList.length > 0 ? daysList.reduce((a, b) => a + b, 0) / daysList.length : null,
    });
  }

  return map;
}

interface TrainingBucket {
  complianceRate: number | null;
  expiredCount: number;
}

async function collectTrainingData(tenantIds: string[]): Promise<Map<string, TrainingBucket>> {
  const trainings = await prisma.training.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { tenantId: true, validUntil: true, isRequired: true },
  });

  const map = new Map<string, TrainingBucket>();
  const grouped = new Map<string, typeof trainings>();
  const now = new Date();

  for (const t of trainings) {
    const existing = grouped.get(t.tenantId) ?? [];
    existing.push(t);
    grouped.set(t.tenantId, existing);
  }

  for (const [tenantId, tList] of grouped) {
    const requiredTrainings = tList.filter((t) => t.isRequired);
    const expired = requiredTrainings.filter((t) => t.validUntil && t.validUntil < now);
    const valid = requiredTrainings.filter((t) => !t.validUntil || t.validUntil >= now);
    const complianceRate = requiredTrainings.length > 0
      ? (valid.length / requiredTrainings.length) * 100
      : null;

    map.set(tenantId, {
      complianceRate,
      expiredCount: expired.length,
    });
  }

  return map;
}

interface InspectionBucket {
  count: number;
  findingsAvgSeverity: number | null;
}

async function collectInspectionData(
  tenantIds: string[],
  since: Date,
): Promise<Map<string, InspectionBucket>> {
  const inspections = await prisma.inspection.findMany({
    where: { tenantId: { in: tenantIds }, createdAt: { gte: since } },
    select: { id: true, tenantId: true },
  });

  const inspectionIds = inspections.map((i) => i.id);

  const findings = inspectionIds.length > 0
    ? await prisma.inspectionFinding.findMany({
        where: { inspectionId: { in: inspectionIds } },
        select: { severity: true, inspection: { select: { tenantId: true } } },
      })
    : [];

  const map = new Map<string, InspectionBucket>();

  const inspGrouped = new Map<string, number>();
  for (const i of inspections) {
    inspGrouped.set(i.tenantId, (inspGrouped.get(i.tenantId) || 0) + 1);
  }

  const findingsGrouped = new Map<string, number[]>();
  for (const f of findings) {
    const tid = f.inspection.tenantId;
    const existing = findingsGrouped.get(tid) ?? [];
    if (f.severity != null) existing.push(f.severity);
    findingsGrouped.set(tid, existing);
  }

  for (const tenantId of new Set([...inspGrouped.keys(), ...findingsGrouped.keys()])) {
    const count = inspGrouped.get(tenantId) || 0;
    const sevs = findingsGrouped.get(tenantId) || [];

    map.set(tenantId, {
      count,
      findingsAvgSeverity: sevs.length > 0 ? sevs.reduce((a, b) => a + b, 0) / sevs.length : null,
    });
  }

  return map;
}

interface ChemicalBucket {
  highRiskCount: number;
}

async function collectChemicalData(tenantIds: string[]): Promise<Map<string, ChemicalBucket>> {
  const chemicals = await prisma.chemical.findMany({
    where: { tenantId: { in: tenantIds }, status: "ACTIVE" },
    select: { tenantId: true, hazardLevel: true, isCMR: true, isSVHC: true },
  });

  const map = new Map<string, ChemicalBucket>();
  const grouped = new Map<string, typeof chemicals>();

  for (const c of chemicals) {
    const existing = grouped.get(c.tenantId) ?? [];
    existing.push(c);
    grouped.set(c.tenantId, existing);
  }

  for (const [tenantId, cList] of grouped) {
    const highRisk = cList.filter((c) => (c.hazardLevel && c.hazardLevel >= 4) || c.isCMR || c.isSVHC);
    map.set(tenantId, { highRiskCount: highRisk.length });
  }

  return map;
}
