import { type TenantDataBucket } from "./anonymizer";

export interface RiskPrediction {
  riskScore: number; // 0-100 (higher = more risk)
  factors: RiskFactor[];
}

export interface RiskFactor {
  key: string;
  label: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  value: number;
  description: string;
}

/**
 * Heuristisk prediktiv risikoscoring basert paa:
 * - Avvikshistorikk (frekvens, alvorlighet)
 * - Opplaeringsmangler (utlopte kurs)
 * - Tiltaksforsinkelser (andel uferdige)
 * - Risikovurderinger (apne, hoy score)
 * - Inspeksjonsfunn
 *
 * Score 0-100: 0 = minimal risiko, 100 = svart hoy risiko
 * Terskel > 70 = "hoy risiko"
 */
export function predictRisk(bucket: TenantDataBucket): RiskPrediction {
  const factors: RiskFactor[] = [];
  let totalScore = 0;

  const incidentRate = bucket.employeeCount > 0
    ? (bucket.incidents.total / bucket.employeeCount) * 100
    : bucket.incidents.total;

  if (incidentRate > 20) {
    const impact = incidentRate > 50 ? "HIGH" : "MEDIUM";
    const score = Math.min(25, incidentRate * 0.5);
    totalScore += score;
    factors.push({
      key: "incident_rate",
      label: "Avviksfrekvens",
      impact,
      value: Math.round(incidentRate),
      description: `${Math.round(incidentRate)} avvik per 100 ansatte siste 90 dager`,
    });
  }

  const severeIncidents = Object.entries(bucket.incidents.bySeverity)
    .filter(([sev]) => parseInt(sev) >= 4)
    .reduce((sum, [, count]) => sum + count, 0);

  if (severeIncidents > 0) {
    const score = Math.min(20, severeIncidents * 5);
    totalScore += score;
    factors.push({
      key: "severe_incidents",
      label: "Alvorlige hendelser",
      impact: severeIncidents >= 3 ? "HIGH" : "MEDIUM",
      value: severeIncidents,
      description: `${severeIncidents} hendelser med alvorlighetsgrad 4-5`,
    });
  }

  if (bucket.training.complianceRate != null && bucket.training.complianceRate < 80) {
    const gap = 80 - bucket.training.complianceRate;
    const score = Math.min(20, gap * 0.5);
    totalScore += score;
    factors.push({
      key: "training_gap",
      label: "Opplaeringsmangler",
      impact: bucket.training.complianceRate < 50 ? "HIGH" : "MEDIUM",
      value: Math.round(bucket.training.complianceRate),
      description: `Kun ${Math.round(bucket.training.complianceRate)}% opplaeringsdekning (maal: 80%)`,
    });
  }

  if (bucket.measures.total > 0) {
    const incompletionRate = ((bucket.measures.total - bucket.measures.completed) / bucket.measures.total) * 100;
    if (incompletionRate > 40) {
      const score = Math.min(15, incompletionRate * 0.3);
      totalScore += score;
      factors.push({
        key: "measure_delay",
        label: "Tiltaksforsinkelser",
        impact: incompletionRate > 70 ? "HIGH" : "MEDIUM",
        value: Math.round(incompletionRate),
        description: `${Math.round(incompletionRate)}% av tiltak er ufullfort`,
      });
    }
  }

  if (bucket.risks.avgScore != null && bucket.risks.avgScore > 12) {
    const score = Math.min(15, (bucket.risks.avgScore - 12) * 3);
    totalScore += score;
    factors.push({
      key: "high_risk_score",
      label: "Hoy gjennomsnittlig risikoscore",
      impact: bucket.risks.avgScore > 18 ? "HIGH" : "MEDIUM",
      value: Math.round(bucket.risks.avgScore * 10) / 10,
      description: `Gjennomsnittlig risikoscore ${(bucket.risks.avgScore).toFixed(1)} (terskel: 12)`,
    });
  }

  if (bucket.inspections.count === 0) {
    totalScore += 10;
    factors.push({
      key: "no_inspections",
      label: "Ingen inspeksjoner",
      impact: "MEDIUM",
      value: 0,
      description: "Ingen vernerunder/inspeksjoner siste 90 dager",
    });
  }

  if (bucket.chemicals.highRiskCount > 5) {
    const score = Math.min(10, bucket.chemicals.highRiskCount);
    totalScore += score;
    factors.push({
      key: "chemical_risk",
      label: "Hoyrisiko-kjemikalier",
      impact: bucket.chemicals.highRiskCount > 10 ? "HIGH" : "LOW",
      value: bucket.chemicals.highRiskCount,
      description: `${bucket.chemicals.highRiskCount} hoyrisiko-kjemikalier i bruk`,
    });
  }

  return {
    riskScore: Math.min(100, Math.round(totalScore)),
    factors: factors.sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.impact] - order[b.impact];
    }),
  };
}
