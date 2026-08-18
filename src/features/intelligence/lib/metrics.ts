export const INTELLIGENCE_METRICS = [
  "incidents_total",
  "incidents_avvik",
  "incidents_nesten",
  "incidents_ulykke",
  "trir",
  "ltir",
  "avg_mttr_days",
  "risks_open",
  "avg_risk_score",
  "measures_total",
  "measures_completed",
  "measures_completion_rate",
  "avg_measure_days",
  "training_compliance_rate",
  "training_expired",
  "inspections_total",
  "findings_avg_severity",
  "chemicals_high_risk",
] as const;

export type IntelligenceMetric = (typeof INTELLIGENCE_METRICS)[number];

export const K_ANONYMITY_THRESHOLD = 5;

export function getCurrentPeriod(): { monthly: string; quarterly: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const quarter = Math.ceil((now.getMonth() + 1) / 3);

  return {
    monthly: `${year}-${month}`,
    quarterly: `${year}-Q${quarter}`,
  };
}

export function getPreviousPeriod(period: string): string {
  if (period.includes("-Q")) {
    const [yearStr, qStr] = period.split("-Q");
    const year = parseInt(yearStr);
    const q = parseInt(qStr);
    if (q === 1) return `${year - 1}-Q4`;
    return `${year}-Q${q - 1}`;
  }

  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}
