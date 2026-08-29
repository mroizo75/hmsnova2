import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { nb } from "date-fns/locale";

const TYPE_LABELS: Record<string, string> = {
  VERNERUNDE: "Vernerunde",
  HMS_INSPEKSJON: "HMS-inspeksjon",
  SHA_PLAN: "SHA-plan",
  SIKKERHETSVANDRING: "Sikkerhetsvandring",
  ANDRE: "Annet",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planlagt",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Fullført",
  CANCELLED: "Avbrutt",
};

const FINDING_STATUS_LABELS: Record<string, string> = {
  OPEN: "Åpen",
  IN_PROGRESS: "Under arbeid",
  RESOLVED: "Løst",
  CLOSED: "Lukket",
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "Lav",
  2: "Moderat",
  3: "Betydelig",
  4: "Alvorlig",
  5: "Kritisk",
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return new NextResponse("Ikke autorisert", { status: 401 });
  }

  const { tenantId } = session.user;
  const sp = req.nextUrl.searchParams;
  const year = parseInt(sp.get("year") ?? String(new Date().getFullYear()), 10);
  const monthParam = sp.get("month");
  const month = monthParam ? parseInt(monthParam, 10) : null;

  const refDate = new Date(year, month !== null ? month - 1 : 0, 1);
  const startDate = month !== null ? startOfMonth(refDate) : startOfYear(refDate);
  const endDate = month !== null ? endOfMonth(refDate) : endOfYear(refDate);

  const periodLabel =
    month !== null
      ? format(refDate, "MMMM yyyy", { locale: nb }).replace(/^./, (c) => c.toUpperCase())
      : `Årsrapport ${year}`;

  const inspections = await db.inspection.findMany({
    where: {
      tenantId,
      scheduledDate: { gte: startDate, lte: endDate },
    },
    include: {
      findings: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  const allUserIds = [
    ...new Set([
      ...inspections.map((i) => i.conductedBy).filter(Boolean),
      ...inspections.flatMap((i) => i.findings.map((f) => f.responsibleId).filter(Boolean)),
    ]),
  ] as string[];

  const users = await db.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? u.id]));

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, orgNumber: true, logoUrl: true },
  });

  const allFindings = inspections.flatMap((ins) =>
    ins.findings.map((f) => ({
      ...f,
      inspectionTitle: ins.title,
      responsibleName: f.responsibleId ? (userMap[f.responsibleId] ?? "") : "",
    }))
  );

  const summary = {
    total: inspections.length,
    completed: inspections.filter((i) => i.status === "COMPLETED").length,
    planned: inspections.filter((i) => i.status === "PLANNED").length,
    inProgress: inspections.filter((i) => i.status === "IN_PROGRESS").length,
    totalFindings: allFindings.length,
    openFindings: allFindings.filter((f) => f.status === "OPEN").length,
    criticalFindings: allFindings.filter((f) => f.severity >= 4).length,
  };

  const bySeverity = [5, 4, 3, 2, 1].map((s) => ({
    label: SEVERITY_LABELS[s],
    value: allFindings.filter((f) => f.severity === s).length,
  }));

  const byStatus = (["COMPLETED", "IN_PROGRESS", "PLANNED", "CANCELLED"] as const).map((s) => ({
    label: STATUS_LABELS[s],
    value: inspections.filter((i) => i.status === s).length,
  }));

  const findingsByStatus = (["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => ({
    label: FINDING_STATUS_LABELS[s],
    value: allFindings.filter((f) => f.status === s).length,
  }));

  const typeKeys = ["VERNERUNDE", "HMS_INSPEKSJON", "SHA_PLAN", "SIKKERHETSVANDRING", "ANDRE"];
  const byType = typeKeys
    .map((t) => {
      const ins = inspections.filter((i) => i.type === t);
      return {
        label: TYPE_LABELS[t],
        inspections: ins.length,
        findings: ins.reduce((sum, i) => sum + i.findings.length, 0),
      };
    })
    .filter((t) => t.inspections > 0);

  const monthlyTrend =
    month === null
      ? Array.from({ length: 12 }, (_, i) => {
          const mo = new Date(year, i, 1);
          const moInsp = inspections.filter((ins) => new Date(ins.scheduledDate).getMonth() === i);
          return {
            label: format(mo, "MMM", { locale: nb }),
            inspections: moInsp.length,
            findings: moInsp.reduce((sum, ins) => sum + ins.findings.length, 0),
          };
        })
      : [];

  const completionRate =
    summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
  const openFindings = allFindings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS");

  const sections: PdfSection[] = [
    {
      title: "Oppsummering",
      legalRef: "AML § 5-1, § 5-2, IK-HMS § 5",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Inspeksjoner totalt", String(summary.total)],
            ["Fullført", String(summary.completed)],
            ["Planlagt", String(summary.planned)],
            ["Pågår", String(summary.inProgress)],
            ["Gjennomføringsgrad", `${completionRate} %`],
            ["Totale funn", String(summary.totalFindings)],
            ["Åpne funn", String(summary.openFindings)],
            ["Kritiske funn", String(summary.criticalFindings)],
          ],
        },
      ],
    },
    {
      title: "Analyse",
      content: [
        {
          type: "table",
          headers: ["Status", "Antall"],
          rows: byStatus.map((s) => [s.label, s.value]),
        },
        {
          type: "table",
          headers: ["Alvorlighet", "Antall funn"],
          rows: bySeverity.map((s) => [s.label, s.value]),
        },
        {
          type: "table",
          headers: ["Funnstatus", "Antall"],
          rows: findingsByStatus.map((s) => [s.label, s.value]),
        },
        ...(byType.length > 0
          ? [
              {
                type: "table" as const,
                headers: ["Type", "Inspeksjoner", "Funn"],
                rows: byType.map((t) => [t.label, t.inspections, t.findings]),
              },
            ]
          : []),
        ...(monthlyTrend.length > 1
          ? [
              {
                type: "table" as const,
                headers: ["Måned", "Inspeksjoner", "Funn"],
                rows: monthlyTrend.map((m) => [m.label, m.inspections, m.findings]),
              },
            ]
          : []),
      ],
    },
    {
      title: `Inspeksjoner i perioden (${inspections.length})`,
      content:
        inspections.length === 0
          ? [{ type: "paragraph", text: "Ingen inspeksjoner funnet i valgt periode." }]
          : [
              {
                type: "table",
                headers: [
                  "Tittel",
                  "Type",
                  "Planlagt",
                  "Gjennomført",
                  "Lokasjon",
                  "Status",
                  "Funn (åpne/tot.)",
                ],
                rows: inspections.map((ins) => [
                  ins.title,
                  TYPE_LABELS[ins.type] ?? ins.type,
                  format(new Date(ins.scheduledDate), "d. MMM yyyy", { locale: nb }),
                  ins.completedDate
                    ? format(new Date(ins.completedDate), "d. MMM yyyy", { locale: nb })
                    : "–",
                  ins.location ?? "–",
                  STATUS_LABELS[ins.status] ?? ins.status,
                  `${ins.findings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS").length}/${ins.findings.length}`,
                ]),
              },
            ],
    },
  ];

  if (openFindings.length > 0) {
    sections.push({
      title: `Åpne tiltak og funn (${openFindings.length})`,
      legalRef: "AML § 3-1, IK-HMS § 5",
      content: [
        {
          type: "alert",
          text: "Disse funnene er åpne eller under arbeid. Ledelsen må følge opp at tiltak gjennomføres innen frist.",
          severity: "warning",
        },
        {
          type: "table",
          headers: ["Inspeksjon", "Funn", "Alvorlighet", "Ansvarlig", "Frist"],
          rows: openFindings.map((f) => [
            f.inspectionTitle,
            f.title,
            SEVERITY_LABELS[f.severity] ?? String(f.severity),
            f.responsibleName || "–",
            f.dueDate ? format(new Date(f.dueDate), "d. MMM yyyy", { locale: nb }) : "–",
          ]),
        },
      ],
    });
  } else {
    sections.push({
      content: [
        {
          type: "alert",
          text: "Ingen åpne funn som krever umiddelbar oppfølging i valgt periode.",
          severity: "info",
        },
      ],
    });
  }

  if (allFindings.length > 0) {
    sections.push({
      title: `Alle registrerte funn (${allFindings.length})`,
      content: [
        {
          type: "table",
          headers: ["Inspeksjon", "Funn", "Alvorlighet", "Status", "Ansvarlig", "Frist"],
          rows: allFindings.map((f) => [
            f.inspectionTitle,
            f.title,
            SEVERITY_LABELS[f.severity] ?? String(f.severity),
            FINDING_STATUS_LABELS[f.status] ?? f.status,
            f.responsibleName || "–",
            f.dueDate ? format(new Date(f.dueDate), "d. MMM yyyy", { locale: nb }) : "–",
          ]),
        },
      ],
    });
  }

  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: "Inspeksjonsrapport",
    title: periodLabel,
    subtitle: tenant?.name ?? "HMS Nova",
    tenant: {
      name: tenant?.name ?? "HMS Nova",
      orgNumber: tenant?.orgNumber,
      logoUrl: tenant?.logoUrl,
    },
    generatedAt: new Date(),
    legalReference: "AML § 5-1, § 5-2, IK-HMS § 5",
    sections,
  });

  const filename = `inspeksjonsrapport-${year}${month ? `-${String(month).padStart(2, "0")}` : ""}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
