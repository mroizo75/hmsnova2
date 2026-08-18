"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export interface BenchmarkData {
  tenantScore: {
    overallScore: number;
    riskScore: number;
    complianceScore: number;
    trendDirection: string;
    incidentScore: number;
    trainingScore: number;
    measureScore: number;
    inspectionScore: number;
    industryPercentile: number | null;
    factors: Record<string, unknown>;
    period: string;
  } | null;
  industrySnapshot: {
    industry: string;
    period: string;
    tenantCount: number;
    incidentCount: number;
    trir: number | null;
    avgMttr: number | null;
    trainingComplianceRate: number | null;
    measuresCompleted: number;
    measuresTotal: number;
    risksOpenCount: number;
  } | null;
  isOptedIn: boolean;
  industryLabel: string;
}

const INDUSTRY_LABELS: Record<string, string> = {
  construction: "Bygg og anlegg",
  elektro: "Elektro og energi",
  offshore: "Offshore og petroleum",
  marine: "Maritime og sjofart",
  oil_gas: "Olje og gass",
  fiskeri: "Fiskeri og havbruk",
  bergverk: "Bergverk og gruvedrift",
  healthcare: "Helsevesen",
  manufacturing: "Industri og produksjon",
  retail: "Handel og service",
  transport: "Transport og logistikk",
  hospitality: "Hotell og restaurant",
  education: "Utdanning",
  technology: "Teknologi og IT",
  agriculture: "Landbruk",
  other: "Annet",
};

export async function getTenantBenchmark(): Promise<BenchmarkData> {
  const { tenantId } = await getRequiredTenantContext();

  const [consent, tenant] = await Promise.all([
    prisma.intelligenceConsent.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { industry: true } }),
  ]);

  const isOptedIn = consent?.optedIn ?? true;
  const industry = tenant?.industry || "other";
  const industryLabel = INDUSTRY_LABELS[industry] || industry;

  if (!isOptedIn) {
    return { tenantScore: null, industrySnapshot: null, isOptedIn, industryLabel };
  }

  const [latestScore, latestSnapshot] = await Promise.all([
    prisma.tenantIntelligenceScore.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.industrySnapshot.findFirst({
      where: { industry, periodType: "MONTHLY" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    tenantScore: latestScore
      ? {
          overallScore: latestScore.overallScore,
          riskScore: latestScore.riskScore,
          complianceScore: latestScore.complianceScore,
          trendDirection: latestScore.trendDirection,
          incidentScore: latestScore.incidentScore,
          trainingScore: latestScore.trainingScore,
          measureScore: latestScore.measureScore,
          inspectionScore: latestScore.inspectionScore,
          industryPercentile: latestScore.industryPercentile,
          factors: latestScore.factors as Record<string, unknown>,
          period: latestScore.period,
        }
      : null,
    industrySnapshot: latestSnapshot
      ? {
          industry: latestSnapshot.industry,
          period: latestSnapshot.period,
          tenantCount: latestSnapshot.tenantCount,
          incidentCount: latestSnapshot.incidentCount,
          trir: latestSnapshot.trir,
          avgMttr: latestSnapshot.avgMttr,
          trainingComplianceRate: latestSnapshot.trainingComplianceRate,
          measuresCompleted: latestSnapshot.measuresCompleted,
          measuresTotal: latestSnapshot.measuresTotal,
          risksOpenCount: latestSnapshot.risksOpenCount,
        }
      : null,
    isOptedIn,
    industryLabel,
  };
}
