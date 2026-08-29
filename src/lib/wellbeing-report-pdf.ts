/**
 * Psykososial rapport (AML § 4-3) via felles HMS Nova-mal.
 */

import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";

type WellbeingTenant = {
  name: string;
  orgNumber?: string | null;
  address?: string | null;
  logoUrl?: string | null;
};

type WellbeingReport = {
  year: number;
  totalResponses: number;
  overallScore: number;
  sectionAverages: Array<{
    section: string;
    average: number;
    trend?: number;
  }>;
  criticalIncidents: {
    mobbing: number;
    trakassering: number;
    press: number;
    konflikter: number;
  };
  topConcerns: string[];
  openFeedback: Array<{
    positive: string[];
    negative: string[];
    suggestions: string[];
  }>;
  trend?: {
    previousYear: number;
    change: number;
    improving: boolean;
  };
  generatedRisks: number;
  implementedMeasures: number;
};

function scoreText(score: number): string {
  if (score >= 4.0) return "Svært godt";
  if (score >= 3.5) return "Godt";
  if (score >= 3.0) return "Tilfredsstillende";
  if (score >= 2.5) return "Middels";
  if (score >= 2.0) return "Dårlig";
  return "Svært dårlig";
}

function conclusionText(overallScore: number, criticalIncidents: WellbeingReport["criticalIncidents"]): string {
  let text =
    overallScore >= 3.5
      ? "Det psykososiale arbeidsmiljøet vurderes som tilfredsstillende. Fortsett det gode arbeidet med å opprettholde et godt arbeidsmiljø."
      : overallScore >= 2.5
        ? "Det psykososiale arbeidsmiljøet har forbedringsområder som må følges opp. Implementer foreslåtte tiltak og evaluer effekten."
        : "Det psykososiale arbeidsmiljøet krever umiddelbar oppfølging og tiltak. Dette er et alvorlig avvik fra kravene i Arbeidsmiljøloven.";

  const totalCritical =
    criticalIncidents.mobbing +
    criticalIncidents.trakassering +
    criticalIncidents.press +
    criticalIncidents.konflikter;

  if (totalCritical > 0) {
    text += "\n\nVIKTIG: Kritiske forhold er rapportert og må håndteres umiddelbart i henhold til Arbeidsmiljøloven § 4-3.";
  }

  return text;
}

export async function generateWellbeingReportPDF(
  reportData: WellbeingReport,
  tenant: WellbeingTenant
): Promise<Buffer> {
  const criticalTotal =
    reportData.criticalIncidents.mobbing +
    reportData.criticalIncidents.trakassering +
    reportData.criticalIncidents.press +
    reportData.criticalIncidents.konflikter;

  const sections: PdfSection[] = [
    {
      title: "Sammendrag",
      legalRef: "AML § 4-3",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["År", String(reportData.year)],
            ["Besvarelser", String(reportData.totalResponses)],
            ["Samlet score", `${reportData.overallScore.toFixed(2)} / 5 (${scoreText(reportData.overallScore)})`],
            ...(reportData.trend
              ? [
                  ["Forrige år", reportData.trend.previousYear.toFixed(2)] as [string, string],
                  ["Endring", `${reportData.trend.improving ? "Forbedring" : "Nedgang"} ${reportData.trend.change.toFixed(2)}`] as [string, string],
                ]
              : []),
            ["Genererte risikovurderinger", String(reportData.generatedRisks)],
            ["Iverksatte tiltak", String(reportData.implementedMeasures)],
          ],
        },
      ],
    },
    {
      title: "Seksjonsvurdering",
      content: [
        {
          type: "table",
          headers: ["Seksjon", "Score", "Vurdering", "Trend"],
          rows: reportData.sectionAverages.map((section) => [
            section.section,
            section.average.toFixed(2),
            scoreText(section.average),
            section.trend !== undefined ? section.trend.toFixed(2) : "–",
          ]),
        },
      ],
    },
  ];

  if (criticalTotal > 0) {
    sections.push({
      title: "Kritiske forhold",
      legalRef: "AML § 4-3",
      content: [
        {
          type: "alert",
          text: "Kritiske forhold er rapportert og krever umiddelbar oppfølging.",
          severity: "danger",
        },
        {
          type: "keyvalue",
          pairs: [
            ["Mobbing", String(reportData.criticalIncidents.mobbing)],
            ["Trakassering", String(reportData.criticalIncidents.trakassering)],
            ["Utilbørlig press", String(reportData.criticalIncidents.press)],
            ["Uhåndterte konflikter", String(reportData.criticalIncidents.konflikter)],
          ],
        },
      ],
    });
  }

  if (reportData.topConcerns.length > 0) {
    sections.push({
      title: "Hovedutfordringer",
      content: reportData.topConcerns.map((name) => ({ type: "paragraph" as const, text: name })),
    });
  }

  sections.push({
    title: "Konklusjon",
    legalRef: "AML § 4-3",
    content: [{ type: "paragraph", text: conclusionText(reportData.overallScore, reportData.criticalIncidents) }],
  });

  const feedback = reportData.openFeedback[0];
  if (feedback?.positive?.length) {
    sections.push({
      title: "Positive tilbakemeldinger",
      content: feedback.positive.slice(0, 5).map((text) => ({ type: "paragraph" as const, text })),
    });
  }
  if (feedback?.negative?.length) {
    sections.push({
      title: "Forbedringsområder",
      content: feedback.negative.slice(0, 5).map((text) => ({ type: "paragraph" as const, text })),
    });
  }
  if (feedback?.suggestions?.length) {
    sections.push({
      title: "Forslag fra ansatte",
      content: feedback.suggestions.slice(0, 5).map((text) => ({ type: "paragraph" as const, text })),
    });
  }

  return generateBrandedPdf({
    type: "formal",
    reportLabel: "Psykososial rapport",
    title: `Psykososialt arbeidsmiljø ${reportData.year}`,
    subtitle: `${scoreText(reportData.overallScore)} · ${reportData.totalResponses} besvarelser`,
    tenant: {
      name: tenant.name,
      orgNumber: tenant.orgNumber,
      address: tenant.address,
      logoUrl: tenant.logoUrl,
    },
    generatedAt: new Date(),
    legalReference: "AML § 4-3",
    coverPage: true,
    sections,
  });
}
