import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";
import {
  DEFAULT_HMS_PULSE_ITEMS,
  ensureMandatoryHmsPulseItems,
  normalizeHmsPulseItems,
  type HmsPulseItem,
  type HmsPulseComplianceKey,
} from "@/features/dashboard/lib/hms-pulse-config";
import { UserTenant } from "@prisma/client";

function formatDate(date: Date): string {
  return date.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const maxWidth = pageWidth - margin * 2;
    let y = 18;

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y - 10, maxWidth, 28, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("HMS-puls - Tilsynsrapport", margin + 4, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Virksomhet: ${tenant.name}`, margin + 4, y);
    y += 6;
    doc.text(`Dato: ${formatDate(now)} | Grunnlag: lovforankret HMS-oversikt`, margin + 4, y);
    y += 16;

    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(margin, y - 2, maxWidth, 24, 2, 2, "FD");
    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Total HMS-puls: ${pulseScore}/100 (${pulseLabel})`, margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Statusfordeling: ${okCount} gode, ${warningCount} må følges opp, ${criticalCount} kritiske.`,
      margin + 4,
      y + 11
    );
    doc.text(
      "Rapporten er egnet for dialog med tilsyn, revisjon og intern oppfølging.",
      margin + 4,
      y + 16
    );
    y += 30;

    for (const item of items) {
      const status = item.complianceKey ? statusMap.get(item.complianceKey) : undefined;
      const estimatedHeight = item.legalRef ? 36 : 30;
      if (y + estimatedHeight > pageHeight - 14) {
        doc.addPage();
        y = 18;
      }

      const palette = getSeverityPalette(status?.severity ?? "ok");
      doc.setFillColor(palette.fill[0], palette.fill[1], palette.fill[2]);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y - 2, maxWidth, estimatedHeight, 2, 2, "FD");

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const title = doc.splitTextToSize(item.title, maxWidth - 64);
      doc.text(title, margin + 3, y + 4);

      doc.setFillColor(palette.text[0], palette.text[1], palette.text[2]);
      doc.roundedRect(pageWidth - margin - 43, y + 1, 40, 7, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(palette.label, pageWidth - margin - 23, y + 6, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`Lenke: ${item.href}`, margin + 3, y + 12);

      if (item.legalRef) {
        doc.text(`Lovgrunnlag: ${item.legalRef}`, margin + 3, y + 17);
      }

      if (status) {
        doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
        doc.text(
          `Status: ${status.value}. Forklaring: ${palette.explanation}`,
          margin + 3,
          item.legalRef ? y + 22 : y + 17
        );
      }

      y += estimatedHeight + 4;
    }

    const buffer = Buffer.from(doc.output("arraybuffer"));
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
