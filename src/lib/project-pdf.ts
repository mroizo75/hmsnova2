/**
 * PDF-rapport for prosjekt/jobb
 * Genererer samlet HMS-rapport for et prosjekt med statistikk,
 * avvik, SJA, vernerunder og tiltak.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
    severity: number;
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
  manHours: number;
  tenantName: string;
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
  KVALITET: "Kvalitetsavvik",
  MILJO: "Miljøavvik",
  ANNET: "Annet",
};

const INCIDENT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Åpen",
  IN_PROGRESS: "Under behandling",
  CLOSED: "Lukket",
  RESOLVED: "Løst",
};

const MEASURE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ikke startet",
  IN_PROGRESS: "Pågår",
  DONE: "Fullført",
  CANCELLED: "Kansellert",
};

const SEVERITY_LABELS: Record<number, string> = {
  5: "Kritisk",
  4: "Høy",
  3: "Middels",
  2: "Lav",
  1: "Svært lav",
};

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd.MM.yyyy", { locale: nb });
}

export async function generateProjectReport(data: ProjectReportData): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(needed = 20) {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
      addHeader();
    }
  }

  function addHeader() {
    doc.setFillColor(30, 58, 138); // indigo-900
    doc.rect(0, 0, pageWidth, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("HMS Nova – Prosjektrapport", margin, 8);
    doc.text(data.tenantName, pageWidth - margin, 8, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  function addSectionTitle(title: string) {
    checkPageBreak(16);
    y += 4;
    doc.setFillColor(239, 246, 255); // blue-50
    doc.rect(margin - 2, y - 4, contentWidth + 4, 10, "F");
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.rect(margin - 2, y - 4, contentWidth + 4, 10, "D");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175); // blue-700
    doc.text(title, margin, y + 2);
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  function addField(label: string, value: string, labelWidth = 55) {
    checkPageBreak(8);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(value, contentWidth - labelWidth);
    doc.text(wrapped, margin + labelWidth, y);
    y += wrapped.length * 5 + 2;
  }

  function addKpiRow(items: Array<{ label: string; value: string; color?: string }>) {
    checkPageBreak(22);
    const cellW = contentWidth / items.length;
    items.forEach((item, i) => {
      const x = margin + i * cellW;
      doc.setDrawColor(209, 213, 219); // gray-300
      doc.setFillColor(249, 250, 251); // gray-50
      doc.roundedRect(x + 1, y, cellW - 2, 18, 2, 2, "FD");
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(item.label.toUpperCase(), x + cellW / 2, y + 5, { align: "center" });
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      if (item.color) {
        const [r, g, b] = item.color.split(",").map(Number);
        doc.setTextColor(r, g, b);
      } else {
        doc.setTextColor(17, 24, 39); // gray-900
      }
      doc.text(item.value, x + cellW / 2, y + 13, { align: "center" });
      doc.setTextColor(0, 0, 0);
    });
    y += 22;
  }

  // ── Forside ──
  addHeader();
  y = 22;

  doc.setFillColor(30, 58, 138);
  doc.rect(margin - 2, y, contentWidth + 4, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const title = doc.splitTextToSize(data.project.name, contentWidth - 4);
  doc.text(title, margin + 2, y + 8);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("HMS-RAPPORT – PROSJEKT/JOBB", margin + 2, y + 18);
  doc.setTextColor(0, 0, 0);
  y += 30;

  // ── Prosjektinformasjon ──
  addSectionTitle("Prosjektinformasjon");

  addField("Status", STATUS_LABELS[data.project.status] ?? data.project.status);
  if (data.project.code) addField("Kode", data.project.code);
  if (data.project.orderNumber) addField("Ordrenr", data.project.orderNumber);
  if (data.project.clientName) addField("Kunde", data.project.clientName);
  if (data.project.location) addField("Arbeidssted", data.project.location);
  if (data.project.projectManager) {
    addField(
      "Prosjektleder",
      data.project.projectManager.name || data.project.projectManager.email
    );
  }
  if (data.project.startDate || data.project.endDate) {
    addField("Periode", `${fmt(data.project.startDate)} → ${fmt(data.project.endDate)}`);
  }
  if (data.project.description) {
    addField("Beskrivelse", data.project.description);
  }
  addField("Rapport generert", format(new Date(), "dd.MM.yyyy HH:mm", { locale: nb }));

  // ── HSE-statistikk ──
  addSectionTitle("HSE-statistikk");

  const hseIncidents = data.incidents.filter((i) =>
    ["ULYKKE", "NESTEN", "YRKESSYKDOM"].includes(i.type)
  );
  const fatalities = hseIncidents.filter((i) => i.isFatal).length;
  const lti = hseIncidents.filter((i) => i.isLostTimeIncident).length;
  const restricted = hseIncidents.filter((i) => i.isRestrictedWork).length;
  const medical = hseIncidents.filter((i) => i.medicalAttentionRequired).length;
  const totalRecordable = fatalities + lti + restricted + medical;
  const trir =
    data.manHours > 0
      ? ((totalRecordable * 200000) / data.manHours).toFixed(2)
      : "N/A*";

  addKpiRow([
    {
      label: "Man Hours",
      value: data.manHours > 0 ? Math.round(data.manHours).toLocaleString("nb-NO") : "—",
    },
    {
      label: "Fatalities",
      value: fatalities.toString(),
      color: fatalities > 0 ? "220,38,38" : "17,24,39",
    },
    {
      label: "LTI",
      value: lti.toString(),
      color: lti > 0 ? "220,38,38" : "17,24,39",
    },
    {
      label: "Lost Workdays",
      value: hseIncidents.reduce((s, i) => s + (i.lostWorkdays ?? 0), 0).toString(),
    },
    {
      label: "Restricted Work",
      value: restricted.toString(),
    },
    {
      label: "Medical",
      value: medical.toString(),
    },
  ]);

  addKpiRow([
    {
      label: "Total Recordable",
      value: totalRecordable.toString(),
    },
    {
      label: "TRIR",
      value: trir.toString(),
      color:
        trir === "N/A*"
          ? "107,114,128"
          : parseFloat(trir) === 0
          ? "21,128,61"
          : parseFloat(trir) < 3
          ? "29,78,216"
          : parseFloat(trir) < 5
          ? "180,83,9"
          : "220,38,38",
    },
    { label: "Avvik totalt", value: data.incidents.length.toString() },
    { label: "SJA", value: data.sjaAnalyses.length.toString() },
    { label: "Vernerunder", value: data.inspections.length.toString() },
    {
      label: "Åpne tiltak",
      value: data.measures.filter((m) => m.status !== "DONE" && m.status !== "CANCELLED").length.toString(),
    },
  ]);

  if (data.manHours === 0) {
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(
      "* TRIR krever timeregistrering. Aktiver timeregistrering og knytt timer til prosjektet.",
      margin,
      y
    );
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `TRIR = (Fatalities + LTI + Restricted Work + Medical) × 200 000 / Man Hours (${
      totalRecordable
    } × 200 000 / ${data.manHours > 0 ? Math.round(data.manHours) : "—"})`,
    margin,
    y
  );
  doc.setTextColor(0, 0, 0);
  y += 8;

  // ── Avvik ──
  if (data.incidents.length > 0) {
    addSectionTitle(`Avvik og hendelser (${data.incidents.length})`);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Nr", "Tittel", "Type", "Dato", "Alv.", "Status"]],
      body: data.incidents.map((i) => [
        i.avviksnummer ?? "—",
        i.title,
        INCIDENT_TYPE_LABELS[i.type] ?? i.type,
        fmt(i.occurredAt),
        SEVERITY_LABELS[i.severity] ?? String(i.severity),
        INCIDENT_STATUS_LABELS[i.status] ?? i.status,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 18 },
        5: { cellWidth: 28 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── SJA ──
  if (data.sjaAnalyses.length > 0) {
    checkPageBreak(30);
    addSectionTitle(`Sikker Jobb Analyser (${data.sjaAnalyses.length})`);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["SJA-nr", "Tittel", "Arbeidssted", "Dato", "Status"]],
      body: data.sjaAnalyses.map((s) => [
        s.sjaNummer ?? "—",
        s.title,
        s.workLocation,
        fmt(s.plannedDate),
        s.status,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [255, 251, 235] },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Vernerunder ──
  if (data.inspections.length > 0) {
    checkPageBreak(30);
    addSectionTitle(`Vernerunder og inspeksjoner (${data.inspections.length})`);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Tittel", "Type", "Sted", "Dato", "Status"]],
      body: data.inspections.map((i) => [
        i.title,
        i.type,
        i.location ?? "—",
        fmt(i.scheduledDate),
        i.status,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [240, 253, 244] },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Tiltak ──
  if (data.measures.length > 0) {
    checkPageBreak(30);
    addSectionTitle(`Tiltak (${data.measures.length})`);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Tittel", "Kategori", "Frist", "Status"]],
      body: data.measures.map((m) => [
        m.title,
        m.category,
        fmt(m.dueAt),
        MEASURE_STATUS_LABELS[m.status] ?? m.status,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 245, 255] },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === "body") {
          const val = data.cell.raw as string;
          if (val === "Fullført") {
            data.cell.styles.textColor = [21, 128, 61];
          } else if (val === "Pågår") {
            data.cell.styles.textColor = [29, 78, 216];
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Sidenummer ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Side ${i} av ${totalPages}  ·  Generert ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: nb })}  ·  HMS Nova`,
      pageWidth / 2,
      pageHeight - 7,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
