/**
 * PDF Generator for Inspections (Vernerunde/HMS-inspeksjoner)
 * Bruker profesjonell HMS Nova-branding via pdf-brand.ts
 */

import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface InspectionData {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  scheduledDate: Date;
  completedDate?: Date | null;
  location?: string | null;
  conductedBy: string;
  participants?: string | null;
  tenantName?: string;
  tenantOrgNumber?: string | null;
  tenantLogoUrl?: string | null;
  findings: Array<{
    id: string;
    title: string;
    description: string;
    severity: number;
    location?: string | null;
    status: string;
    responsibleId?: string | null;
    dueDate?: Date | null;
    createdAt: Date;
  }>;
}

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
  2: "Middels-lav",
  3: "Middels",
  4: "Middels-høy",
  5: "Kritisk",
};

function fmtDate(d: Date | null | undefined) {
  if (!d) return "–";
  return format(new Date(d), "d. MMMM yyyy", { locale: nb });
}

export async function generateInspectionReport(inspection: InspectionData): Promise<Buffer> {
  const openFindings = inspection.findings.filter((f) => f.status === "OPEN").length;

  const sections: PdfSection[] = [
    {
      title: "Informasjon",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Type", TYPE_LABELS[inspection.type] ?? inspection.type],
            ["Status", STATUS_LABELS[inspection.status] ?? inspection.status],
            ["Planlagt dato", fmtDate(inspection.scheduledDate)],
            ...(inspection.completedDate ? [["Gjennomført", fmtDate(inspection.completedDate)] as [string, string]] : []),
            ["Lokasjon", inspection.location ?? "–"],
            ["Gjennomført av", inspection.conductedBy],
            ...(inspection.participants ? [["Deltakere", inspection.participants] as [string, string]] : []),
            ["Antall funn", String(inspection.findings.length)],
            ["Åpne funn", String(openFindings)],
          ],
        },
        ...(inspection.description
          ? [{ type: "paragraph" as const, text: inspection.description }]
          : []),
      ],
    },
  ];

  if (inspection.findings.length > 0) {
    sections.push({
      title: "Funn og avvik",
      legalRef: "AML § 3-1, IK-HMS § 5",
      content: [
        {
          type: "table",
          headers: ["#", "Funn", "Alvorlighet", "Status", "Frist"],
          rows: inspection.findings.map((f, i) => [
            i + 1,
            f.title,
            SEVERITY_LABELS[f.severity] ?? String(f.severity),
            FINDING_STATUS_LABELS[f.status] ?? f.status,
            fmtDate(f.dueDate),
          ]),
        },
      ],
    });

    sections.push({
      title: "Detaljert beskrivelse av funn",
      content: inspection.findings.flatMap((f, i) => [
        {
          type: "keyvalue" as const,
          pairs: [
            [`${i + 1}. ${f.title}`, ""],
            ["Alvorlighet", SEVERITY_LABELS[f.severity] ?? String(f.severity)],
            ["Status", FINDING_STATUS_LABELS[f.status] ?? f.status],
            ...(f.location ? [["Lokasjon", f.location] as [string, string]] : []),
            ...(f.dueDate ? [["Frist", fmtDate(f.dueDate)] as [string, string]] : []),
          ] as [string, string][],
        },
        { type: "paragraph" as const, text: f.description },
      ]),
    });
  }

  if (openFindings > 0) {
    sections.push({
      content: [
        {
          type: "alert",
          text: `${openFindings} funn er fortsatt åpne og krever oppfølging.`,
          severity: "warning",
        },
      ],
    });
  }

  return generateBrandedPdf({
    type: "formal",
    reportLabel: TYPE_LABELS[inspection.type] ?? "Inspeksjon",
    title: inspection.title,
    subtitle: `${STATUS_LABELS[inspection.status] ?? inspection.status} · ${fmtDate(inspection.scheduledDate)}`,
    tenant: {
      name: inspection.tenantName ?? "HMS Nova",
      orgNumber: inspection.tenantOrgNumber,
      logoUrl: inspection.tenantLogoUrl,
    },
    generatedBy: inspection.conductedBy,
    generatedAt: new Date(),
    legalReference: "AML § 3-1, IK-HMS § 5",
    sections,
  });
}
