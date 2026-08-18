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

  const snapshot = await prisma.industrySnapshot.findFirst({
    where: { industry },
    orderBy: { createdAt: "desc" },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "No data for this industry" }, { status: 404 });
  }

  await logApiRequest(authResult.apiKeyId, `/v1/industries/${industry}/summary`, null, startTime);

  return NextResponse.json({
    industry: snapshot.industry,
    period: snapshot.period,
    periodType: snapshot.periodType,
    tenantCount: snapshot.tenantCount,
    employeeCount: snapshot.employeeCount,
    incidents: {
      total: snapshot.incidentCount,
      byType: snapshot.incidentsByType,
      bySeverity: snapshot.incidentsBySeverity,
      avgMttrDays: snapshot.avgMttr,
      trir: snapshot.trir,
      ltir: snapshot.ltir,
    },
    risks: {
      openCount: snapshot.risksOpenCount,
      avgScore: snapshot.avgRiskScore,
      byCategory: snapshot.risksByCategory,
    },
    measures: {
      total: snapshot.measuresTotal,
      completed: snapshot.measuresCompleted,
      avgDaysToComplete: snapshot.avgMeasureTime,
      completionRate: snapshot.measuresTotal > 0
        ? Math.round((snapshot.measuresCompleted / snapshot.measuresTotal) * 100)
        : null,
    },
    training: {
      complianceRate: snapshot.trainingComplianceRate,
      expiredCount: snapshot.expiredTrainingCount,
    },
    inspections: {
      count: snapshot.inspectionCount,
      findingsAvgSeverity: snapshot.findingsAvgSeverity,
    },
    chemicals: {
      highRiskCount: snapshot.highRiskChemicalCount,
    },
    lastUpdated: snapshot.createdAt.toISOString(),
  });
}
