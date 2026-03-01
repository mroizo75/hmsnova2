import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

type ReportFormat = "pdf" | "excel";
type IsoReportType = "environment" | "risk";

interface ReportResult {
  buffer: ArrayBuffer;
  filename: string;
  contentType: string;
}

const pdfFilename = (prefix: string) =>
  `${prefix}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
const excelFilename = (prefix: string) =>
  `${prefix}-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`;

const formatDate = (date?: Date | null) =>
  date ? format(new Date(date), "d. MMM yyyy", { locale: nb }) : "—";

export async function generateIsoReport(
  tenantId: string,
  type: IsoReportType,
  format: ReportFormat = "pdf"
): Promise<ReportResult> {
  switch (type) {
    case "environment":
      return format === "pdf"
        ? generateEnvironmentPdf(tenantId)
        : generateEnvironmentExcel(tenantId);
    case "risk":
      return format === "pdf"
        ? generateRiskPdf(tenantId)
        : generateRiskExcel(tenantId);
    default:
      throw new Error("Unsupported report type");
  }
}

async function generateEnvironmentPdf(tenantId: string): Promise<ReportResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  const aspects = await prisma.environmentalAspect.findMany({
    where: { tenantId },
    include: {
      owner: { select: { name: true, email: true } },
      measurements: {
        orderBy: { measurementDate: "desc" },
        take: 3,
      },
      measures: {
        select: { id: true, title: true, status: true, dueAt: true },
      },
    },
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(`Miljørapport - ${tenant?.name || "HMS Nova"}`, 40, 40);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generert: ${formatDate(new Date())}`, 40, 60);
  pdf.text(`Antall miljøaspekter: ${aspects.length}`, 40, 80);

  const tableRows = aspects.map((aspect) => [
    aspect.title,
    aspect.category,
    aspect.impactType,
    aspect.significanceScore,
    aspect.status,
    aspect.owner?.name || "Ikke satt",
    formatDate(aspect.nextReviewDate),
  ]);

  autoTable(pdf, {
    startY: 100,
    head: [
      [
        "Miljøaspekt",
        "Kategori",
        "Påvirkning",
        "Signifikans",
        "Status",
        "Ansvarlig",
        "Neste gjennomgang",
      ],
    ],
    body: tableRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [5, 150, 105] },
  });

  let currentY = (pdf as any).lastAutoTable.finalY + 20;
  pdf.setFont("helvetica", "bold");
  pdf.text("Siste målinger", 40, currentY);
  currentY += 15;
  pdf.setFont("helvetica", "normal");

  aspects.forEach((aspect) => {
    if (aspect.measurements.length === 0) return;
    if (currentY > 720) {
      pdf.addPage();
      currentY = 40;
    }
    pdf.setFont("helvetica", "bold");
    pdf.text(aspect.title, 40, currentY);
    pdf.setFont("helvetica", "normal");
    currentY += 12;
    aspect.measurements.forEach((measurement) => {
      pdf.text(
        `• ${measurement.parameter}: ${measurement.measuredValue}${
          measurement.unit ? ` ${measurement.unit}` : ""
        } (${formatDate(measurement.measurementDate)})`,
        50,
        currentY
      );
      currentY += 12;
    });
    currentY += 6;
  });

  const buffer = pdf.output("arraybuffer") as ArrayBuffer;

  return {
    buffer,
    filename: pdfFilename("miljo-rapport"),
    contentType: "application/pdf",
  };
}

async function generateEnvironmentExcel(tenantId: string): Promise<ReportResult> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Miljø");
  sheet.columns = [
    { header: "Miljøaspekt", key: "title", width: 30 },
    { header: "Kategori", key: "category", width: 18 },
    { header: "Påvirkning", key: "impact", width: 16 },
    { header: "Signifikans", key: "score", width: 14 },
    { header: "Status", key: "status", width: 16 },
    { header: "Ansvarlig", key: "owner", width: 26 },
    { header: "Neste gjennomgang", key: "nextReview", width: 20 },
  ];

  const aspects = await prisma.environmentalAspect.findMany({
    where: { tenantId },
    include: {
      owner: { select: { name: true } },
    },
  });

  sheet.addRows(
    aspects.map((aspect) => ({
      title: aspect.title,
      category: aspect.category,
      impact: aspect.impactType,
      score: aspect.significanceScore,
      status: aspect.status,
      owner: aspect.owner?.name || "Ikke satt",
      nextReview: formatDate(aspect.nextReviewDate),
    }))
  );

  sheet.getRow(1).font = { bold: true };

  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;

  return {
    buffer,
    filename: excelFilename("miljo-rapport"),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

async function generateRiskPdf(tenantId: string): Promise<ReportResult> {
  const risks = await prisma.risk.findMany({
    where: { tenantId },
    include: {
      owner: { select: { name: true } },
      measures: {
        select: { id: true },
      },
      controls: true,
    },
  });

  const pdf = new jsPDF();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Risikoregister (ISO 31000)", 20, 25);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Risikoer totalt: ${risks.length}`, 20, 45);

  autoTable(pdf, {
    startY: 60,
    head: [
      ["Tittel", "Kategori", "Score", "Residual", "Status", "Eier", "Tiltak"],
    ],
    body: risks.map((risk) => [
      risk.title,
      risk.category,
      risk.score,
      risk.residualScore ?? "—",
      risk.status,
      risk.owner?.name || "Ikke satt",
      risk.measures.length,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 118, 110] },
  });

  const buffer = pdf.output("arraybuffer") as ArrayBuffer;
  return {
    buffer,
    filename: pdfFilename("risikoregister"),
    contentType: "application/pdf",
  };
}

async function generateRiskExcel(tenantId: string): Promise<ReportResult> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Risiko");
  sheet.columns = [
    { header: "Tittel", key: "title", width: 32 },
    { header: "Kategori", key: "category", width: 18 },
    { header: "Område", key: "area", width: 18 },
    { header: "Score", key: "score", width: 10 },
    { header: "Residual", key: "residual", width: 10 },
    { header: "Status", key: "status", width: 12 },
    { header: "Eier", key: "owner", width: 24 },
    { header: "Neste gjennomgang", key: "nextReview", width: 20 },
  ];

  const risks = await prisma.risk.findMany({
    where: { tenantId },
    include: {
      owner: { select: { name: true } },
    },
  });

  sheet.addRows(
    risks.map((risk) => ({
      title: risk.title,
      category: risk.category,
      area: risk.area || risk.location || "—",
      score: risk.score,
      residual: risk.residualScore ?? "—",
      status: risk.status,
      owner: risk.owner?.name || "Ikke satt",
      nextReview: formatDate(risk.nextReviewDate),
    }))
  );
  sheet.getRow(1).font = { bold: true };

  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  return {
    buffer,
    filename: excelFilename("risikoregister"),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}


