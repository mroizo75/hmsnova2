import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey, logApiRequest, checkPermission } from "@/lib/intelligence-api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ industry: string }> },
) {
  const startTime = Date.now();
  const authResult = await validateApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  const { industry } = await params;

  const permCheck = checkPermission(authResult, industry);
  if (permCheck) return permCheck;

  const url = new URL(request.url);
  const months = Math.min(parseInt(url.searchParams.get("months") || "12"), 24);

  const trends = await prisma.trendDataPoint.findMany({
    where: { industry },
    orderBy: { period: "desc" },
    take: months * 10,
  });

  const grouped: Record<string, { period: string; metrics: Record<string, { value: number; changePercent: number | null }> }> = {};

  for (const t of trends) {
    if (!grouped[t.period]) {
      grouped[t.period] = { period: t.period, metrics: {} };
    }
    grouped[t.period].metrics[t.metric] = {
      value: t.value,
      changePercent: t.changePercent,
    };
  }

  const data = Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));

  await logApiRequest(authResult.apiKeyId, `/v1/industries/${industry}/trends`, { months }, startTime);

  return NextResponse.json({ industry, periods: data });
}
