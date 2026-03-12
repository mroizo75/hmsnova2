import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type {
  ConstructionComplianceValidation,
  PreNotificationRequirementResult,
} from "@/lib/construction-compliance-rules";

interface ConstructionCompliancePdfData {
  tenantName: string;
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
    organizationChart: string | null;
    progressPlan: string | null;
    specificMeasures: string | null;
    changeProcedure: string | null;
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
    builderAddress: string | null;
    builderPhone: string | null;
    builderRepresentativeName: string | null;
    builderRepresentativePhone: string | null;
    expectedStartDate: Date;
    expectedEndDate: Date | null;
    maxWorkersSimultaneous: number | null;
    plannedBusinessesCount: number | null;
    visibleAtSite: boolean;
    coordinators: string | null;
    designers: string | null;
    contractors: string | null;
  } | null;
  rosterEntries: Array<{
    fullName: string;
    birthDate: Date;
    employerName: string;
    employerOrgNumber: string | null;
    hiringCompanyName: string | null;
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
  if (!date) return "—";
  return format(new Date(date), "dd.MM.yyyy", { locale: nb });
}

export async function generateConstructionCompliancePdf(
  data: ConstructionCompliancePdfData
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkBreak = (height = 20) => {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("HMS Nova – Bygg/anlegg compliance", margin, 8);
    doc.text(data.tenantName, pageWidth - margin, 8, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  const section = (title: string) => {
    checkBreak(12);
    y += 4;
    doc.setFillColor(239, 246, 255);
    doc.rect(margin - 1, y - 4, contentWidth + 2, 9, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text(title, margin, y + 2);
    doc.setTextColor(0, 0, 0);
    y += 8;
  };

  const field = (label: string, value: string) => {
    checkBreak(8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(value || "—", contentWidth - 56);
    doc.text(wrapped, margin + 56, y);
    y += wrapped.length * 4 + 2;
  };

  drawHeader();
  y = 22;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Bygg/anlegg compliance-rapport", margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Prosjekt: ${data.project.name}`, margin, y);
  y += 5;
  doc.text(`Generert: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: nb })}`, margin, y);
  y += 8;

  section("Prosjekt og kontrollstatus");
  field("Prosjekt", data.project.name);
  field("Arbeidssted", data.project.location ?? "—");
  field("Byggherre/kunde", data.project.clientName ?? "—");
  field("Daglig kontrollstatus", data.isDailyCheckMissing ? "Mangler kontroll i dag" : "Oppdatert i dag");
  field("Siste kontroll", data.rosterChecks[0] ? fmt(data.rosterChecks[0].checkedDate) : "Ingen registrert");

  section("Compliance-status (mikrooversikt)");
  field("SHA-plan klar for aktiv status", data.complianceValidation.shaReadyForActive ? "Ja" : "Nei");
  if (!data.complianceValidation.shaReadyForActive) {
    field(
      "SHA-plan mangler",
      data.complianceValidation.shaMissingFieldsForActive.length
        ? data.complianceValidation.shaMissingFieldsForActive.join(", ")
        : "Se felter i rapport"
    );
  }
  field(
    "Forhåndsmelding klar for innsending",
    data.complianceValidation.preNotificationReadyForSubmission ? "Ja" : "Nei"
  );
  if (!data.complianceValidation.preNotificationReadyForSubmission) {
    field(
      "Forhåndsmelding mangler",
      data.complianceValidation.preNotificationMissingFieldsForSubmission.length
        ? data.complianceValidation.preNotificationMissingFieldsForSubmission.join(", ")
        : "Se felter i rapport"
    );
  }
  field(
    "Meldeplikt forhåndsmelding (§ 10)",
    data.preNotificationRequirement.isRequired ? "Ja" : "Nei"
  );
  if (data.preNotificationRequirement.isRequired) {
    field(
      "Meldegrunnlag",
      data.preNotificationRequirement.reasons.length
        ? data.preNotificationRequirement.reasons.join(" / ")
        : "Krav utløst"
    );
    field(
      "Estimert varighet (virkedager)",
      data.preNotificationRequirement.workDays !== null
        ? String(data.preNotificationRequirement.workDays)
        : "Ikke beregnet"
    );
    field(
      "Estimert arbeidsmengde (dagsverk)",
      data.preNotificationRequirement.estimatedWorkerDays !== null
        ? String(data.preNotificationRequirement.estimatedWorkerDays)
        : "Ikke beregnet"
    );
    field(
      "Frist for innsending",
      data.preNotificationRequirement.submissionDeadline
        ? fmt(new Date(data.preNotificationRequirement.submissionDeadline))
        : "Ikke beregnet"
    );
    field(
      "Friststatus",
      data.preNotificationRequirement.isDeadlinePassed
        ? "Frist passert"
        : data.preNotificationRequirement.isDeadlineSoon
        ? "Frist nærmer seg"
        : "Innen frist"
    );
  }

  section("SHA-plan");
  if (!data.shaPlan) {
    field("Status", "Ikke registrert");
  } else {
    field("Status", data.shaPlan.status);
    field("Byggherre", data.shaPlan.builderName ?? "—");
    field("Byggherres representant", data.shaPlan.builderRepresentativeName ?? "—");
    field("Kontakt representant", data.shaPlan.builderRepresentativeContact ?? "—");
    field("Koordinator prosjektering (KP)", data.shaPlan.coordinatorPlanningName ?? "—");
    field("Koordinator utførelse (KU)", data.shaPlan.coordinatorExecutionName ?? "—");
    field("Rollekonflikt dokumentert", data.shaPlan.conflictAssessmentDocumented ? "Ja" : "Nei");
    field("Tilgjengelig på byggeplass", data.shaPlan.availableOnSite ? "Ja" : "Nei");
    field("Sist gjennomgått", fmt(data.shaPlan.lastReviewedAt));
  }

  section("Forhåndsmelding");
  if (!data.preNotification) {
    field("Status", "Ikke registrert");
  } else {
    field("Status", data.preNotification.status);
    field("Adresse byggeplass", data.preNotification.projectAddress);
    field("Prosjektets art", data.preNotification.projectType);
    field("Byggherre", data.preNotification.builderName);
    field("Byggherre org.nr", data.preNotification.builderOrgNumber ?? "—");
    field("Byggherre telefon", data.preNotification.builderPhone ?? "—");
    field("Startdato", fmt(data.preNotification.expectedStartDate));
    field("Sluttdato", fmt(data.preNotification.expectedEndDate));
    field(
      "Maks arbeidstakere samtidig",
      data.preNotification.maxWorkersSimultaneous?.toString() ?? "—"
    );
    field("Planlagt antall virksomheter", data.preNotification.plannedBusinessesCount?.toString() ?? "—");
    field("Synlig på byggeplass", data.preNotification.visibleAtSite ? "Ja" : "Nei");
  }

  section(`Elektronisk oversiktsliste (${data.rosterEntries.length})`);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Navn", "Arbeidsgiver", "HMS-kort", "Start", "Slutt", "Status"]],
    body: data.rosterEntries.map((entry) => [
      entry.fullName,
      entry.employerName,
      entry.hmsCardNumber ?? "Mangler",
      fmt(entry.startedAtSiteDate),
      fmt(entry.endedAtSiteDate),
      entry.isActive ? "Aktiv" : "Avsluttet",
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  section("Daglig kontrollhistorikk");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Dato", "Kontrollert av", "Notat"]],
    body: data.rosterChecks.length
      ? data.rosterChecks.map((check) => [
          fmt(check.checkedDate),
          check.checkedBy?.name || check.checkedBy?.email || "Ukjent",
          check.notes || "—",
        ])
      : [["—", "—", "Ingen kontroller registrert"]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 253, 244] },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Side ${i} av ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
