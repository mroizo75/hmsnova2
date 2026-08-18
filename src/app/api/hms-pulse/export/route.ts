import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  DEFAULT_HMS_PULSE_ITEMS,
  ensureMandatoryHmsPulseItems,
  normalizeHmsPulseItems,
  type HmsPulseItem,
  type HmsPulseComplianceKey,
} from "@/features/dashboard/lib/hms-pulse-config";
import { UserTenant } from "@prisma/client";

type ComplianceStatusValue = {
  key: HmsPulseComplianceKey;
  value: string;
  severity: "ok" | "warning" | "critical";
};

type SeverityPalette = {
  fill: [number, number, number];
  text: [number, number, number];
  label: string;
  explanation: string;
};

function getStatusMap(data: {
  criticalRisks: number;
  openIncidents: number;
  recentFormsCount: number;
  openInspections: number;
  overdueMeasures: number;
  expiredTraining: number;
  approvedDocuments: number;
  totalDocuments: number;
  upcomingAudits: number;
}): Map<HmsPulseComplianceKey, ComplianceStatusValue> {
  const documentComplianceRate =
    data.totalDocuments > 0 ? Math.round((data.approvedDocuments / data.totalDocuments) * 100) : 100;

  return new Map<HmsPulseComplianceKey, ComplianceStatusValue>([
    [
      "riskAssessment",
      {
        key: "riskAssessment",
        value: `${data.criticalRisks} kritiske`,
        severity: data.criticalRisks > 0 ? "critical" : "ok",
      },
    ],
    [
      "incidents",
      {
        key: "incidents",
        value: `${data.openIncidents} åpne`,
        severity: data.openIncidents > 0 ? "warning" : "ok",
      },
    ],
    [
      "formsLatest",
      {
        key: "formsLatest",
        value: `${data.recentFormsCount} siste`,
        severity: data.recentFormsCount > 0 ? "ok" : "warning",
      },
    ],
    [
      "inspections",
      {
        key: "inspections",
        value: `${data.openInspections} åpne`,
        severity: data.openInspections > 0 ? "warning" : "ok",
      },
    ],
    [
      "measures",
      {
        key: "measures",
        value: `${data.overdueMeasures} forfalte`,
        severity: data.overdueMeasures > 0 ? "critical" : "ok",
      },
    ],
    [
      "training",
      {
        key: "training",
        value: `${data.expiredTraining} utgått`,
        severity: data.expiredTraining > 0 ? "warning" : "ok",
      },
    ],
    [
      "documents",
      {
        key: "documents",
        value: `${data.approvedDocuments}/${data.totalDocuments} (${documentComplianceRate}%)`,
        severity: documentComplianceRate < 80 ? "warning" : "ok",
      },
    ],
    [
      "audits",
      {
        key: "audits",
        value: `${data.upcomingAudits} neste 7 dager`,
        severity: data.upcomingAudits > 0 ? "warning" : "ok",
      },
    ],
  ]);
}

function safeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, "_");
}

function getSeverityPalette(severity: ComplianceStatusValue["severity"]): SeverityPalette {
  if (severity === "critical") {
    return {
      fill: [254, 226, 226],
      text: [153, 27, 27],
      label: "Kritisk",
      explanation: "Krever rask oppfølging.",
    };
  }
  if (severity === "warning") {
    return {
      fill: [254, 243, 199],
      text: [146, 64, 14],
      label: "Må følges opp",
      explanation: "Bør gjennomgås snarlig.",
    };
  }
  return {
    fill: [220, 252, 231],
    text: [22, 101, 52],
    label: "God",
    explanation: "Ingen avvikende funn akkurat nå.",
  };
}

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenants: true },
    });
    if (!user || user.tenants.length === 0) {
      return NextResponse.json({ error: "Ingen tenant funnet" }, { status: 404 });
    }

    const tenantId = resolveActiveTenantId(
      user.tenants,
      (session.user as { tenantId?: string }).tenantId
    );
    if (!tenantId) {
      return NextResponse.json({ error: "Ingen gyldig tenant-kontekst" }, { status: 403 });
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant ikke funnet" }, { status: 404 });
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const [config, risks, incidents, measures, trainings, documents, audits, inspections, formSubmissions] =
      await Promise.all([
        prisma.dashboardConfig.findUnique({
          where: { userId_tenantId: { userId: user.id, tenantId } },
          select: { hmsPulseItems: true },
        }),
        prisma.risk.findMany({ where: { tenantId }, select: { score: true } }),
        prisma.incident.findMany({
          where: { tenantId },
          select: { status: true },
        }),
        prisma.measure.findMany({
          where: { tenantId },
          select: { status: true, dueAt: true },
        }),
        prisma.training.findMany({
          where: { tenantId },
          select: { validUntil: true, completedAt: true },
        }),
        prisma.document.findMany({
          where: { tenantId },
          select: { status: true },
        }),
        prisma.audit.findMany({
          where: { tenantId },
          select: { status: true, scheduledDate: true },
        }),
        prisma.inspection.findMany({
          where: { tenantId },
          select: { status: true },
        }),
        prisma.formSubmission.findMany({
          where: { tenantId },
          select: { id: true },
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
    const expiredTraining = trainings.filter(
      (training) => training.validUntil && new Date(training.validUntil) < now && !training.completedAt
    ).length;
    const approvedDocuments = documents.filter((document) => document.status === "APPROVED").length;
    const upcomingAudits = audits.filter(
      (audit) =>
        audit.status !== "COMPLETED" &&
        new Date(audit.scheduledDate) >= now &&
        new Date(audit.scheduledDate) <= sevenDaysFromNow
    ).length;
    const openInspections = inspections.filter((inspection) => inspection.status !== "COMPLETED").length;
    const recentFormsCount = formSubmissions.length;

    const statusMap = getStatusMap({
      criticalRisks,
      openIncidents,
      recentFormsCount,
      openInspections,
      overdueMeasures,
      expiredTraining,
      approvedDocuments,
      totalDocuments: documents.length,
      upcomingAudits,
    });

    const storedItems = (config?.hmsPulseItems as unknown as HmsPulseItem[]) || DEFAULT_HMS_PULSE_ITEMS;
    const items = ensureMandatoryHmsPulseItems(normalizeHmsPulseItems(storedItems));
    const usedStatuses = items
      .map((item) => (item.complianceKey ? statusMap.get(item.complianceKey) : undefined))
      .filter((status): status is ComplianceStatusValue => Boolean(status));

    const criticalCount = usedStatuses.filter((status) => status.severity === "critical").length;
    const warningCount = usedStatuses.filter((status) => status.severity === "warning").length;
    const okCount = usedStatuses.filter((status) => status.severity === "ok").length;
    const totalStatusItems = usedStatuses.length || 1;
    const pulseScore = Math.max(
      0,
      Math.round(((okCount + warningCount * 0.5) / totalStatusItems) * 100)
    );

    let pulseLabel = "God";
    if (criticalCount > 0 || pulseScore < 60) {
      pulseLabel = "Kritisk";
    } else if (warningCount > 0 || pulseScore < 80) {
      pulseLabel = "Må følges opp";
    }

    const { generateBrandedPdf } = await import("@/lib/pdf-brand");

    const statusRows: [string, string][] = items.map((item) => {
      const s = item.complianceKey ? statusMap.get(item.complianceKey) : undefined;
      const palette = getSeverityPalette(s?.severity ?? "ok");
      return [item.title, `${palette.label}${s ? ` – ${s.value}` : ""}`];
    });

    const buffer = await generateBrandedPdf({
      type: "formal",
      reportLabel: "HMS-puls tilsynsrapport",
      title: "HMS-puls – Tilsynsrapport",
      subtitle: `Puls: ${pulseScore}/100 (${pulseLabel}) · ${okCount} gode, ${warningCount} advarsler, ${criticalCount} kritiske`,
      tenant: { name: tenant.name },
      generatedAt: now,
      legalReference: "AML § 3-1, IK-HMS § 5",
      sections: [
        {
          title: "HMS-status oversikt",
          content: [
            {
              type: "keyvalue",
              pairs: statusRows,
            },
          ],
        },
        ...(items.some((item) => item.legalRef)
          ? [{
              title: "Lovgrunnlag per område",
              content: [{
                type: "table" as const,
                headers: ["Område", "Lovgrunnlag", "Status"],
                rows: items
                  .filter((item) => item.legalRef)
                  .map((item) => {
                    const s = item.complianceKey ? statusMap.get(item.complianceKey) : undefined;
                    const palette = getSeverityPalette(s?.severity ?? "ok");
                    return [item.title, item.legalRef ?? "–", `${palette.label}${s ? ` – ${s.value}` : ""}`];
                  }),
              }],
            }]
          : []),
        ...(criticalCount > 0
          ? [{
              title: "Kritiske funn",
              content: [{
                type: "alert" as const,
                text: `${criticalCount} kritiske punkt krever rask oppfølging. Gjennomgå systemet og lukk avvikene.`,
                severity: "danger" as const,
              }],
            }]
          : []),
      ],
    });

    const filename = `HMS_puls_tilsyn_${safeFilename(tenant.name)}_${now.toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
