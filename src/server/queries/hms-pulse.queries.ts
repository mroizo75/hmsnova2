"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { WIDGET_REGISTRY } from "@/features/dashboard/lib/widget-registry";
import type { UserTenant } from "@prisma/client";

function resolveActiveTenantId(
  tenantMemberships: UserTenant[],
  sessionTenantId?: string
): string | null {
  if (sessionTenantId) {
    const hasMembership = tenantMemberships.some((membership) => membership.tenantId === sessionTenantId);
    if (!hasMembership) return null;
    return sessionTenantId;
  }
  return tenantMemberships[0]?.tenantId ?? null;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export async function fetchHmsPulseData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) return null;

  const tenantId = resolveActiveTenantId(
    user.tenants,
    (session.user as { tenantId?: string }).tenantId
  );
  if (!tenantId) return null;

  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const [
    risks,
    incidents,
    measures,
    trainings,
    documents,
    audits,
    inspections,
    formTemplates,
    formSubmissionCounts,
    recentFormSubmissions,
  ] = await Promise.all([
    prisma.risk.findMany({ where: { tenantId } }),
    prisma.incident.findMany({ where: { tenantId } }),
    prisma.measure.findMany({ where: { tenantId } }),
    prisma.training.findMany({ where: { tenantId } }),
    prisma.document.findMany({ where: { tenantId } }),
    prisma.audit.findMany({ where: { tenantId } }),
    prisma.inspection.findMany({ where: { tenantId } }),
    prisma.formTemplate.findMany({
      where: {
        OR: [{ tenantId }, { isGlobal: true }],
        isActive: true,
      },
      select: { id: true, title: true, description: true },
      orderBy: { title: "asc" },
      take: 200,
    }),
    prisma.formSubmission.groupBy({
      by: ["formTemplateId"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.formSubmission.findMany({
      where: { tenantId },
      include: { formTemplate: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const criticalRisks = risks.filter((risk) => (risk.score ?? 0) >= 15).length;
  const openIncidents = incidents.filter(
    (incident) => incident.status === "OPEN" || incident.status === "INVESTIGATING"
  ).length;
  const overdueMeasures = measures.filter(
    (measure) => measure.status !== "DONE" && new Date(measure.dueAt) < now
  ).length;
  const completedMeasures = measures.filter((measure) => measure.status === "DONE").length;
  const measureCompletionRate =
    measures.length > 0 ? Math.round((completedMeasures / measures.length) * 100) : 100;
  const expiredTraining = trainings.filter(
    (training) => training.validUntil && new Date(training.validUntil) < now && !training.completedAt
  ).length;
  const approvedDocuments = documents.filter((document) => document.status === "APPROVED").length;
  const documentComplianceRate =
    documents.length > 0 ? Math.round((approvedDocuments / documents.length) * 100) : 100;
  const upcomingAudits = audits.filter(
    (audit) =>
      audit.status !== "COMPLETED" &&
      new Date(audit.scheduledDate) >= now &&
      new Date(audit.scheduledDate) <= sevenDaysFromNow
  ).length;
  const openInspections = inspections.filter((inspection) => inspection.status !== "COMPLETED").length;
  const recentFormsCount = recentFormSubmissions.length;

  const pulseScore = clamp(
    Math.round(
      100 -
        criticalRisks * 4 -
        openIncidents * 3 -
        overdueMeasures * 4 -
        expiredTraining * 3 -
        Math.max(0, 80 - measureCompletionRate) * 0.4 -
        Math.max(0, 80 - documentComplianceRate) * 0.2
    )
  );

  const pulseLevel =
    pulseScore >= 80 ? "god" : pulseScore >= 60 ? "må følges opp" : "kritisk oppfølging";
  const pulseBadgeClassName =
    pulseScore >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : pulseScore >= 60
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";

  const functionOptions = WIDGET_REGISTRY.filter((item) => item.href.trim().length > 0).map((item) => ({
    label: item.label,
    href: item.href,
  }));
  const formOptions = formTemplates.map((template) => ({
    label: template.title,
    href: `/dashboard/wellbeing`,
  }));

  const complianceStatus = [
    { key: "riskAssessment", label: "Kritiske", value: String(criticalRisks), severity: criticalRisks > 0 ? "critical" : "ok" },
    { key: "incidents", label: "Åpne avvik", value: String(openIncidents), severity: openIncidents > 0 ? "warning" : "ok" },
    { key: "formsLatest", label: "Siste innsendinger", value: String(recentFormsCount), severity: recentFormsCount > 0 ? "ok" : "warning" },
    { key: "inspections", label: "Åpne", value: String(openInspections), severity: openInspections > 0 ? "warning" : "ok" },
    { key: "measures", label: "Forfalte", value: String(overdueMeasures), severity: overdueMeasures > 0 ? "critical" : "ok" },
    { key: "training", label: "Utgått", value: String(expiredTraining), severity: expiredTraining > 0 ? "warning" : "ok" },
    { key: "documents", label: "Godkjente", value: `${approvedDocuments}/${documents.length}`, severity: documentComplianceRate < 80 ? "warning" : "ok" },
    { key: "audits", label: "Neste 7 dager", value: String(upcomingAudits), severity: upcomingAudits > 0 ? "warning" : "ok" },
  ];

  const formSubmissionCountByTemplateId = new Map<string, number>(
    formSubmissionCounts.map((entry) => [entry.formTemplateId, entry._count._all])
  );
  const activeMeasures = measures.filter((measure) => measure.status !== "DONE").length;
  const activeAudits = audits.filter((audit) => audit.status !== "COMPLETED").length;

  const itemCountByHref: Record<string, number> = {
    "/dashboard/risks": risks.length,
    "/dashboard/incidents": openIncidents,
    "/dashboard/actions": activeMeasures,
    "/dashboard/training": trainings.filter((training) => !training.completedAt).length,
    "/dashboard/documents": documents.length,
    "/dashboard/audits": activeAudits,
    "/dashboard/inspections": openInspections,
    "/dashboard/wellbeing": formTemplates.length,
  };

  for (const form of formTemplates) {
    itemCountByHref[`/dashboard/wellbeing`] =
      (itemCountByHref[`/dashboard/wellbeing`] ?? 0) + (formSubmissionCountByTemplateId.get(form.id) ?? 0);
  }

  return JSON.parse(JSON.stringify({
    pulseScore,
    pulseLevel,
    pulseBadgeClassName,
    criticalRisks,
    openIncidents,
    overdueMeasures,
    expiredTraining,
    completedMeasures,
    measureCompletionRate,
    approvedDocuments,
    documentComplianceRate,
    upcomingAudits,
    openInspections,
    complianceStatus,
    functionOptions,
    formOptions,
    itemCountByHref,
    recentFormSubmissions,
    measuresTotal: measures.length,
    documentsTotal: documents.length,
  }));
}
