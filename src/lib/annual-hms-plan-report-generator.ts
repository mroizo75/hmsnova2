/**
 * PDF-generator for Årlig HMS-plan
 * Bruker profesjonell HMS Nova-branding via pdf-brand.ts
 */

import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { AnnualPlanChecklistData } from "@/server/actions/annual-hms-plan.actions";

interface AnnualHmsPlanReportTenant {
  name: string;
  orgNumber: string | null;
  logoUrl?: string | null;
}

export interface AnnualHmsPlanReportData {
  tenant: AnnualHmsPlanReportTenant;
  checklist: AnnualPlanChecklistData;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ledelse: "Ledelse og gjennomgang",
    risiko: "Risiko og mål",
    dokumenter: "Dokumenter og stoffkartotek",
    kontroll: "Kontroll og revisjon",
    opplæring: "Opplæring",
    oppfølging: "Oppfølging av avvik og tiltak",
    annen: "Annet",
  };
  return labels[category] ?? category;
}

export async function generateAnnualHmsPlanReport(data: AnnualHmsPlanReportData): Promise<Buffer> {
  const { tenant, checklist } = data;
  const completedPercent =
    checklist.totalCount > 0
      ? Math.round((checklist.completedCount / checklist.totalCount) * 100)
      : 0;

  const fmtDate = (d: string | Date | null | undefined) => {
    if (!d) return "–";
    return format(new Date(d), "d. MMM yyyy", { locale: nb });
  };

  // Grupper steg etter kategori
  const stepsByCategory = new Map<string, typeof checklist.steps>();
  for (const step of checklist.steps) {
    const cat = step.category ?? "annen";
    if (!stepsByCategory.has(cat)) stepsByCategory.set(cat, []);
    stepsByCategory.get(cat)!.push(step);
  }

  const sections: PdfSection[] = [
    {
      title: "Oppsummering",
      legalRef: "IK-HMS § 5 nr. 8, ISO 45001:2018 kap. 6.2",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["År", String(checklist.year)],
            ["Steg fullført", `${checklist.completedCount} av ${checklist.totalCount}`],
            ["Fremdrift", `${completedPercent} %`],
          ],
        },
        {
          type: "paragraph",
          text: "Denne rapporten viser status for alle steg i den årlige HMS-planen. Bruk rapporten som dokumentasjon i ledelsens gjennomgang, styremøter og eksterne revisjoner.",
        },
        ...(completedPercent < 50
          ? [{ type: "alert" as const, text: `Kun ${completedPercent}% av HMS-planen er fullført. Øk tempo for å nå årets mål.`, severity: "warning" as const }]
          : completedPercent === 100
          ? [{ type: "alert" as const, text: "Alle steg i HMS-planen er fullført for dette året. Godt jobbet!", severity: "ok" as const }]
          : []),
      ],
    },
  ];

  // Én seksjon per kategori
  for (const [category, steps] of stepsByCategory) {
    sections.push({
      title: getCategoryLabel(category),
      content: [
        {
          type: "table",
          headers: ["Steg", "Status", "Fullført dato", "Hjemmel"],
          rows: steps.map((step) => [
            step.title,
            step.completedAt ? "✓ Fullført" : "Ikke fullført",
            fmtDate(step.completedAt),
            step.legalRef ?? "–",
          ]),
        },
      ],
    });
  }

  // Ikke-fullførte steg samlet
  const notDone = checklist.steps.filter((s) => !s.completedAt);
  if (notDone.length > 0) {
    sections.push({
      title: "Gjenstående steg",
      content: [
        {
          type: "table",
          headers: ["Steg", "Kategori", "Hjemmel"],
          rows: notDone.map((s) => [s.title, getCategoryLabel(s.category ?? "annen"), s.legalRef ?? "–"]),
        },
      ],
    });
  }

  return generateBrandedPdf({
    type: "formal",
    reportLabel: "Årlig HMS-plan",
    title: `Årlig HMS-plan ${checklist.year}`,
    subtitle: `Fremdrift: ${completedPercent}% fullført (${checklist.completedCount} av ${checklist.totalCount} steg)`,
    tenant: {
      name: tenant.name,
      orgNumber: tenant.orgNumber,
      logoUrl: tenant.logoUrl,
    },
    generatedAt: new Date(),
    legalReference: "IK-HMS § 5 nr. 8, ISO 45001:2018 kap. 6.2",
    sections,
  });
}
