/**
 * PDF-generator for brannøvelsesrapport
 *
 * Hjemmel: Forskrift om brannforebygging § 12 og § 13
 * Bruker profesjonell HMS Nova-branding via pdf-brand.ts
 */

import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

const TYPE_LABELS: Record<string, string> = {
  EVACUATION: "Evakueringsøvelse",
  FIRE_SUPPRESSION: "Slokkeopplæring",
  ALARM_TEST: "Brannalarmtest",
  FULL_SCALE: "Fullskalaøvelse",
};

const OBJECTIVES_ACHIEVED_LABELS: Record<string, string> = {
  FULL: "Ja — alle mål nådd",
  PARTIAL: "Delvis — noen mål nådd",
  NOT_ACHIEVED: "Nei — mål ikke nådd",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planlagt",
  COMPLETED: "Gjennomført",
  CANCELLED: "Avbrutt",
};

export interface FireDrillReportData {
  id: string;
  title: string;
  drillType: string;
  isAnnounced: boolean;
  status: string;
  plannedDate: Date;
  completedAt: Date | null;
  location: string;
  responsibleName: string;
  objectives: string;
  scenario: string | null;
  riskAssessment: string | null;
  actualParticipantCount: number | null;
  evacuationTimeSeconds: number | null;
  observations: string | null;
  objectivesAchieved: string | null;
  evaluation: string | null;
  improvementPoints: string | null;
  procedureChangesNeeded: boolean | null;
  procedureChangesDesc: string | null;
  evaluatedByName: string | null;
  evaluatedAt: Date | null;
  measures: Array<{
    title: string;
    status: string;
    dueAt: Date;
    responsibleName: string | null;
  }>;
  tenantName: string;
  tenantOrgNumber?: string | null;
  tenantLogoUrl?: string | null;
}

function formatEvacTime(seconds: number): string {
  if (seconds < 60) return `${seconds} sekunder`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m} min ${s} sek` : `${m} minutter`;
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "–";
  return format(new Date(d), "d. MMMM yyyy", { locale: nb });
}

export async function generateFireDrillReport(data: FireDrillReportData): Promise<Buffer> {
  const sections: PdfSection[] = [
    {
      title: "Informasjon",
      legalRef: "Brannforebyggingsforskriften § 13",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Øvelsestype", TYPE_LABELS[data.drillType] ?? data.drillType],
            ["Status", STATUS_LABELS[data.status] ?? data.status],
            ["Varslet/uvarslet", data.isAnnounced ? "Varslet" : "Uvarslet"],
            ["Planlagt dato", fmtDate(data.plannedDate)],
            ...(data.completedAt ? [["Gjennomført", fmtDate(data.completedAt)] as [string, string]] : []),
            ["Sted", data.location],
            ["Øvingsleder", data.responsibleName],
            ...(data.actualParticipantCount != null
              ? [["Antall deltakere", String(data.actualParticipantCount)] as [string, string]]
              : []),
            ...(data.evacuationTimeSeconds != null
              ? [["Evakueringstid", formatEvacTime(data.evacuationTimeSeconds)] as [string, string]]
              : []),
            ...(data.objectivesAchieved
              ? [["Mål nådd", OBJECTIVES_ACHIEVED_LABELS[data.objectivesAchieved] ?? data.objectivesAchieved] as [string, string]]
              : []),
          ] as [string, string][],
        },
      ],
    },
    {
      title: "Mål for øvelsen",
      content: [{ type: "paragraph", text: data.objectives }],
    },
  ];

  if (data.scenario) {
    sections.push({
      title: "Scenario",
      content: [{ type: "paragraph", text: data.scenario }],
    });
  }

  if (data.riskAssessment) {
    sections.push({
      title: "Risikovurdering",
      content: [{ type: "paragraph", text: data.riskAssessment }],
    });
  }

  if (data.observations) {
    sections.push({
      title: "Observasjoner under øvelsen",
      content: [{ type: "paragraph", text: data.observations }],
    });
  }

  if (data.evaluation) {
    sections.push({
      title: "Evaluering",
      content: [{ type: "paragraph", text: data.evaluation }],
    });
  }

  if (data.improvementPoints) {
    sections.push({
      title: "Forbedringspunkter",
      content: [{ type: "paragraph", text: data.improvementPoints }],
    });
  }

  if (data.procedureChangesNeeded) {
    sections.push({
      title: "Prosedyreendringer nødvendig",
      content: [
        {
          type: "alert",
          text: data.procedureChangesDesc ?? "Prosedyreendringer er nødvendig – se detaljer.",
          severity: "warning",
        },
      ],
    });
  }

  if (data.measures.length > 0) {
    sections.push({
      title: "Oppfølgingstiltak",
      content: [
        {
          type: "table",
          headers: ["Tiltak", "Status", "Frist", "Ansvarlig"],
          rows: data.measures.map((m) => [
            m.title,
            m.status,
            fmtDate(m.dueAt),
            m.responsibleName ?? "–",
          ]),
        },
      ],
    });
  }

  if (data.evaluatedByName) {
    sections.push({
      title: "Evaluert av",
      content: [
        {
          type: "signature-block",
          signatures: [
            {
              name: data.evaluatedByName,
              date: fmtDate(data.evaluatedAt),
            },
          ],
        },
      ],
    });
  }

  return generateBrandedPdf({
    type: "operational",
    reportLabel: "Brannøvelsesrapport",
    title: data.title,
    subtitle: `${TYPE_LABELS[data.drillType] ?? data.drillType} · ${fmtDate(data.completedAt ?? data.plannedDate)}`,
    tenant: {
      name: data.tenantName,
      orgNumber: data.tenantOrgNumber,
      logoUrl: data.tenantLogoUrl,
    },
    generatedBy: data.responsibleName,
    generatedAt: new Date(),
    legalReference: "Brannforebyggingsforskriften § 12 og § 13",
    sections,
  });
}
