/**
 * Tenant-varselmotor - systematisk HMS-etterlevelse (IK-HMS § 5: systematisk oppfølging).
 *
 * Ren regelmotor (ingen AI) som evaluerer faktiske DB-tellinger og returnerer en
 * prioritert liste med varsler tenanten bør følge opp. Brukes på dashbordets
 * oversiktsside (widget) - komplementerer, men erstatter ikke, det personlige
 * oppgavesenteret (task-center.tsx).
 */

import { addMonths } from "date-fns";
import { prisma } from "@/lib/db";

export type TenantAlertSeverity = "critical" | "warning";

export interface TenantAlert {
  id: string;
  severity: TenantAlertSeverity;
  title: string;
  description: string;
  count: number;
  href: string;
}

// AML § 3-1 / § 3-1 (2) f: krever systematisk HMS-arbeid; virksomheter med ≥10 ansatte
// skal ha verneombud (AML § 6-1). Vi varsler uansett størrelse - bevisstgjøring, ikke straff.
const HIGH_RISK_SCORE_THRESHOLD = 15; // sannsynlighet × konsekvens på 5x5-skala

function severityRank(severity: TenantAlertSeverity): number {
  return severity === "critical" ? 0 : 1;
}

/**
 * Evaluerer alle tenant-varsler basert på faktiske databasetellinger.
 * Sortert etter alvorlighet (kritisk først), deretter etter antall (høyest først).
 */
export async function evaluateTenantAlerts(tenantId: string): Promise<TenantAlert[]> {
  const now = new Date();
  const alerts: TenantAlert[] = [];

  const [
    overdueMeasuresCount,
    openHighScoreRisks,
    expiredSdsCount,
    tenant,
    hmsRoleCount,
    verneombudRoleCount,
    latestCompletedReview,
  ] = await Promise.all([
    prisma.measure.count({
      where: { tenantId, dueAt: { lt: now }, status: { not: "DONE" } },
    }),
    prisma.risk.findMany({
      where: {
        tenantId,
        status: { in: ["OPEN", "MITIGATING"] },
        score: { gte: HIGH_RISK_SCORE_THRESHOLD },
      },
      select: { id: true, measures: { select: { id: true } } },
    }),
    prisma.chemical.count({
      where: { tenantId, status: "ACTIVE", nextReviewDate: { lt: now } },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { managementReviewFrequencyMonths: true, createdAt: true },
    }),
    prisma.userTenant.count({ where: { tenantId, role: "HMS" } }),
    prisma.userTenant.count({ where: { tenantId, role: "VERNEOMBUD" } }),
    prisma.managementReview.findFirst({
      where: { tenantId, status: { in: ["COMPLETED", "APPROVED"] } },
      orderBy: { reviewDate: "desc" },
      select: { reviewDate: true },
    }),
  ]);

  const highRiskWithoutMeasureCount = openHighScoreRisks.filter(
    (risk) => risk.measures.length === 0
  ).length;

  if (overdueMeasuresCount > 0) {
    alerts.push({
      id: "overdue-measures",
      severity: "critical",
      title: `${overdueMeasuresCount} forfalte tiltak`,
      description: "Tiltak har passert fristen uten å være markert som utført.",
      count: overdueMeasuresCount,
      href: "/dashboard/actions",
    });
  }

  if (highRiskWithoutMeasureCount > 0) {
    alerts.push({
      id: "high-risk-without-measure",
      severity: "critical",
      title: `${highRiskWithoutMeasureCount} høyrisiko uten tiltak`,
      description: `Åpne risikoer med score ≥ ${HIGH_RISK_SCORE_THRESHOLD} mangler koblet tiltak (AML § 3-1).`,
      count: highRiskWithoutMeasureCount,
      href: "/dashboard/risks",
    });
  }

  if (expiredSdsCount > 0) {
    alerts.push({
      id: "expired-sds",
      severity: "warning",
      title: `${expiredSdsCount} utløpt sikkerhetsdatablad`,
      description: "Kjemikalier har sikkerhetsdatablad som må revideres.",
      count: expiredSdsCount,
      href: "/dashboard/chemicals",
    });
  }

  const missingRoles: string[] = [];
  if (hmsRoleCount === 0) missingRoles.push("HMS-ansvarlig");
  if (verneombudRoleCount === 0) missingRoles.push("verneombud");
  if (missingRoles.length > 0) {
    alerts.push({
      id: "unfilled-roles",
      severity: "warning",
      title: `Mangler ${missingRoles.join(" og ")}`,
      description: "AML § 6-1 og § 3-1 forutsetter at rollene er besatt for systematisk HMS-arbeid.",
      count: missingRoles.length,
      href: "/dashboard/brukere",
    });
  }

  const frequencyMonths = tenant?.managementReviewFrequencyMonths ?? 12;
  const baselineDate = latestCompletedReview?.reviewDate ?? tenant?.createdAt ?? now;
  const nextDueDate = addMonths(baselineDate, frequencyMonths);
  if (nextDueDate < now) {
    alerts.push({
      id: "management-review-overdue",
      severity: "warning",
      title: "Ledelsens gjennomgang er forfalt",
      description: `Siste gjennomgang var for mer enn ${frequencyMonths} måneder siden (IK-HMS § 5 nr. 8).`,
      count: 1,
      href: "/dashboard/management-reviews",
    });
  }

  return alerts.sort((a, b) => {
    const rankDiff = severityRank(a.severity) - severityRank(b.severity);
    if (rankDiff !== 0) return rankDiff;
    return b.count - a.count;
  });
}
