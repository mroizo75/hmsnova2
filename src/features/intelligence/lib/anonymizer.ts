import { K_ANONYMITY_THRESHOLD } from "./metrics";

export interface TenantDataBucket {
  tenantId: string;
  industry: string;
  employeeCount: number;
  incidents: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    avgMttrDays: number | null;
    trir: number | null;
    ltir: number | null;
  };
  risks: {
    openCount: number;
    avgScore: number | null;
    byCategory: Record<string, number>;
  };
  measures: {
    total: number;
    completed: number;
    avgDaysToComplete: number | null;
  };
  training: {
    complianceRate: number | null;
    expiredCount: number;
  };
  inspections: {
    count: number;
    findingsAvgSeverity: number | null;
  };
  chemicals: {
    highRiskCount: number;
  };
}

export interface AnonymizedIndustryData {
  industry: string;
  tenantCount: number;
  employeeCount: number;
  incidents: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    avgMttr: number | null;
    trir: number | null;
    ltir: number | null;
  };
  risks: {
    openCount: number;
    avgScore: number | null;
    byCategory: Record<string, number>;
  };
  measures: {
    total: number;
    completed: number;
    avgDaysToComplete: number | null;
  };
  training: {
    complianceRate: number | null;
    expiredCount: number;
  };
  inspections: {
    count: number;
    findingsAvgSeverity: number | null;
  };
  chemicals: {
    highRiskCount: number;
  };
}

/**
 * Aggregerer per-tenant data til anonymisert bransjestatistikk.
 * Bransjer med < K_ANONYMITY_THRESHOLD tenants filtreres ut.
 */
export function anonymizeByIndustry(
  buckets: TenantDataBucket[],
): AnonymizedIndustryData[] {
  const grouped = new Map<string, TenantDataBucket[]>();

  for (const bucket of buckets) {
    const key = bucket.industry || "other";
    const existing = grouped.get(key) ?? [];
    existing.push(bucket);
    grouped.set(key, existing);
  }

  const results: AnonymizedIndustryData[] = [];

  for (const [industry, tenants] of grouped) {
    if (tenants.length < K_ANONYMITY_THRESHOLD) continue;

    const employeeCount = tenants.reduce((sum, t) => sum + (t.employeeCount || 0), 0);

    const incidentsByType: Record<string, number> = {};
    const incidentsBySeverity: Record<string, number> = {};
    let totalIncidents = 0;
    const mttrValues: number[] = [];
    const trirValues: number[] = [];
    const ltirValues: number[] = [];

    const risksByCategory: Record<string, number> = {};
    let totalRisksOpen = 0;
    const riskScores: number[] = [];

    let totalMeasures = 0;
    let completedMeasures = 0;
    const measureDays: number[] = [];

    const complianceRates: number[] = [];
    let totalExpiredTraining = 0;

    let totalInspections = 0;
    const severities: number[] = [];

    let totalHighRiskChemicals = 0;

    for (const t of tenants) {
      totalIncidents += t.incidents.total;
      for (const [type, count] of Object.entries(t.incidents.byType)) {
        incidentsByType[type] = (incidentsByType[type] || 0) + count;
      }
      for (const [sev, count] of Object.entries(t.incidents.bySeverity)) {
        incidentsBySeverity[sev] = (incidentsBySeverity[sev] || 0) + count;
      }
      if (t.incidents.avgMttrDays != null) mttrValues.push(t.incidents.avgMttrDays);
      if (t.incidents.trir != null) trirValues.push(t.incidents.trir);
      if (t.incidents.ltir != null) ltirValues.push(t.incidents.ltir);

      totalRisksOpen += t.risks.openCount;
      if (t.risks.avgScore != null) riskScores.push(t.risks.avgScore);
      for (const [cat, count] of Object.entries(t.risks.byCategory)) {
        risksByCategory[cat] = (risksByCategory[cat] || 0) + count;
      }

      totalMeasures += t.measures.total;
      completedMeasures += t.measures.completed;
      if (t.measures.avgDaysToComplete != null) measureDays.push(t.measures.avgDaysToComplete);

      if (t.training.complianceRate != null) complianceRates.push(t.training.complianceRate);
      totalExpiredTraining += t.training.expiredCount;

      totalInspections += t.inspections.count;
      if (t.inspections.findingsAvgSeverity != null) severities.push(t.inspections.findingsAvgSeverity);

      totalHighRiskChemicals += t.chemicals.highRiskCount;
    }

    results.push({
      industry,
      tenantCount: tenants.length,
      employeeCount,
      incidents: {
        total: totalIncidents,
        byType: incidentsByType,
        bySeverity: incidentsBySeverity,
        avgMttr: avg(mttrValues),
        trir: avg(trirValues),
        ltir: avg(ltirValues),
      },
      risks: {
        openCount: totalRisksOpen,
        avgScore: avg(riskScores),
        byCategory: risksByCategory,
      },
      measures: {
        total: totalMeasures,
        completed: completedMeasures,
        avgDaysToComplete: avg(measureDays),
      },
      training: {
        complianceRate: avg(complianceRates),
        expiredCount: totalExpiredTraining,
      },
      inspections: {
        count: totalInspections,
        findingsAvgSeverity: avg(severities),
      },
      chemicals: {
        highRiskCount: totalHighRiskChemicals,
      },
    });
  }

  return results;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
