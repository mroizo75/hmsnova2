"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) throw new Error("Forbidden");
  return session.user;
}

export interface IntelligenceDashboardData {
  totalOptedIn: number;
  totalTenants: number;
  coverageByIndustry: { industry: string; count: number; total: number }[];
  latestSnapshots: IndustrySnapshotSummary[];
  globalTrends: TrendPoint[];
  topInsights: Insight[];
}

export interface IndustrySnapshotSummary {
  industry: string;
  period: string;
  tenantCount: number;
  employeeCount: number;
  incidentCount: number;
  trir: number | null;
  avgMttr: number | null;
  trainingComplianceRate: number | null;
  measuresCompleted: number;
  measuresTotal: number;
  risksOpenCount: number;
  highRiskChemicalCount: number;
}

export interface TrendPoint {
  industry: string | null;
  metric: string;
  period: string;
  value: number;
  changePercent: number | null;
}

export interface Insight {
  type: "increase" | "decrease" | "warning" | "positive";
  title: string;
  description: string;
  metric: string;
  industry: string;
  changePercent: number;
}

export async function getIntelligenceDashboard(): Promise<IntelligenceDashboardData | null> {
  await requireSuperAdmin();

  const [optedInCount, totalActive, snapshots, trends] = await Promise.all([
    prisma.intelligenceConsent.count({ where: { optedIn: true } }),
    prisma.tenant.count({ where: { status: { in: ["ACTIVE", "TRIAL"] } } }),
    prisma.industrySnapshot.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.trendDataPoint.findMany({
      orderBy: { period: "desc" },
      take: 200,
    }),
  ]);

  const tenantsWithIndustry = await prisma.tenant.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    select: { id: true, industry: true },
  });

  const optedInTenants = await prisma.intelligenceConsent.findMany({
    where: { optedIn: true },
    select: { tenantId: true },
  });
  const optedInSet = new Set(optedInTenants.map((t) => t.tenantId));

  const industryGroups = new Map<string, { count: number; total: number }>();
  for (const t of tenantsWithIndustry) {
    const ind = t.industry || "other";
    const existing = industryGroups.get(ind) ?? { count: 0, total: 0 };
    existing.total++;
    if (optedInSet.has(t.id)) existing.count++;
    industryGroups.set(ind, existing);
  }

  const coverageByIndustry = Array.from(industryGroups.entries())
    .map(([industry, data]) => ({ industry, ...data }))
    .sort((a, b) => b.total - a.total);

  const latestPeriods = new Set<string>();
  const latestSnapshots: IndustrySnapshotSummary[] = [];

  for (const s of snapshots) {
    const key = `${s.industry}-${s.period}`;
    if (latestPeriods.has(key)) continue;
    latestPeriods.add(key);

    latestSnapshots.push({
      industry: s.industry,
      period: s.period,
      tenantCount: s.tenantCount,
      employeeCount: s.employeeCount,
      incidentCount: s.incidentCount,
      trir: s.trir,
      avgMttr: s.avgMttr,
      trainingComplianceRate: s.trainingComplianceRate,
      measuresCompleted: s.measuresCompleted,
      measuresTotal: s.measuresTotal,
      risksOpenCount: s.risksOpenCount,
      highRiskChemicalCount: s.highRiskChemicalCount,
    });
  }

  const globalTrends: TrendPoint[] = trends.map((t) => ({
    industry: t.industry,
    metric: t.metric,
    period: t.period,
    value: t.value,
    changePercent: t.changePercent,
  }));

  const topInsights = generateInsights(globalTrends, latestSnapshots);

  return {
    totalOptedIn: optedInCount,
    totalTenants: totalActive,
    coverageByIndustry,
    latestSnapshots,
    globalTrends,
    topInsights,
  };
}

function generateInsights(trends: TrendPoint[], snapshots: IndustrySnapshotSummary[]): Insight[] {
  const insights: Insight[] = [];

  const significantChanges = trends
    .filter((t) => t.changePercent != null && Math.abs(t.changePercent!) > 10)
    .sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!));

  for (const change of significantChanges.slice(0, 5)) {
    const isIncrease = change.changePercent! > 0;
    const isNegativeMetric = ["incidents_total", "risks_open", "trir"].includes(change.metric);
    const type = isIncrease && isNegativeMetric ? "warning" : isIncrease ? "positive" : isNegativeMetric ? "positive" : "decrease";

    insights.push({
      type,
      title: formatMetricLabel(change.metric),
      description: `${change.industry || "Alle bransjer"}: ${isIncrease ? "+" : ""}${Math.round(change.changePercent!)}% endring`,
      metric: change.metric,
      industry: change.industry || "all",
      changePercent: change.changePercent!,
    });
  }

  for (const s of snapshots) {
    if (s.trir != null && s.trir > 5) {
      insights.push({
        type: "warning",
        title: "Hoy TRIR",
        description: `${s.industry}: TRIR ${s.trir.toFixed(1)} — over akseptabel terskel`,
        metric: "trir",
        industry: s.industry,
        changePercent: 0,
      });
    }
  }

  return insights.slice(0, 8);
}

function formatMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    incidents_total: "Avvik totalt",
    measures_completed: "Tiltak fullfort",
    risks_open: "Apne risikoer",
    trir: "TRIR",
    training_compliance_rate: "Opplaeringsdekning",
  };
  return labels[metric] || metric;
}

export async function getIndustryDetail(industry: string) {
  await requireSuperAdmin();

  const [snapshots, trends, scores] = await Promise.all([
    prisma.industrySnapshot.findMany({
      where: { industry },
      orderBy: { period: "desc" },
      take: 24,
    }),
    prisma.trendDataPoint.findMany({
      where: { industry },
      orderBy: { period: "desc" },
      take: 100,
    }),
    prisma.tenantIntelligenceScore.findMany({
      where: {
        tenant: { industry },
      },
      orderBy: { period: "desc" },
      take: 50,
      select: {
        period: true,
        overallScore: true,
        riskScore: true,
        complianceScore: true,
        trendDirection: true,
      },
    }),
  ]);

  return { snapshots, trends, scores };
}
