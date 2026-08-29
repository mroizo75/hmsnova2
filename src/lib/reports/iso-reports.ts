import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { generateBrandedPdf } from "@/lib/pdf-brand";

type ReportFormat = "pdf" | "excel";
type IsoReportType = "environment" | "risk";

interface ReportResult {
  buffer: Buffer;
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
    select: { name: true, orgNumber: true, address: true, logoUrl: true },
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

  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: "ISO 14001",
    title: `Miljørapport – ${tenant?.name || "HMS Nova"}`,
    subtitle: `${aspects.length} miljøaspekter`,
    tenant: {
      name: tenant?.name || "HMS Nova",
      orgNumber: tenant?.orgNumber,
      address: tenant?.address,
      logoUrl: tenant?.logoUrl,
    },
    generatedAt: new Date(),
    legalReference: "ISO 14001:2015 kap. 6.1.2 og 9.1",
    sections: [
      {
        title: "Miljøaspekter",
        content: [
          {
            type: "table",
            headers: [
              "Miljøaspekt",
              "Kategori",
              "Påvirkning",
              "Signifikans",
              "Status",
              "Ansvarlig",
              "Neste gjennomgang",
            ],
            rows: aspects.map((aspect) => [
              aspect.title,
              aspect.category,
              aspect.impactType,
              aspect.significanceScore,
              aspect.status,
              aspect.owner?.name || "Ikke satt",
              formatDate(aspect.nextReviewDate),
            ]),
          },
        ],
      },
      ...aspects
        .filter((a) => a.measurements.length > 0)
        .map((aspect) => ({
          title: `Målinger: ${aspect.title}`,
          content: [
            {
              type: "table" as const,
              headers: ["Parameter", "Verdi", "Enhet", "Dato"],
              rows: aspect.measurements.map((m) => [
                m.parameter,
                m.measuredValue,
                m.unit ?? "–",
                formatDate(m.measurementDate),
              ]),
            },
          ],
        })),
    ],
  });

  return {
    buffer: pdfBuffer,
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

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  return {
    buffer,
    filename: excelFilename("miljo-rapport"),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

async function generateRiskPdf(tenantId: string): Promise<ReportResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, orgNumber: true, address: true, logoUrl: true },
  });

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

  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: "ISO 31000",
    title: "Risikoregister",
    subtitle: `${tenant?.name || "HMS Nova"} · ${risks.length} risikoer`,
    tenant: {
      name: tenant?.name || "HMS Nova",
      orgNumber: tenant?.orgNumber,
      address: tenant?.address,
      logoUrl: tenant?.logoUrl,
    },
    generatedAt: new Date(),
    legalReference: "ISO 31000, ISO 45001:2018 kap. 6.1",
    sections: [
      {
        title: "Risikoer",
        content: [
          {
            type: "table",
            headers: ["Tittel", "Kategori", "Score", "Residual", "Status", "Eier", "Tiltak"],
            rows: risks.map((risk) => [
              risk.title,
              risk.category,
              risk.score,
              risk.residualScore ?? "—",
              risk.status,
              risk.owner?.name || "Ikke satt",
              risk.measures.length,
            ]),
          },
        ],
      },
    ],
  });

  return {
    buffer: pdfBuffer,
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

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    filename: excelFilename("risikoregister"),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}


