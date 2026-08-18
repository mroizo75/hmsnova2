import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";

export interface QuarterlyReportData {
  title: string;
  period: string;
  generatedAt: string;
  summary: {
    totalIndustries: number;
    totalTenants: number;
    totalEmployees: number;
    totalIncidents: number;
    avgTrir: number | null;
    avgTrainingCompliance: number | null;
  };
  industries: IndustryReportRow[];
  highlights: ReportHighlight[];
}

interface IndustryReportRow {
  industry: string;
  tenantCount: number;
  employeeCount: number;
  incidentCount: number;
  trir: number | null;
  ltir: number | null;
  avgMttr: number | null;
  trainingCompliance: number | null;
  measuresCompletionRate: number | null;
  risksOpen: number;
  highRiskChemicals: number;
}

interface ReportHighlight {
  type: "warning" | "positive" | "trend";
  text: string;
}

export async function generateQuarterlyReportData(period?: string): Promise<QuarterlyReportData> {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const currentPeriod = period || `${year}-Q${quarter}`;

  const snapshots = await prisma.industrySnapshot.findMany({
    orderBy: { createdAt: "desc" },
  });

  const latestByIndustry = new Map<string, typeof snapshots[0]>();
  for (const s of snapshots) {
    if (!latestByIndustry.has(s.industry)) {
      latestByIndustry.set(s.industry, s);
    }
  }

  const industries: IndustryReportRow[] = Array.from(latestByIndustry.values()).map((s) => ({
    industry: s.industry,
    tenantCount: s.tenantCount,
    employeeCount: s.employeeCount,
    incidentCount: s.incidentCount,
    trir: s.trir,
    ltir: s.ltir,
    avgMttr: s.avgMttr,
    trainingCompliance: s.trainingComplianceRate,
    measuresCompletionRate: s.measuresTotal > 0
      ? Math.round((s.measuresCompleted / s.measuresTotal) * 100)
      : null,
    risksOpen: s.risksOpenCount,
    highRiskChemicals: s.highRiskChemicalCount,
  }));

  const totalTenants = industries.reduce((s, i) => s + i.tenantCount, 0);
  const totalEmployees = industries.reduce((s, i) => s + i.employeeCount, 0);
  const totalIncidents = industries.reduce((s, i) => s + i.incidentCount, 0);

  const trirValues = industries.filter((i) => i.trir != null).map((i) => i.trir!);
  const complianceValues = industries.filter((i) => i.trainingCompliance != null).map((i) => i.trainingCompliance!);

  const avgTrir = trirValues.length > 0 ? trirValues.reduce((a, b) => a + b, 0) / trirValues.length : null;
  const avgTrainingCompliance = complianceValues.length > 0 ? complianceValues.reduce((a, b) => a + b, 0) / complianceValues.length : null;

  const highlights: ReportHighlight[] = [];

  for (const ind of industries) {
    if (ind.trir != null && ind.trir > 5) {
      highlights.push({
        type: "warning",
        text: `${ind.industry}: TRIR ${ind.trir.toFixed(1)} — over akseptabelt niva (5.0)`,
      });
    }
    if (ind.trainingCompliance != null && ind.trainingCompliance < 50) {
      highlights.push({
        type: "warning",
        text: `${ind.industry}: Kun ${ind.trainingCompliance.toFixed(0)}% opplaeringsdekning`,
      });
    }
    if (ind.measuresCompletionRate != null && ind.measuresCompletionRate > 80) {
      highlights.push({
        type: "positive",
        text: `${ind.industry}: ${ind.measuresCompletionRate}% tiltaksgjennomforing`,
      });
    }
  }

  const trends = await prisma.trendDataPoint.findMany({
    where: { changePercent: { not: null } },
    orderBy: { period: "desc" },
    take: 50,
  });

  for (const t of trends.slice(0, 5)) {
    if (Math.abs(t.changePercent!) > 15) {
      highlights.push({
        type: "trend",
        text: `${t.industry || "Global"} ${t.metric}: ${t.changePercent! > 0 ? "+" : ""}${t.changePercent!.toFixed(0)}% endring`,
      });
    }
  }

  return {
    title: `HMS Nova Safety Intelligence — ${currentPeriod}`,
    period: currentPeriod,
    generatedAt: now.toISOString(),
    summary: { totalIndustries: industries.length, totalTenants, totalEmployees, totalIncidents, avgTrir, avgTrainingCompliance },
    industries,
    highlights: highlights.slice(0, 15),
  };
}

export async function generateQuarterlyReportExcel(period?: string): Promise<Buffer> {
  const data = await generateQuarterlyReportData(period);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova Safety Intelligence";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Oppsummering");
  summary.columns = [
    { header: "Felt", key: "field", width: 30 },
    { header: "Verdi", key: "value", width: 20 },
  ];
  summary.addRow({ field: "Rapport", value: data.title });
  summary.addRow({ field: "Generert", value: new Date(data.generatedAt).toLocaleString("nb-NO") });
  summary.addRow({ field: "Bransjer dekket", value: data.summary.totalIndustries });
  summary.addRow({ field: "Totalt bedrifter", value: data.summary.totalTenants });
  summary.addRow({ field: "Totalt ansatte", value: data.summary.totalEmployees });
  summary.addRow({ field: "Totalt avvik", value: data.summary.totalIncidents });
  summary.addRow({ field: "Snitt TRIR", value: data.summary.avgTrir?.toFixed(2) ?? "N/A" });
  summary.addRow({ field: "Snitt opplaeringsdekning", value: data.summary.avgTrainingCompliance ? `${data.summary.avgTrainingCompliance.toFixed(0)}%` : "N/A" });

  summary.addRow({});
  summary.addRow({ field: "HIGHLIGHTS", value: "" });
  for (const h of data.highlights) {
    summary.addRow({ field: `[${h.type.toUpperCase()}]`, value: h.text });
  }

  const detail = workbook.addWorksheet("Bransjedetalj");
  detail.columns = [
    { header: "Bransje", key: "industry", width: 25 },
    { header: "Bedrifter", key: "tenantCount", width: 12 },
    { header: "Ansatte", key: "employeeCount", width: 12 },
    { header: "Avvik", key: "incidentCount", width: 10 },
    { header: "TRIR", key: "trir", width: 10 },
    { header: "LTIR", key: "ltir", width: 10 },
    { header: "Snitt lukketid (dager)", key: "avgMttr", width: 20 },
    { header: "Opplaering (%)", key: "trainingCompliance", width: 15 },
    { header: "Tiltak fullfort (%)", key: "measuresCompletionRate", width: 18 },
    { header: "Apne risikoer", key: "risksOpen", width: 14 },
    { header: "Hoyrisiko kjemikalier", key: "highRiskChemicals", width: 20 },
  ];

  for (const ind of data.industries) {
    detail.addRow({
      industry: ind.industry,
      tenantCount: ind.tenantCount,
      employeeCount: ind.employeeCount,
      incidentCount: ind.incidentCount,
      trir: ind.trir?.toFixed(2) ?? "",
      ltir: ind.ltir?.toFixed(2) ?? "",
      avgMttr: ind.avgMttr?.toFixed(1) ?? "",
      trainingCompliance: ind.trainingCompliance?.toFixed(0) ?? "",
      measuresCompletionRate: ind.measuresCompletionRate ?? "",
      risksOpen: ind.risksOpen,
      highRiskChemicals: ind.highRiskChemicals,
    });
  }

  detail.getRow(1).font = { bold: true };
  summary.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
