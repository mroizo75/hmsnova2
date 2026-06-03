/**
 * PDF-generator for brannøvelsesrapport
 *
 * Dokumentasjonskrav — Forskrift om brannforebygging § 13:
 * - Dato og tidspunkt
 * - Scenario for øvelsen
 * - Antall deltakere
 * - Observasjoner under øvelsen
 * - Evaluering og forbedringspunkter
 * - Signert/bekreftet av øvingsleder
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
}

function formatEvacTime(seconds: number): string {
  if (seconds < 60) return `${seconds} sekunder`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m} min ${s} sek` : `${m} minutter`;
}

function addSection(pdf: jsPDF, title: string, yPos: number, pageWidth: number): number {
  pdf.setFillColor(220, 38, 38);
  pdf.rect(20, yPos, pageWidth - 40, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, 23, yPos + 5);
  pdf.setTextColor(0, 0, 0);
  return yPos + 12;
}

function addField(
  pdf: jsPDF,
  label: string,
  value: string,
  yPos: number,
  pageWidth: number,
): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(`${label}:`, 20, yPos);
  pdf.setFont("helvetica", "normal");
  const lines = pdf.splitTextToSize(value, pageWidth - 85);
  pdf.text(lines, 75, yPos);
  return yPos + Math.max(lines.length * 5, 6) + 2;
}

function checkPageBreak(pdf: jsPDF, yPos: number, needed = 20): number {
  if (yPos > 265 - needed) {
    pdf.addPage();
    return 20;
  }
  return yPos;
}

export async function generateFireDrillReport(data: FireDrillReportData): Promise<Buffer> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 20;

  // ── Header strip ──────────────────────────────────────────────
  pdf.setFillColor(220, 38, 38);
  pdf.rect(0, 0, pageWidth, 16, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("HMS NOVA", 20, 10);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Brannøvelsesrapport — Forskrift om brannforebygging § 12 og § 13", pageWidth / 2, 10, {
    align: "center",
  });
  pdf.text(data.tenantName, pageWidth - 20, 10, { align: "right" });
  pdf.setTextColor(0, 0, 0);
  y = 24;

  // ── Tittel ──────────────────────────────────────────────────────
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.title, 20, y);
  y += 8;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `${TYPE_LABELS[data.drillType] ?? data.drillType}${data.isAnnounced ? "" : " (uvarslet)"}`,
    20,
    y,
  );
  pdf.setTextColor(0, 0, 0);
  y += 12;

  // ── SEKSJON 1: Øvelsesdetaljer ─────────────────────────────────
  y = addSection(pdf, "1. Øvelsesdetaljer", y, pageWidth);
  y = addField(
    pdf,
    "Planlagt dato",
    format(data.plannedDate, "d. MMMM yyyy", { locale: nb }),
    y,
    pageWidth,
  );
  if (data.completedAt) {
    y = addField(
      pdf,
      "Gjennomføringsdato",
      format(data.completedAt, "d. MMMM yyyy", { locale: nb }),
      y,
      pageWidth,
    );
  }
  y = addField(pdf, "Lokasjon", data.location, y, pageWidth);
  y = addField(pdf, "Øvingsleder", data.responsibleName, y, pageWidth);
  if (data.actualParticipantCount != null) {
    y = addField(pdf, "Antall deltakere", String(data.actualParticipantCount), y, pageWidth);
  }
  if (data.evacuationTimeSeconds != null) {
    y = addField(
      pdf,
      "Evakueringstid",
      formatEvacTime(data.evacuationTimeSeconds),
      y,
      pageWidth,
    );
  }
  y += 4;

  // ── SEKSJON 2: Mål og scenario (§ 12) ─────────────────────────
  y = checkPageBreak(pdf, y, 30);
  y = addSection(pdf, "2. Mål for øvelsen — § 12b/c/d", y, pageWidth);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const objLines = pdf.splitTextToSize(data.objectives, pageWidth - 40);
  pdf.text(objLines, 20, y);
  y += objLines.length * 5 + 6;

  if (data.scenario) {
    y = checkPageBreak(pdf, y, 20);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Scenario:", 20, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    const scenLines = pdf.splitTextToSize(data.scenario, pageWidth - 40);
    pdf.text(scenLines, 20, y);
    y += scenLines.length * 5 + 6;
  }

  // ── SEKSJON 3: Observasjoner (§ 13) ───────────────────────────
  if (data.observations) {
    y = checkPageBreak(pdf, y, 30);
    y = addSection(pdf, "3. Observasjoner under øvelsen — § 13", y, pageWidth);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const obsLines = pdf.splitTextToSize(data.observations, pageWidth - 40);
    pdf.text(obsLines, 20, y);
    y += obsLines.length * 5 + 6;
  }

  // ── SEKSJON 4: Evaluering (§ 12e + § 13) ───────────────────────
  if (data.objectivesAchieved || data.evaluation || data.improvementPoints) {
    y = checkPageBreak(pdf, y, 40);
    y = addSection(pdf, "4. Evaluering — § 12e og § 13", y, pageWidth);

    if (data.objectivesAchieved) {
      y = addField(
        pdf,
        "Måloppnåelse",
        OBJECTIVES_ACHIEVED_LABELS[data.objectivesAchieved] ?? data.objectivesAchieved,
        y,
        pageWidth,
      );
    }

    if (data.evaluation) {
      y = checkPageBreak(pdf, y, 20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Evaluering og vurdering:", 20, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      const evalLines = pdf.splitTextToSize(data.evaluation, pageWidth - 40);
      pdf.text(evalLines, 20, y);
      y += evalLines.length * 5 + 5;
    }

    if (data.improvementPoints) {
      y = checkPageBreak(pdf, y, 20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Forbedringspunkter:", 20, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      const impLines = pdf.splitTextToSize(data.improvementPoints, pageWidth - 40);
      pdf.text(impLines, 20, y);
      y += impLines.length * 5 + 5;
    }

    if (data.procedureChangesNeeded && data.procedureChangesDesc) {
      y = checkPageBreak(pdf, y, 20);
      pdf.setFillColor(255, 237, 213);
      pdf.rect(20, y - 2, pageWidth - 40, 8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Prosedyreendringer nødvendig:", 22, y + 4);
      y += 10;
      pdf.setFont("helvetica", "normal");
      const procLines = pdf.splitTextToSize(data.procedureChangesDesc, pageWidth - 40);
      pdf.text(procLines, 20, y);
      y += procLines.length * 5 + 6;
    }
    y += 4;
  }

  // ── SEKSJON 5: Oppfølgingstiltak ────────────────────────────────
  if (data.measures.length > 0) {
    y = checkPageBreak(pdf, y, 30);
    y = addSection(pdf, "5. Oppfølgingstiltak — § 12e", y, pageWidth);

    const measuresData = data.measures.map((m) => [
      m.title,
      format(new Date(m.dueAt), "dd.MM.yyyy", { locale: nb }),
      m.responsibleName ?? "—",
      m.status === "DONE" ? "Fullført" : m.status === "IN_PROGRESS" ? "Pågår" : "Venter",
    ]);

    autoTable(pdf, {
      startY: y,
      head: [["Tiltak", "Frist", "Ansvarlig", "Status"]],
      body: measuresData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 85 },
        1: { cellWidth: 25 },
        2: { cellWidth: 45 },
        3: { cellWidth: 25 },
      },
    });
    y = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
  }

  // ── SEKSJON 6: Signatur / bekreftelse ─────────────────────────
  y = checkPageBreak(pdf, y, 40);
  y = addSection(pdf, "6. Bekreftet av øvingsleder — § 13", y, pageWidth);

  if (data.evaluatedAt && data.evaluatedByName) {
    y = addField(
      pdf,
      "Evaluert av",
      data.evaluatedByName,
      y,
      pageWidth,
    );
    y = addField(
      pdf,
      "Evalueringsdato",
      format(data.evaluatedAt, "d. MMMM yyyy", { locale: nb }),
      y,
      pageWidth,
    );
  }

  y += 10;
  pdf.setDrawColor(0, 0, 0);
  pdf.line(20, y, 100, y);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text("Øvingslederens underskrift", 20, y + 5);
  pdf.text("Dato", 120, y + 5);
  pdf.line(110, y, 175, y);
  pdf.setTextColor(0, 0, 0);
  y += 14;

  // ── Footer ────────────────────────────────────────────────────────
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Generert av HMS Nova — ${format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })} — Side ${i} av ${pageCount}`,
      pageWidth / 2,
      290,
      { align: "center" },
    );
    pdf.text(
      "Dokument utarbeidet i henhold til Forskrift om brannforebygging § 12 og § 13",
      pageWidth / 2,
      294,
      { align: "center" },
    );
    pdf.setTextColor(0, 0, 0);
  }

  return Buffer.from(pdf.output("arraybuffer"));
}
