import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey, logApiRequest, checkPermission } from "@/lib/intelligence-api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ metric: string }> },
) {
  const startTime = Date.now();
  const authResult = await validateApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  const { metric } = await params;

  const permCheck = checkPermission(authResult, undefined, metric);
  if (permCheck) return permCheck;

  const url = new URL(request.url);
  const period = url.searchParams.get("period");

  const whereClause: { metric: string; period?: string; industry: { not: null } } = {
    metric,
    industry: { not: null },
  };

  if (period) {
    whereClause.period = period;
  }

  const dataPoints = await prisma.trendDataPoint.findMany({
    where: whereClause,
    orderBy: [{ period: "desc" }, { industry: "asc" }],
    take: 100,
  });

  const results = dataPoints.map((d) => ({
    industry: d.industry,
    period: d.period,
    value: d.value,
    previousValue: d.prevValue,
    changePercent: d.changePercent,
  }));

  await logApiRequest(authResult.apiKeyId, `/v1/metrics/${metric}`, { period }, startTime);

  return NextResponse.json({ metric, data: results });
}
