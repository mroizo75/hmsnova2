import { prisma } from "@/lib/db";
import { type TenantDataBucket } from "./anonymizer";
import { predictRisk } from "./risk-predictor";
import { getCurrentPeriod } from "./metrics";

interface ScoreResult {
  tenantId: string;
  overallScore: number;
  riskScore: number;
  complianceScore: number;
  trendDirection: "IMPROVING" | "STABLE" | "DECLINING";
  incidentScore: number;
  trainingScore: number;
  measureScore: number;
  inspectionScore: number;
  industryPercentile: number | null;
  factors: Record<string, unknown>;
}

/**
 * Beregner TenantIntelligenceScore for alle opted-in tenants.
 * Lagrer resultatet i databasen.
 */
export async function computeAndStoreTenantScores(buckets: TenantDataBucket[]): Promise<number> {
  if (buckets.length === 0) return 0;

  const { quarterly } = getCurrentPeriod();

  const scoresByIndustry = new Map<string, ScoreResult[]>();
  const allScores: ScoreResult[] = [];

  for (const bucket of buckets) {
    const score = computeScore(bucket);
    allScores.push(score);

    const industryScores = scoresByIndustry.get(bucket.industry) ?? [];
    industryScores.push(score);
    scoresByIndustry.set(bucket.industry, industryScores);
  }

  for (const [, industryScores] of scoresByIndustry) {
    const sorted = [...industryScores].sort((a, b) => a.overallScore - b.overallScore);
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].industryPercentile = Math.round((i / (sorted.length - 1 || 1)) * 100);
    }
  }

  let stored = 0;
  for (const score of allScores) {
    await prisma.tenantIntelligenceScore.upsert({
      where: {
        tenantId_period: {
          tenantId: score.tenantId,
          period: quarterly,
        },
      },
      create: {
        tenantId: score.tenantId,
        period: quarterly,
        overallScore: score.overallScore,
        riskScore: score.riskScore,
        complianceScore: score.complianceScore,
        trendDirection: score.trendDirection,
        incidentScore: score.incidentScore,
        trainingScore: score.trainingScore,
        measureScore: score.measureScore,
        inspectionScore: score.inspectionScore,
        industryPercentile: score.industryPercentile,
        factors: score.factors,
      },
      update: {
        overallScore: score.overallScore,
        riskScore: score.riskScore,
        complianceScore: score.complianceScore,
        trendDirection: score.trendDirection,
        incidentScore: score.incidentScore,
        trainingScore: score.trainingScore,
        measureScore: score.measureScore,
        inspectionScore: score.inspectionScore,
        industryPercentile: score.industryPercentile,
        factors: score.factors,
      },
    });
    stored++;
  }

  return stored;
}

function computeScore(bucket: TenantDataBucket): ScoreResult {
  const prediction = predictRisk(bucket);

  const incidentScore = computeIncidentScore(bucket);
  const trainingScore = computeTrainingScore(bucket);
  const measureScore = computeMeasureScore(bucket);
  const inspectionScore = computeInspectionScore(bucket);

  const complianceScore = Math.round(
    (incidentScore * 0.3 + trainingScore * 0.25 + measureScore * 0.25 + inspectionScore * 0.2),
  );

  const overallScore = Math.round(
    complianceScore * 0.6 + (100 - prediction.riskScore) * 0.4,
  );

  const trendDirection = determineTrend(bucket);

  return {
    tenantId: bucket.tenantId,
    overallScore: Math.max(0, Math.min(100, overallScore)),
    riskScore: prediction.riskScore,
    complianceScore: Math.max(0, Math.min(100, complianceScore)),
    trendDirection,
    incidentScore,
    trainingScore,
    measureScore,
    inspectionScore,
    industryPercentile: null,
    factors: {
      riskFactors: prediction.factors,
      incidentRate: bucket.employeeCount > 0 ? bucket.incidents.total / bucket.employeeCount : 0,
      mttr: bucket.incidents.avgMttrDays,
    },
  };
}

function computeIncidentScore(bucket: TenantDataBucket): number {
  let score = 100;

  if (bucket.employeeCount > 0) {
    const rate = (bucket.incidents.total / bucket.employeeCount) * 100;
    score -= Math.min(40, rate * 2);
  }

  const severe = Object.entries(bucket.incidents.bySeverity)
    .filter(([sev]) => parseInt(sev) >= 4)
    .reduce((sum, [, count]) => sum + count, 0);
  score -= Math.min(30, severe * 10);

  if (bucket.incidents.avgMttrDays != null) {
    if (bucket.incidents.avgMttrDays > 30) score -= 20;
    else if (bucket.incidents.avgMttrDays > 14) score -= 10;
  }

  return Math.max(0, Math.round(score));
}

function computeTrainingScore(bucket: TenantDataBucket): number {
  if (bucket.training.complianceRate == null) return 50;
  return Math.max(0, Math.min(100, Math.round(bucket.training.complianceRate)));
}

function computeMeasureScore(bucket: TenantDataBucket): number {
  if (bucket.measures.total === 0) return 60;

  const completionRate = (bucket.measures.completed / bucket.measures.total) * 100;
  let score = completionRate;

  if (bucket.measures.avgDaysToComplete != null && bucket.measures.avgDaysToComplete > 30) {
    score -= Math.min(20, (bucket.measures.avgDaysToComplete - 30) * 0.5);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeInspectionScore(bucket: TenantDataBucket): number {
  if (bucket.inspections.count === 0) return 30;

  let score = 70;

  if (bucket.inspections.count >= 4) score += 15;
  else if (bucket.inspections.count >= 2) score += 10;

  if (bucket.inspections.findingsAvgSeverity != null) {
    if (bucket.inspections.findingsAvgSeverity > 3) score -= 15;
    else if (bucket.inspections.findingsAvgSeverity < 2) score += 15;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function determineTrend(bucket: TenantDataBucket): "IMPROVING" | "STABLE" | "DECLINING" {
  let positiveSignals = 0;
  let negativeSignals = 0;

  if (bucket.measures.total > 0) {
    const rate = bucket.measures.completed / bucket.measures.total;
    if (rate >= 0.7) positiveSignals++;
    if (rate < 0.3) negativeSignals++;
  }

  if (bucket.training.complianceRate != null) {
    if (bucket.training.complianceRate >= 80) positiveSignals++;
    if (bucket.training.complianceRate < 50) negativeSignals++;
  }

  if (bucket.inspections.count >= 2) positiveSignals++;
  if (bucket.inspections.count === 0) negativeSignals++;

  if (positiveSignals > negativeSignals + 1) return "IMPROVING";
  if (negativeSignals > positiveSignals + 1) return "DECLINING";
  return "STABLE";
}
