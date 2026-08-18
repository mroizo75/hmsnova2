import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { htmlToPdf } from "@/lib/adobe-pdf";
import { getLogoBase64, resolveImageToBase64 } from "@/lib/pdf-brand";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { nb } from "date-fns/locale";

const TYPE_LABELS: Record<string, string> = {
  VERNERUNDE: "Vernerunde",
  HMS_INSPEKSJON: "HMS-inspeksjon",
  SHA_PLAN: "SHA-plan",
  SIKKERHETSVANDRING: "Sikkerhetsvandring",
  ANDRE: "Annet",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planlagt",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Fullført",
  CANCELLED: "Avbrutt",
};

const FINDING_STATUS_LABELS: Record<string, string> = {
  OPEN: "Åpen",
  IN_PROGRESS: "Under arbeid",
  RESOLVED: "Løst",
  CLOSED: "Lukket",
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "Lav",
  2: "Moderat",
  3: "Betydelig",
  4: "Alvorlig",
  5: "Kritisk",
};

const SEVERITY_COLORS: Record<number, string> = {
  1: "#22c55e",
  2: "#84cc16",
  3: "#f59e0b",
  4: "#f97316",
  5: "#dc2626",
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#22c55e",
  CANCELLED: "#6b7280",
};

const FINDING_STATUS_COLORS: Record<string, string> = {
  OPEN: "#dc2626",
  IN_PROGRESS: "#f59e0b",
  RESOLVED: "#22c55e",
  CLOSED: "#6b7280",
};

function svgHBar(
  data: { label: string; value: number; color: string }[],
  width = 540,
  barHeight = 26,
  gap = 8
): string {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const labelWidth = 120;
  const valWidth = 40;
  const trackWidth = width - labelWidth - valWidth - 16;
  const totalHeight = data.length * (barHeight + gap);

  const bars = data
    .map((d, i) => {
      const y = i * (barHeight + gap);
      const fillW = Math.max((d.value / maxVal) * trackWidth, d.value > 0 ? 4 : 0);
      return `
        <text x="${labelWidth - 8}" y="${y + barHeight / 2 + 4}" text-anchor="end" font-size="12" fill="#374151" font-family="Arial, sans-serif">${d.label}</text>
        <rect x="${labelWidth}" y="${y}" width="${trackWidth}" height="${barHeight}" rx="4" fill="#f3f4f6"/>
        <rect x="${labelWidth}" y="${y}" width="${fillW}" height="${barHeight}" rx="4" fill="${d.color}"/>
        <text x="${labelWidth + trackWidth + 8}" y="${y + barHeight / 2 + 4}" font-size="12" fill="#111827" font-weight="bold" font-family="Arial, sans-serif">${d.value}</text>
      `;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function svgMonthlyTrend(
  months: { label: string; inspections: number; findings: number }[],
  width = 560,
  height = 160
): string {
  if (months.length === 0) return "";
  const padL = 40, padR = 20, padT = 16, padB = 36;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const maxVal = Math.max(...months.flatMap((m) => [m.inspections, m.findings]), 1);
  const stepX = chartW / Math.max(months.length - 1, 1);

  const pointsInsp = months
    .map((m, i) => `${padL + i * stepX},${padT + chartH - (m.inspections / maxVal) * chartH}`)
    .join(" ");
  const pointsFnd = months
    .map((m, i) => `${padL + i * stepX},${padT + chartH - (m.findings / maxVal) * chartH}`)
    .join(" ");

  const xLabels = months
    .map(
      (m, i) =>
        `<text x="${padL + i * stepX}" y="${height - 8}" text-anchor="middle" font-size="10" fill="#6b7280" font-family="Arial, sans-serif">${m.label}</text>`
    )
    .join("");

  const yLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const y = padT + chartH - frac * chartH;
    const val = Math.round(frac * maxVal);
    return `<line x1="${padL}" x2="${padL + chartW}" y1="${y}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#9ca3af" font-family="Arial, sans-serif">${val}</text>`;
  }).join("");

  const dots = (pts: string, color: string) =>
    months
      .map((_, i) => {
        const [cx, cy] = pts.split(" ")[i].split(",");
        return `<circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/>`;
      })
      .join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${yLines}
    <polyline points="${pointsInsp}" fill="none" stroke="#14532d" stroke-width="2.5" stroke-linejoin="round"/>
    <polyline points="${pointsFnd}" fill="none" stroke="#dc2626" stroke-width="2" stroke-linejoin="round" stroke-dasharray="5,3"/>
    ${dots(pointsInsp, "#14532d")}${dots(pointsFnd, "#dc2626")}
    ${xLabels}
    <rect x="${width - 160}" y="${padT}" width="12" height="3" fill="#14532d" rx="1"/>
    <text x="${width - 144}" y="${padT + 4}" font-size="10" fill="#374151" font-family="Arial">Inspeksjoner</text>
    <rect x="${width - 160}" y="${padT + 14}" width="12" height="3" fill="#dc2626" rx="1"/>
    <text x="${width - 144}" y="${padT + 18}" font-size="10" fill="#374151" font-family="Arial">Funn</text>
  </svg>`;
}

function pct(count: number, total: number): string {
  if (total === 0) return "0 %";
  return `${Math.round((count / total) * 100)} %`;
}

function buildReportHtml(data: {
  periodLabel: string;
  generatedAt: string;
  tenantName: string;
  tenantOrgNumber?: string | null;
  tenantLogoBase64?: string;
  hmsLogoBase64?: string;
  summary: {
    total: number;
    completed: number;
    planned: number;
    inProgress: number;
    cancelled: number;
    totalFindings: number;
    openFindings: number;
    criticalFindings: number;
    resolvedFindings: number;
  };
  bySeverity: { label: string; value: number; color: string }[];
  byStatus: { label: string; value: number; color: string }[];
  byType: { label: string; inspections: number; findings: number }[];
  findingsByStatus: { label: string; value: number; color: string }[];
  monthlyTrend: { label: string; inspections: number; findings: number }[];
  inspections: {
    title: string;
    type: string;
    status: string;
    scheduledDate: string;
    completedDate: string;
    location: string;
    conductedBy: string;
    totalFindings: number;
    openFindings: number;
  }[];
  findings: {
    inspectionTitle: string;
    title: string;
    severity: number;
    severityLabel: string;
    status: string;
    statusLabel: string;
    location: string;
    responsible: string;
    dueDate: string;
    resolvedAt: string;
    resolutionNotes: string;
  }[];
}): string {
  const { summary } = data;
  const completionRate =
    summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  const statsCards = [
    { label: "Totalt", value: summary.total, color: "#14532d" },
    { label: "Fullført", value: summary.completed, color: "#22c55e" },
    { label: "Planlagt", value: summary.planned, color: "#3b82f6" },
    { label: "Pågår", value: summary.inProgress, color: "#f59e0b" },
    { label: "Totale funn", value: summary.totalFindings, color: "#6b7280" },
    { label: "Åpne funn", value: summary.openFindings, color: "#dc2626" },
    { label: "Kritiske funn", value: summary.criticalFindings, color: "#b91c1c" },
    { label: "Gjennomføringsgrad", value: `${completionRate} %`, color: "#14532d" },
  ];

  const statsHtml = statsCards
    .map(
      (c) => `
    <td style="background-color:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;vertical-align:top;">
      <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">${c.label}</div>
      <div style="font-size:26px;font-weight:700;color:${c.color};">${c.value}</div>
    </td>`
    )
    .join("");

  const severityChartSvg = svgHBar(data.bySeverity, 480);
  const statusChartSvg = svgHBar(data.byStatus, 480);
  const findingStatusSvg = svgHBar(data.findingsByStatus, 480);
  const typeChartSvg = svgHBar(
    data.byType.map((t) => ({ label: t.label, value: t.findings, color: "#14532d" })),
    480
  );
  const trendSvg = data.monthlyTrend.length > 1 ? svgMonthlyTrend(data.monthlyTrend) : "";

  const inspRowsHtml = data.inspections
    .map((ins, idx) => {
      const rowBg = idx % 2 === 0 ? "#fff" : "#f9fafb";
      const sc = STATUS_COLORS[ins.status] ?? "#6b7280";
      return `<tr style="background:${rowBg};">
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#111827;">${ins.title}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${ins.type}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${ins.scheduledDate}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${ins.completedDate || "–"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${ins.location || "–"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">
          <span style="background:${sc}22;color:${sc};border:1px solid ${sc}44;border-radius:12px;padding:2px 8px;font-size:10px;font-weight:600;">${STATUS_LABELS[ins.status] ?? ins.status}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${ins.conductedBy || "–"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;font-weight:700;color:${ins.openFindings > 0 ? "#dc2626" : "#374151"};">${ins.totalFindings > 0 ? `${ins.openFindings}/${ins.totalFindings}` : "–"}</td>
      </tr>`;
    })
    .join("");

  const findingRowsHtml = data.findings
    .map((f, idx) => {
      const rowBg = idx % 2 === 0 ? "#fff" : "#f9fafb";
      const sc = SEVERITY_COLORS[f.severity] ?? "#6b7280";
      const fsc = FINDING_STATUS_COLORS[f.status] ?? "#6b7280";
      return `<tr style="background:${rowBg};">
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${f.inspectionTitle}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#111827;">${f.title}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">
          <span style="background:${sc}22;color:${sc};border:1px solid ${sc}44;border-radius:12px;padding:2px 8px;font-size:10px;font-weight:700;">${f.severityLabel}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">
          <span style="background:${fsc}22;color:${fsc};border:1px solid ${fsc}44;border-radius:12px;padding:2px 8px;font-size:10px;font-weight:600;">${f.statusLabel}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${f.location || "–"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${f.responsible || "–"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${f.dueDate || "–"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151;">${f.resolutionNotes || "–"}</td>
      </tr>`;
    })
    .join("");

  const openFindingRowsHtml = data.findings
    .filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS")
    .map((f, idx) => {
      const sc = SEVERITY_COLORS[f.severity] ?? "#6b7280";
      const rowBg = idx % 2 === 0 ? "#fff" : "#fff8f0";
      return `<tr style="background:${rowBg};">
        <td style="padding:8px 10px;border-bottom:1px solid #fde8c8;font-size:11px;color:#374151;">${f.inspectionTitle}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #fde8c8;font-size:12px;font-weight:600;color:#111827;">${f.title}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #fde8c8;">
          <span style="background:${sc}22;color:${sc};border:1px solid ${sc}44;border-radius:12px;padding:2px 8px;font-size:10px;font-weight:700;">${f.severityLabel}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #fde8c8;font-size:11px;color:#374151;">${f.responsible || "–"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #fde8c8;font-size:11px;color:${f.dueDate && new Date(f.dueDate.split(".").reverse().join("-")) < new Date() ? "#dc2626" : "#374151"};">${f.dueDate || "–"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #fde8c8;font-size:11px;color:#374151;max-width:200px;">${f.title}</td>
      </tr>`;
    })
    .join("");

  const openCount = data.findings.filter(
    (f) => f.status === "OPEN" || f.status === "IN_PROGRESS"
  ).length;

  const tenantLogoHtml = data.tenantLogoBase64
    ? `<img src="${data.tenantLogoBase64}" alt="${data.tenantName}" style="height:57px;max-height:57px;width:auto;max-width:260px;" />`
    : "";
  const hmsLogoHtml = data.hmsLogoBase64
    ? `<img src="${data.hmsLogoBase64}" alt="HMS Nova" style="height:36px;width:auto;opacity:0.7;" />`
    : `<span style="font-size:16px;font-weight:900;color:#16a34a;letter-spacing:-0.5px;">HMS<span style="color:#0f172a;">NOVA</span></span>`;

  return `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: letter landscape; margin: 18mm 20mm 40px 20mm; }
  html, body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: #111827; margin: 0; padding: 0; background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  h2 { font-size: 18px; color: #0f172a; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #16a34a; }
  h3 { font-size: 13px; color: #14532d; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: .5px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background-color: #16a34a; color: #fff; padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
  .page-break { page-break-before: always; }
  .section { margin-bottom: 28px; }
  .no-data { color: #9ca3af; font-size: 13px; font-style: italic; padding: 12px 0; }
  .chart-wrap { margin: 8px 0 18px; }
  .report-footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #e2e8f0; background-color: #f8fafc; }
  .report-footer td { padding: 8px 30px; font-size: 9px; color: #94a3b8; vertical-align: middle; }
  .footer-brand { color: #16a34a; font-weight: 700; }
</style>
</head>
<body>

<!-- HEADER -->
<table style="width:100%;border-collapse:collapse;border-bottom:1px solid #e2e8f0;" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:24px 30px 18px;vertical-align:middle;width:60%;">
      ${tenantLogoHtml || `<div style="font-size:14px;font-weight:700;color:#0f172a;">${data.tenantName}</div>`}
      ${tenantLogoHtml ? `<div style="margin-top:4px;"><div style="font-size:14px;font-weight:700;color:#0f172a;">${data.tenantName}</div></div>` : ""}
      ${data.tenantOrgNumber ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Org.nr. ${data.tenantOrgNumber}</div>` : ""}
    </td>
    <td style="padding:24px 30px 18px;vertical-align:middle;width:40%;text-align:right;">
      ${hmsLogoHtml}
    </td>
  </tr>
</table>
<div style="height:4px;background-color:#16a34a;margin:0;"></div>

<!-- Tittel-blokk -->
<div style="padding:20px 30px 18px;border-bottom:1px solid #e2e8f0;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#16a34a;margin-bottom:6px;">Inspeksjonsrapport</div>
  <div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.2;">${data.periodLabel}</div>
  <table style="margin-top:12px;border-collapse:collapse;" cellpadding="0" cellspacing="0">
    <tr>
      <td style="font-size:10px;color:#64748b;padding-right:24px;">Generert: <strong style="color:#1e293b;">${data.generatedAt}</strong></td>
      <td style="font-size:10px;color:#64748b;">Hjemmel: <strong style="color:#1e293b;">AML § 5-1, § 5-2, IK-HMS § 5</strong></td>
    </tr>
  </table>
</div>

<!-- OPPSUMMERING -->
<div class="section" style="padding:0 30px;">
  <h2>Oppsummering</h2>
  <table style="width:100%;border-collapse:separate;border-spacing:10px 0;"><tr>${statsHtml}</tr></table>
</div>

<!-- ANALYSER -->
<div class="section" style="padding:0 30px;">
  <h2>Analyse</h2>
  <table style="width:100%;border-collapse:collapse;"><tr>
    <td style="width:50%;padding-right:16px;vertical-align:top;">
      <h3>Inspeksjonsstatus</h3>
      <div class="chart-wrap">${statusChartSvg}</div>
    </td>
    <td style="width:50%;padding-left:16px;vertical-align:top;">
      <h3>Funn per alvorlighetsgrad</h3>
      <div class="chart-wrap">${severityChartSvg}</div>
    </td>
  </tr></table>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;"><tr>
    <td style="width:50%;padding-right:16px;vertical-align:top;">
      <h3>Funnstatus</h3>
      <div class="chart-wrap">${findingStatusSvg}</div>
    </td>
    <td style="width:50%;padding-left:16px;vertical-align:top;">
      <h3>Funn per inspeksjonstype</h3>
      <div class="chart-wrap">${typeChartSvg}</div>
    </td>
  </tr></table>
  ${trendSvg ? `<div style="margin-top:16px;"><h3>Månedlig trend – inspeksjoner og funn</h3><div class="chart-wrap">${trendSvg}</div></div>` : ""}
</div>

<!-- INSPEKSJONER TABELL -->
<div class="section page-break" style="padding:0 30px;">
  <h2>Inspeksjoner i perioden (${data.inspections.length})</h2>
  ${
    data.inspections.length === 0
      ? `<p class="no-data">Ingen inspeksjoner funnet i valgt periode.</p>`
      : `<table>
    <thead><tr>
      <th style="width:22%">Tittel</th>
      <th>Type</th>
      <th>Planlagt</th>
      <th>Gjennomført</th>
      <th>Lokasjon</th>
      <th>Status</th>
      <th>Gjennomført av</th>
      <th>Funn (åpne/tot.)</th>
    </tr></thead>
    <tbody>${inspRowsHtml}</tbody>
  </table>`
  }
</div>

<!-- ÅPNE TILTAK -->
${
  openCount > 0
    ? `<div class="section" style="padding:0 30px;">
  <h2 style="color:#b91c1c;border-color:#fca5a5;">Åpne tiltak og funn som krever oppfølging (${openCount})</h2>
  <div style="background-color:#fff8f0;border:1px solid #fde8c8;border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:12px;color:#92400e;">
    Disse funnene er registrert som åpne eller under arbeid. Ledelsen bør følge opp at tiltak gjennomføres innen frist.
    Jf. AML § 3-1 og IK-HMS-forskriften § 5.
  </div>
  <table>
    <thead style="background:#b91c1c !important;"><tr>
      <th style="background:#b91c1c">Inspeksjon</th>
      <th style="background:#b91c1c">Funn</th>
      <th style="background:#b91c1c">Alvorlighet</th>
      <th style="background:#b91c1c">Ansvarlig</th>
      <th style="background:#b91c1c">Frist</th>
      <th style="background:#b91c1c">Beskrivelse</th>
    </tr></thead>
    <tbody>${openFindingRowsHtml}</tbody>
  </table>
</div>`
    : `<div class="section" style="padding:0 30px;">
  <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;font-size:13px;color:#166534;">
    Ingen åpne funn som krever umiddelbar oppfølging i valgt periode.
  </div>
</div>`
}

<!-- ALLE FUNN -->
<div class="section page-break" style="padding:0 30px;">
  <h2>Alle registrerte funn og tiltak (${data.findings.length})</h2>
  ${
    data.findings.length === 0
      ? `<p class="no-data">Ingen funn registrert i valgt periode.</p>`
      : `<table>
    <thead><tr>
      <th>Inspeksjon</th>
      <th style="width:20%">Funn</th>
      <th>Alvorlighet</th>
      <th>Status</th>
      <th>Lokasjon</th>
      <th>Ansvarlig</th>
      <th>Frist</th>
      <th>Tiltak/Merknad</th>
    </tr></thead>
    <tbody>${findingRowsHtml}</tbody>
  </table>`
  }
</div>

<!-- FOOTER (fixed på hver side) -->
<div class="report-footer">
  <table style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:8px 30px;font-size:9px;color:#94a3b8;"><span class="footer-brand">HMS Nova</span> · hmsnova.no</td>
      <td style="padding:8px 30px;font-size:9px;color:#94a3b8;text-align:right;">${data.tenantName} · Generert ${data.generatedAt}</td>
    </tr>
  </table>
</div>

</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return new NextResponse("Ikke autorisert", { status: 401 });
  }

  const { tenantId } = session.user;
  const sp = req.nextUrl.searchParams;
  const year = parseInt(sp.get("year") ?? String(new Date().getFullYear()), 10);
  const monthParam = sp.get("month");
  const month = monthParam ? parseInt(monthParam, 10) : null;

  const refDate = new Date(year, month !== null ? month - 1 : 0, 1);
  const startDate = month !== null ? startOfMonth(refDate) : startOfYear(refDate);
  const endDate = month !== null ? endOfMonth(refDate) : endOfYear(refDate);

  const periodLabel =
    month !== null
      ? format(refDate, "MMMM yyyy", { locale: nb }).replace(/^./, (c) => c.toUpperCase())
      : `Årsrapport ${year}`;

  const inspections = await db.inspection.findMany({
    where: {
      tenantId,
      scheduledDate: { gte: startDate, lte: endDate },
    },
    include: {
      findings: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  const allUserIds = [
    ...new Set([
      ...inspections.map((i) => i.conductedBy).filter(Boolean),
      ...inspections.flatMap((i) => i.findings.map((f) => f.responsibleId).filter(Boolean)),
    ]),
  ] as string[];

  const users = await db.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? u.id]));

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, orgNumber: true, logoUrl: true },
  });

  const allFindings = inspections.flatMap((ins) =>
    ins.findings.map((f) => ({
      ...f,
      inspectionTitle: ins.title,
      responsibleName: f.responsibleId ? (userMap[f.responsibleId] ?? "") : "",
    }))
  );

  const summary = {
    total: inspections.length,
    completed: inspections.filter((i) => i.status === "COMPLETED").length,
    planned: inspections.filter((i) => i.status === "PLANNED").length,
    inProgress: inspections.filter((i) => i.status === "IN_PROGRESS").length,
    cancelled: inspections.filter((i) => i.status === "CANCELLED").length,
    totalFindings: allFindings.length,
    openFindings: allFindings.filter((f) => f.status === "OPEN").length,
    criticalFindings: allFindings.filter((f) => f.severity >= 4).length,
    resolvedFindings: allFindings.filter(
      (f) => f.status === "RESOLVED" || f.status === "CLOSED"
    ).length,
  };

  const bySeverity = [5, 4, 3, 2, 1].map((s) => ({
    label: SEVERITY_LABELS[s],
    value: allFindings.filter((f) => f.severity === s).length,
    color: SEVERITY_COLORS[s],
  }));

  const byStatus = (["COMPLETED", "IN_PROGRESS", "PLANNED", "CANCELLED"] as const).map((s) => ({
    label: STATUS_LABELS[s],
    value: inspections.filter((i) => i.status === s).length,
    color: STATUS_COLORS[s],
  }));

  const findingsByStatus = (["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => ({
    label: FINDING_STATUS_LABELS[s],
    value: allFindings.filter((f) => f.status === s).length,
    color: FINDING_STATUS_COLORS[s],
  }));

  const typeKeys = ["VERNERUNDE", "HMS_INSPEKSJON", "SHA_PLAN", "SIKKERHETSVANDRING", "ANDRE"];
  const byType = typeKeys
    .map((t) => {
      const ins = inspections.filter((i) => i.type === t);
      return {
        label: TYPE_LABELS[t],
        inspections: ins.length,
        findings: ins.reduce((s, i) => s + i.findings.length, 0),
      };
    })
    .filter((t) => t.inspections > 0);

  const monthlyTrend = month === null
    ? Array.from({ length: 12 }, (_, i) => {
        const mo = new Date(year, i, 1);
        const moInsp = inspections.filter(
          (ins) => new Date(ins.scheduledDate).getMonth() === i
        );
        return {
          label: format(mo, "MMM", { locale: nb }),
          inspections: moInsp.length,
          findings: moInsp.reduce((s, ins) => s + ins.findings.length, 0),
        };
      })
    : [];

  const [tenantLogoBase64, hmsLogoBase64] = await Promise.all([
    resolveImageToBase64(tenant?.logoUrl),
    Promise.resolve(getLogoBase64()),
  ]);

  const reportData = {
    periodLabel,
    generatedAt: format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb }),
    tenantName: tenant?.name ?? tenantId,
    tenantOrgNumber: tenant?.orgNumber,
    tenantLogoBase64,
    hmsLogoBase64,
    summary,
    bySeverity,
    byStatus,
    byType,
    findingsByStatus,
    monthlyTrend,
    inspections: inspections.map((ins) => ({
      title: ins.title,
      type: TYPE_LABELS[ins.type] ?? ins.type,
      status: ins.status,
      scheduledDate: format(new Date(ins.scheduledDate), "d. MMM yyyy", { locale: nb }),
      completedDate: ins.completedDate
        ? format(new Date(ins.completedDate), "d. MMM yyyy", { locale: nb })
        : "",
      location: ins.location ?? "",
      conductedBy: ins.conductedBy ? (userMap[ins.conductedBy] ?? ins.conductedBy) : "",
      totalFindings: ins.findings.length,
      openFindings: ins.findings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS")
        .length,
    })),
    findings: allFindings.map((f) => ({
      inspectionTitle: f.inspectionTitle,
      title: f.title,
      severity: f.severity,
      severityLabel: SEVERITY_LABELS[f.severity] ?? String(f.severity),
      status: f.status,
      statusLabel: FINDING_STATUS_LABELS[f.status] ?? f.status,
      location: f.location ?? "",
      responsible: f.responsibleName,
      dueDate: f.dueDate ? format(new Date(f.dueDate), "d. MMM yyyy", { locale: nb }) : "",
      resolvedAt: f.resolvedAt
        ? format(new Date(f.resolvedAt), "d. MMM yyyy", { locale: nb })
        : "",
      resolutionNotes: f.resolutionNotes ?? "",
    })),
  };

  const html = buildReportHtml(reportData);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await htmlToPdf(html);
  } catch (err) {
    console.error("Adobe PDF feilet, bruker fallback:", err);
    // Fallback: returner HTML som nedlastbar fil
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="inspeksjonsrapport-${year}${month ? `-${String(month).padStart(2, "0")}` : ""}.html"`,
      },
    });
  }

  const filename = `inspeksjonsrapport-${year}${month ? `-${String(month).padStart(2, "0")}` : ""}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
