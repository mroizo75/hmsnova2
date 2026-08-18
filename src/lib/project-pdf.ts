/**
 * PDF-generator for prosjektrapporter
 * Bruker profesjonell HMS Nova-branding via pdf-brand.ts
 */

import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface ProjectReportData {
  project: {
    id: string;
    name: string;
    code: string | null;
    orderNumber: string | null;
    clientName: string | null;
    location: string | null;
    description: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    projectManager: { name: string | null; email: string } | null;
    createdBy: { name: string | null; email: string };
    createdAt: Date;
  };
  incidents: Array<{
    avviksnummer: string | null;
    title: string;
    type: string;
    severity: number | null;
    status: string;
    occurredAt: Date;
    isFatal: boolean;
    isLostTimeIncident: boolean;
    lostWorkdays: number | null;
    isRestrictedWork: boolean;
    medicalAttentionRequired: boolean;
  }>;
  sjaAnalyses: Array<{
    sjaNummer: string | null;
    title: string;
    status: string;
    plannedDate: Date;
    workLocation: string;
    responsibleName: string;
    conclusion: string;
  }>;
  inspections: Array<{
    title: string;
    type: string;
    status: string;
    scheduledDate: Date;
    location: string | null;
  }>;
  measures: Array<{
    title: string;
    status: string;
    dueAt: Date;
    category: string;
  }>;
  attachments: Array<{
    name: string;
    mime: string;
    size: number | null;
    createdAt: Date;
  }>;
  manHours: number;
  tenantName: string;
  tenantOrgNumber?: string | null;
  tenantLogoUrl?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planlegging",
  ACTIVE: "Aktiv",
  ON_HOLD: "På vent",
  COMPLETED: "Fullført",
  ARCHIVED: "Arkivert",
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  ULYKKE: "Ulykke",
  NESTEN: "Nestenulykke",
  FARLIG_SITUASJON: "Farlig situasjon",
  YRKESSYKDOM: "Yrkessykdom",
  AVVIK: "Avvik",
};

function fmt(d: Date | null | undefined): string {
  if (!d) return "–";
  return format(new Date(d), "d. MMM yyyy", { locale: nb });
}

export async function generateProjectReport(data: ProjectReportData): Promise<Buffer> {
  const { project } = data;
  const pm = project.projectManager?.name ?? project.projectManager?.email ?? "–";

  const sections: PdfSection[] = [
    {
      title: "Prosjektinformasjon",
      legalRef: "AML § 3-1, Byggherreforskriften",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Prosjektnavn", project.name],
            ["Prosjektkode", project.code ?? "–"],
            ["Ordrenummer", project.orderNumber ?? "–"],
            ["Kunde/oppdragsgiver", project.clientName ?? "–"],
            ["Lokasjon", project.location ?? "–"],
            ["Status", STATUS_LABELS[project.status] ?? project.status],
            ["Startdato", fmt(project.startDate)],
            ["Sluttdato", fmt(project.endDate)],
            ["Prosjektleder", pm],
            ["Arbeidstimer", String(data.manHours)],
          ],
        },
        ...(project.description ? [{ type: "paragraph" as const, text: project.description }] : []),
      ],
    },
  ];

  sections.push({
    title: "HMS-statistikk",
    content: [
      {
        type: "table",
        headers: ["Indikator", "Verdi"],
        rows: [
          ["Totalt antall hendelser", data.incidents.length],
          ["Dødelige ulykker (H1)", data.incidents.filter((i) => i.isFatal).length],
          ["Fraværsulykker (H2)", data.incidents.filter((i) => i.isLostTimeIncident).length],
          ["Totalt tapte arbeidsdager", data.incidents.reduce((acc, i) => acc + (i.lostWorkdays ?? 0), 0)],
          ["Antall SJA-analyser", data.sjaAnalyses.length],
          ["Antall inspeksjoner", data.inspections.length],
          ["Åpne tiltak", data.measures.filter((m) => m.status !== "DONE").length],
        ],
      },
    ],
  });

  if (data.incidents.length > 0) {
    sections.push({
      title: "Hendelser og avvik",
      content: [
        {
          type: "table",
          headers: ["Ref.", "Tittel", "Type", "Dato", "Status"],
          rows: data.incidents.map((i) => [
            i.avviksnummer ?? "–",
            i.title,
            INCIDENT_TYPE_LABELS[i.type] ?? i.type,
            fmt(i.occurredAt),
            i.status,
          ]),
        },
      ],
    });
  }

  if (data.sjaAnalyses.length > 0) {
    sections.push({
      title: "SJA-analyser",
      content: [
        {
          type: "table",
          headers: ["SJA-nr.", "Tittel", "Status", "Dato", "Ansvarlig"],
          rows: data.sjaAnalyses.map((s) => [
            s.sjaNummer ?? "–",
            s.title,
            s.status,
            fmt(s.plannedDate),
            s.responsibleName,
          ]),
        },
      ],
    });
  }

  if (data.measures.length > 0) {
    sections.push({
      title: "Tiltak og oppfølging",
      content: [
        {
          type: "table",
          headers: ["Tiltak", "Status", "Frist"],
          rows: data.measures.map((m) => [m.title, m.status, fmt(m.dueAt)]),
        },
      ],
    });
  }

  return generateBrandedPdf({
    type: "operational",
    reportLabel: "Prosjektrapport",
    title: project.name,
    subtitle: `${STATUS_LABELS[project.status] ?? project.status} · ${fmt(project.startDate)} – ${fmt(project.endDate)}`,
    tenant: {
      name: data.tenantName,
      orgNumber: data.tenantOrgNumber,
      logoUrl: data.tenantLogoUrl,
    },
    generatedBy: pm,
    generatedAt: new Date(),
    legalReference: "AML § 3-1, Byggherreforskriften",
    sections,
  });
}
