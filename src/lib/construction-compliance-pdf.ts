/**
 * PDF-generator for Bygg/anlegg compliance
 * Bruker profesjonell HMS Nova-branding via pdf-brand.ts
 *
 * Hjemmel: Byggherreforskriften § 10 (forhåndsmelding), § 15 (oversiktsliste), § 7 (SHA-plan)
 */

import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type {
  PreNotificationRequirementResult,
  ConstructionComplianceValidation,
} from "@/features/construction/lib/construction-compliance";

interface ConstructionCompliancePdfData {
  tenantName: string;
  tenantOrgNumber?: string | null;
  tenantLogoUrl?: string | null;
  project: {
    id: string;
    name: string;
    location: string | null;
    clientName: string | null;
  };
  shaPlan: {
    status: string;
    builderName: string | null;
    builderRepresentativeName: string | null;
    builderRepresentativeContact: string | null;
    coordinatorPlanningName: string | null;
    coordinatorExecutionName: string | null;
    conflictAssessmentDocumented: boolean;
    availableOnSite: boolean;
    lastReviewedAt: Date | null;
  } | null;
  preNotification: {
    status: string;
    submissionDate: Date | null;
    projectAddress: string;
    projectType: string;
    builderName: string;
    builderOrgNumber: string | null;
    expectedStartDate: Date;
    expectedEndDate: Date | null;
    maxWorkersSimultaneous: number | null;
    plannedBusinessesCount: number | null;
    visibleAtSite: boolean;
  } | null;
  rosterEntries: Array<{
    fullName: string;
    birthDate: Date;
    employerName: string;
    employerOrgNumber: string | null;
    hmsCardNumber: string | null;
    startedAtSiteDate: Date | null;
    endedAtSiteDate: Date | null;
    isActive: boolean;
  }>;
  rosterChecks: Array<{
    checkedDate: Date;
    checkedBy: { name: string | null; email: string } | null;
    notes: string | null;
  }>;
  isDailyCheckMissing: boolean;
  preNotificationRequirement: PreNotificationRequirementResult;
  complianceValidation: ConstructionComplianceValidation;
}

function fmt(date: Date | null | undefined): string {
  if (!date) return "–";
  return format(new Date(date), "dd.MM.yyyy", { locale: nb });
}

export async function generateConstructionCompliancePdf(
  data: ConstructionCompliancePdfData
): Promise<Buffer> {
  const cv = data.complianceValidation;
  const pnr = data.preNotificationRequirement;

  const sections: PdfSection[] = [
    {
      title: "Prosjekt og compliance-status",
      legalRef: "Byggherreforskriften § 7, § 10, § 15",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Prosjekt", data.project.name],
            ["Arbeidssted", data.project.location ?? "–"],
            ["Byggherre/kunde", data.project.clientName ?? "–"],
            ["Daglig kontroll", data.isDailyCheckMissing ? "Mangler kontroll i dag" : "Oppdatert i dag"],
            ["Siste kontroll", data.rosterChecks[0] ? fmt(data.rosterChecks[0].checkedDate) : "Ingen registrert"],
            ["SHA-plan klar", cv.shaReadyForActive ? "Ja" : "Nei"],
            ["Forhåndsmelding klar", cv.preNotificationReadyForSubmission ? "Ja" : "Nei"],
            ["Meldeplikt utløst", pnr.isRequired ? "Ja" : "Nei"],
          ],
        },
        ...(data.isDailyCheckMissing
          ? [{ type: "alert" as const, text: "Daglig kontroll mangler – oversiktslisten er ikke oppdatert i dag.", severity: "warning" as const }]
          : []),
      ],
    },
  ];

  if (data.shaPlan) {
    sections.push({
      title: "SHA-plan",
      legalRef: "Byggherreforskriften § 7",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Status", data.shaPlan.status],
            ["Byggherre", data.shaPlan.builderName ?? "–"],
            ["Byggherres representant", data.shaPlan.builderRepresentativeName ?? "–"],
            ["Koordinator prosjektering (KP)", data.shaPlan.coordinatorPlanningName ?? "–"],
            ["Koordinator utførelse (KU)", data.shaPlan.coordinatorExecutionName ?? "–"],
            ["Rollekonflikt dokumentert", data.shaPlan.conflictAssessmentDocumented ? "Ja" : "Nei"],
            ["Tilgjengelig på byggeplass", data.shaPlan.availableOnSite ? "Ja" : "Nei"],
            ["Sist gjennomgått", fmt(data.shaPlan.lastReviewedAt)],
          ],
        },
      ],
    });
  }

  if (data.preNotification) {
    sections.push({
      title: "Forhåndsmelding",
      legalRef: "Byggherreforskriften § 10",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Status", data.preNotification.status],
            ["Adresse", data.preNotification.projectAddress],
            ["Art av arbeid", data.preNotification.projectType],
            ["Byggherre", data.preNotification.builderName],
            ["Byggherre org.nr", data.preNotification.builderOrgNumber ?? "–"],
            ["Startdato", fmt(data.preNotification.expectedStartDate)],
            ["Sluttdato", fmt(data.preNotification.expectedEndDate)],
            ["Maks arbeidstakere", data.preNotification.maxWorkersSimultaneous?.toString() ?? "–"],
            ["Synlig på byggeplass", data.preNotification.visibleAtSite ? "Ja" : "Nei"],
          ],
        },
      ],
    });
  }

  sections.push({
    title: `Elektronisk oversiktsliste (${data.rosterEntries.length} personer)`,
    legalRef: "Byggherreforskriften § 15",
    content: data.rosterEntries.length > 0
      ? [{
          type: "table" as const,
          headers: ["Navn", "Arbeidsgiver", "HMS-kort", "Start", "Slutt", "Status"],
          rows: data.rosterEntries.map((e) => [
            e.fullName,
            e.employerName,
            e.hmsCardNumber ?? "Mangler",
            fmt(e.startedAtSiteDate),
            fmt(e.endedAtSiteDate),
            e.isActive ? "Aktiv" : "Avsluttet",
          ]),
        }]
      : [{ type: "paragraph" as const, text: "Ingen personer i oversiktslisten." }],
  });

  if (data.rosterChecks.length > 0) {
    sections.push({
      title: "Daglig kontrollhistorikk",
      content: [
        {
          type: "table",
          headers: ["Dato", "Kontrollert av", "Notat"],
          rows: data.rosterChecks.map((c) => [
            fmt(c.checkedDate),
            c.checkedBy?.name ?? c.checkedBy?.email ?? "Ukjent",
            c.notes ?? "–",
          ]),
        },
      ],
    });
  }

  return generateBrandedPdf({
    type: "formal",
    reportLabel: "Bygg/anlegg compliance",
    title: `Compliance-rapport – ${data.project.name}`,
    subtitle: `Byggherreforskriften § 7, § 10, § 15`,
    tenant: {
      name: data.tenantName,
      orgNumber: data.tenantOrgNumber,
      logoUrl: data.tenantLogoUrl,
    },
    generatedAt: new Date(),
    legalReference: "Byggherreforskriften § 7, § 10, § 15",
    sections,
  });
}
