import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { collectTenantBuckets } from "@/features/intelligence/lib/snapshot-builder";
import { anonymizeByIndustry } from "@/features/intelligence/lib/anonymizer";
import { getCurrentPeriod, getPreviousPeriod } from "@/features/intelligence/lib/metrics";
import { computeAndStoreTenantScores } from "@/features/intelligence/lib/tenant-scoring";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { monthly, quarterly } = getCurrentPeriod();

  const buckets = await collectTenantBuckets();

  if (buckets.length === 0) {
    return NextResponse.json({ message: "No opted-in tenants", snapshots: 0 });
  }

  const anonymized = anonymizeByIndustry(buckets);

  let snapshotsCreated = 0;
  let trendPointsCreated = 0;

  for (const data of anonymized) {
    await prisma.industrySnapshot.upsert({
      where: {
        industry_period_periodType: {
          industry: data.industry,
          period: monthly,
          periodType: "MONTHLY",
        },
      },
      create: {
        industry: data.industry,
        period: monthly,
        periodType: "MONTHLY",
        tenantCount: data.tenantCount,
        employeeCount: data.employeeCount,
        incidentCount: data.incidents.total,
        incidentsByType: data.incidents.byType,
        incidentsBySeverity: data.incidents.bySeverity,
        avgMttr: data.incidents.avgMttr,
        trir: data.incidents.trir,
        ltir: data.incidents.ltir,
        avgRiskScore: data.risks.avgScore,
        risksByCategory: data.risks.byCategory,
        risksOpenCount: data.risks.openCount,
        measuresTotal: data.measures.total,
        measuresCompleted: data.measures.completed,
        avgMeasureTime: data.measures.avgDaysToComplete,
        trainingComplianceRate: data.training.complianceRate,
        expiredTrainingCount: data.training.expiredCount,
        inspectionCount: data.inspections.count,
        findingsAvgSeverity: data.inspections.findingsAvgSeverity,
        highRiskChemicalCount: data.chemicals.highRiskCount,
      },
      update: {
        tenantCount: data.tenantCount,
        employeeCount: data.employeeCount,
        incidentCount: data.incidents.total,
        incidentsByType: data.incidents.byType,
        incidentsBySeverity: data.incidents.bySeverity,
        avgMttr: data.incidents.avgMttr,
        trir: data.incidents.trir,
        ltir: data.incidents.ltir,
        avgRiskScore: data.risks.avgScore,
        risksByCategory: data.risks.byCategory,
        risksOpenCount: data.risks.openCount,
        measuresTotal: data.measures.total,
        measuresCompleted: data.measures.completed,
        avgMeasureTime: data.measures.avgDaysToComplete,
        trainingComplianceRate: data.training.complianceRate,
        expiredTrainingCount: data.training.expiredCount,
        inspectionCount: data.inspections.count,
        findingsAvgSeverity: data.inspections.findingsAvgSeverity,
        highRiskChemicalCount: data.chemicals.highRiskCount,
      },
    });
    snapshotsCreated++;

    const prevPeriod = getPreviousPeriod(monthly);
    const prevSnapshot = await prisma.industrySnapshot.findUnique({
      where: {
        industry_period_periodType: {
          industry: data.industry,
          period: prevPeriod,
          periodType: "MONTHLY",
        },
      },
    });

    const trendMetrics: { metric: string; value: number }[] = [
      { metric: "incidents_total", value: data.incidents.total },
      { metric: "measures_completed", value: data.measures.completed },
      { metric: "risks_open", value: data.risks.openCount },
    ];

    if (data.incidents.trir != null) {
      trendMetrics.push({ metric: "trir", value: data.incidents.trir });
    }
    if (data.training.complianceRate != null) {
      trendMetrics.push({ metric: "training_compliance_rate", value: data.training.complianceRate });
    }

    for (const tm of trendMetrics) {
      let prevValue: number | null = null;
      if (prevSnapshot) {
        if (tm.metric === "incidents_total") prevValue = prevSnapshot.incidentCount;
        else if (tm.metric === "measures_completed") prevValue = prevSnapshot.measuresCompleted;
        else if (tm.metric === "risks_open") prevValue = prevSnapshot.risksOpenCount;
        else if (tm.metric === "trir") prevValue = prevSnapshot.trir;
        else if (tm.metric === "training_compliance_rate") prevValue = prevSnapshot.trainingComplianceRate;
      }

      const changePercent = prevValue != null && prevValue !== 0
        ? ((tm.value - prevValue) / prevValue) * 100
        : null;

      await prisma.trendDataPoint.upsert({
        where: {
          industry_metric_period: {
            industry: data.industry,
            metric: tm.metric,
            period: monthly,
          },
        },
        create: {
          industry: data.industry,
          metric: tm.metric,
          period: monthly,
          value: tm.value,
          prevValue,
          changePercent,
        },
        update: {
          value: tm.value,
          prevValue,
          changePercent,
        },
      });
      trendPointsCreated++;
    }
  }

  const scoresStored = await computeAndStoreTenantScores(buckets);

  return NextResponse.json({
    message: "Intelligence snapshot completed",
    tenantsProcessed: buckets.length,
    industriesCovered: anonymized.length,
    snapshotsCreated,
    trendPointsCreated,
    scoresStored,
  });
}
