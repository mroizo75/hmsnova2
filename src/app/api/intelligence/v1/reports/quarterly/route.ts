import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey, logApiRequest } from "@/lib/intelligence-api-auth";
import { getCurrentPeriod } from "@/features/intelligence/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startTime = Date.now();
  const authResult = await validateApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  const { quarterly } = getCurrentPeriod();

  const url = new URL(request.url);
  const requestedPeriod = url.searchParams.get("period") || quarterly;

  const snapshots = await prisma.industrySnapshot.findMany({
    where: { periodType: "MONTHLY" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const trends = await prisma.trendDataPoint.findMany({
    orderBy: { period: "desc" },
    take: 200,
  });

  const industriesData = new Map<string, typeof snapshots[0]>();
  for (const s of snapshots) {
    if (!industriesData.has(s.industry)) {
      industriesData.set(s.industry, s);
    }
  }

  const totalTenants = Array.from(industriesData.values()).reduce((sum, s) => sum + s.tenantCount, 0);
  const totalEmployees = Array.from(industriesData.values()).reduce((sum, s) => sum + s.employeeCount, 0);
  const totalIncidents = Array.from(industriesData.values()).reduce((sum, s) => sum + s.incidentCount, 0);

  const significantChanges = trends
    .filter((t) => t.changePercent != null && Math.abs(t.changePercent!) > 10)
    .sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!))
    .slice(0, 10)
    .map((t) => ({
      industry: t.industry,
      metric: t.metric,
      period: t.period,
      changePercent: t.changePercent,
      value: t.value,
    }));

  const highRiskIndustries = Array.from(industriesData.values())
    .filter((s) => s.trir != null && s.trir > 3)
    .map((s) => ({
      industry: s.industry,
      trir: s.trir,
      incidentCount: s.incidentCount,
      tenantCount: s.tenantCount,
    }))
    .sort((a, b) => (b.trir ?? 0) - (a.trir ?? 0));

  const report = {
    title: `HMS Nova Safety Intelligence — ${requestedPeriod}`,
    generatedAt: new Date().toISOString(),
    period: requestedPeriod,
    summary: {
      totalIndustries: industriesData.size,
      totalTenants,
      totalEmployees,
      totalIncidents,
    },
    industries: Array.from(industriesData.values()).map((s) => ({
      industry: s.industry,
      tenantCount: s.tenantCount,
      employeeCount: s.employeeCount,
      incidentCount: s.incidentCount,
      trir: s.trir,
      ltir: s.ltir,
      trainingComplianceRate: s.trainingComplianceRate,
      measuresCompletionRate: s.measuresTotal > 0
        ? Math.round((s.measuresCompleted / s.measuresTotal) * 100)
        : null,
    })),
    highlights: significantChanges,
    highRiskIndustries,
  };

  await logApiRequest(authResult.apiKeyId, "/v1/reports/quarterly", { period: requestedPeriod }, startTime);

  return NextResponse.json(report);
}
