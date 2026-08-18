import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey, logApiRequest } from "@/lib/intelligence-api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startTime = Date.now();
  const authResult = await validateApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  const snapshots = await prisma.industrySnapshot.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["industry"],
    select: {
      industry: true,
      period: true,
      tenantCount: true,
      employeeCount: true,
      createdAt: true,
    },
  });

  const industries = snapshots.map((s) => ({
    industry: s.industry,
    latestPeriod: s.period,
    tenantCount: s.tenantCount,
    employeeCount: s.employeeCount,
    lastUpdated: s.createdAt.toISOString(),
  }));

  await logApiRequest(authResult.apiKeyId, "/v1/industries", null, startTime);

  return NextResponse.json({ industries });
}
