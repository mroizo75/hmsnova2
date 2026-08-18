/**
 * Sentralt PDF-brandings-bibliotek for HMS Nova.
 *
 * Bygger HTML-maler med full profesjonell branding og kaller Adobe PDF Services
 * for å konvertere til pixel-perfekt PDF.
 *
 * Alle rapportgeneratorer i systemet bør bruke dette biblioteket.
 */

import fs from "fs";
import path from "path";
import { htmlToPdf } from "@/lib/adobe-pdf";
import { getStorage } from "@/lib/storage";

// ── Logo-caching ─────────────────────────────────────────────────────────────

let _logoBase64Cache: string | null = null;

export function getLogoBase64(): string {
  if (_logoBase64Cache) return _logoBase64Cache;
  const logoPath = path.join(process.cwd(), "public", "logo-nova.png");
  if (!fs.existsSync(logoPath)) return "";
  _logoBase64Cache = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
  return _logoBase64Cache;
}

export function extToMime(ext: string): string {
  if (ext === "svg") return "image/svg+xml";
  if (ext === "jpg") return "image/jpeg";
  return `image/${ext || "png"}`;
}

export async function resolveImageToBase64(url: string | null | undefined): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  try {
    const apiFilesMatch = url.match(/\/api\/files\/(.+)$/);
    if (apiFilesMatch) {
      const fileKey = apiFilesMatch[1];
      const storage = getStorage();
      const buffer = await storage.get(fileKey);
      if (buffer) {
        const ext = path.extname(fileKey).slice(1).toLowerCase();
        return `data:${extToMime(ext)};base64,${buffer.toString("base64")}`;
      }
    }

    if (url.startsWith("/")) {
      const publicPath = path.join(process.cwd(), "public", url);
      if (fs.existsSync(publicPath)) {
        const ext = path.extname(publicPath).slice(1).toLowerCase();
        return `data:${extToMime(ext)};base64,${fs.readFileSync(publicPath).toString("base64")}`;
      }
    }

    if (url.startsWith("http")) {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return "";
      const contentType = res.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await res.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }

    return "";
  } catch {
    return "";
  }
}

// ── Typer ─────────────────────────────────────────────────────────────────────

export type PdfReportType = "operational" | "formal" | "summary";

export type PdfContent =
  | { type: "paragraph"; text: string }
  | { type: "html"; html: string }
  | { type: "table"; headers: string[]; rows: (string | number | null)[][] }
  | { type: "keyvalue"; pairs: [string, string | null | undefined][] }
  | { type: "status-badge"; label: string; status: "ok" | "warning" | "danger" | "info" }
  | { type: "signature-block"; signatures: { name: string; date: string; comment?: string }[] }
  | { type: "alert"; text: string; severity: "info" | "warning" | "danger" }
  | { type: "page-break" };

export type PdfSection = {
  title?: string;
  legalRef?: string;
  content: PdfContent[];
};

export type PdfReportConfig = {
  type?: PdfReportType;
  title: string;
  subtitle?: string;
  reportLabel?: string;
  tenant: {
    name: string;
    orgNumber?: string | null;
    address?: string | null;
    logoUrl?: string | null;
  };
  generatedBy?: string;
  generatedAt?: Date;
  legalReference?: string;
  sections: PdfSection[];
  coverPage?: boolean;
  pageSize?: "A4" | "letter";
};

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.55;
    color: #1e293b;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  .page { padding: 0; }

  /* ── Header (table-layout for PDF-kompatibilitet) ── */
  .report-header-table {
    width: 100%;
    background-color: #ffffff;
    border-collapse: collapse;
    border-bottom: 1px solid #e2e8f0;
  }
  .report-header-table td {
    padding: 24px 30px 18px;
    vertical-align: middle;
  }
  .header-logo-cell { width: 60%; }
  .header-company-cell { width: 40%; text-align: right; }
  .header-logo-tenant {
    height: 57px;
    max-height: 57px;
    width: auto;
    max-width: 260px;
  }
  .header-logo-hms {
    height: 36px;
    width: auto;
    opacity: 0.7;
  }
  .header-company-name {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }
  .header-company-sub {
    font-size: 10px;
    color: #64748b;
    margin-top: 2px;
  }

  /* Grønn separator */
  .header-bar {
    height: 4px;
    background-color: #16a34a;
    margin: 0;
  }

  /* ── Tittel-blokk ── */
  .report-title-block {
    padding: 20px 30px 18px;
    border-bottom: 1px solid #e2e8f0;
  }
  .report-label {
    font-size: 10px;
    font-weight: 700;
    color: #16a34a;
    margin-bottom: 6px;
  }
  .report-title {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 4px;
  }
  .report-subtitle {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
  }

  /* Meta-tabell for generert/av/hjemmel */
  .report-meta-table {
    margin-top: 12px;
    border-collapse: collapse;
  }
  .report-meta-table td {
    font-size: 10px;
    color: #64748b;
    padding-right: 24px;
    padding-top: 0;
    padding-bottom: 0;
    vertical-align: top;
  }
  .report-meta-table td strong { color: #1e293b; }
  .legal-ref {
    display: inline-block;
    padding: 3px 10px;
    background-color: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 12px;
    font-size: 9px;
    color: #16a34a;
    font-weight: 600;
    margin-top: 10px;
  }

  /* ── Innhold ── */
  .report-body { padding: 20px 30px 28px; }
  .section { margin-bottom: 22px; }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 2px solid #16a34a;
  }
  .section-legal {
    font-size: 9px;
    color: #16a34a;
    font-weight: 600;
    margin-top: -4px;
    margin-bottom: 10px;
  }

  /* Paragraph */
  .paragraph {
    margin-bottom: 10px;
    font-size: 11px;
    color: #1e293b;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  /* Rikt HTML-innhold */
  .html-content {
    font-size: 11px;
    color: #1e293b;
    line-height: 1.6;
    margin-bottom: 10px;
  }
  .html-content p { margin-bottom: 8px; }
  .html-content h3 { font-size: 13px; font-weight: 700; margin: 12px 0 6px; }
  .html-content h4 { font-size: 12px; font-weight: 600; margin: 10px 0 4px; }
  .html-content ul, .html-content ol { padding-left: 20px; margin-bottom: 8px; }
  .html-content li { margin-bottom: 3px; }
  .html-content strong { font-weight: 700; }

  /* Datatabell */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 10px;
    border: 1px solid #e2e8f0;
  }
  .data-table thead tr { background-color: #16a34a; }
  .data-table thead th {
    color: #fff;
    font-weight: 700;
    text-align: left;
    padding: 8px 12px;
    border: none;
    font-size: 10px;
  }
  .data-table tbody tr:nth-child(even) { background-color: #f8fafc; }
  .data-table tbody tr:nth-child(odd) { background-color: #fff; }
  .data-table tbody td {
    padding: 7px 12px;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
    vertical-align: top;
  }

  /* Key-value (table-basert) */
  .kv-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }
  .kv-table td {
    padding: 7px 12px;
    font-size: 10px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .kv-table .kv-key {
    width: 180px;
    background-color: #f1f5f9;
    font-weight: 600;
    color: #475569;
    border-right: 1px solid #e2e8f0;
  }
  .kv-table .kv-val {
    color: #1e293b;
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 9px;
    font-weight: 700;
    margin: 2px;
  }
  .badge-ok { background-color: #dcfce7; color: #15803d; }
  .badge-warning { background-color: #fef9c3; color: #a16207; }
  .badge-danger { background-color: #fee2e2; color: #dc2626; }
  .badge-info { background-color: #dbeafe; color: #1d4ed8; }

  /* Alert */
  .alert {
    padding: 10px 14px;
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 10px;
    line-height: 1.5;
  }
  .alert-info { background-color: #eff6ff; border-left: 4px solid #3b82f6; color: #1e40af; }
  .alert-warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e; }
  .alert-danger { background-color: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; }

  /* Signature block (table-basert) */
  .sig-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 10px 0;
    margin-bottom: 14px;
  }
  .sig-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    background-color: #f8fafc;
    vertical-align: top;
  }
  .sig-name { font-weight: 700; font-size: 10px; color: #0f172a; }
  .sig-date { font-size: 9px; color: #64748b; margin-top: 3px; }
  .sig-comment { font-size: 9px; color: #475569; margin-top: 4px; font-style: italic; }

  /* ── Footer – fixed på bunnen av hver side ── */
  .report-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid #e2e8f0;
    background-color: #f8fafc;
  }
  .report-footer-table {
    width: 100%;
    border-collapse: collapse;
  }
  .report-footer-table td {
    padding: 8px 30px;
    font-size: 9px;
    color: #94a3b8;
    vertical-align: middle;
  }
  .footer-brand { color: #16a34a; font-weight: 700; }
  .footer-right { text-align: right; }

  /* Sørg for at innholdet ikke overlapper footer */
  .report-body { padding-bottom: 40px; }

  /* Page break */
  .page-break { page-break-after: always; }

  @page { margin-bottom: 40px; }
`;

// ── HTML-builders ──────────────────────────────────────────────────────────────

function escHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

function buildContent(content: PdfContent[]): string {
  return content
    .map((c) => {
      switch (c.type) {
        case "paragraph":
          return `<p class="paragraph">${escHtml(c.text)}</p>`;

        case "html":
          return `<div class="html-content">${c.html}</div>`;

        case "table": {
          const headers = c.headers.map((h) => `<th>${escHtml(h)}</th>`).join("");
          const rows = c.rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${escHtml(cell?.toString() ?? "")}</td>`).join("")}</tr>`
            )
            .join("");
          return `<table class="data-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
        }

        case "keyvalue": {
          const rows = c.pairs
            .map(
              ([k, v]) =>
                `<tr><td class="kv-key">${escHtml(k)}</td><td class="kv-val">${escHtml(v ?? "–")}</td></tr>`
            )
            .join("");
          return `<table class="kv-table">${rows}</table>`;
        }

        case "status-badge":
          return `<span class="badge badge-${c.status}">${escHtml(c.label)}</span>`;

        case "alert":
          return `<div class="alert alert-${c.severity}">${escHtml(c.text)}</div>`;

        case "signature-block": {
          const cards = c.signatures
            .map(
              (s) => `<td class="sig-card">
                <div class="sig-name">${escHtml(s.name)}</div>
                <div class="sig-date">${escHtml(s.date)}</div>
                ${s.comment ? `<div class="sig-comment">${escHtml(s.comment)}</div>` : ""}
              </td>`
            )
            .join("");
          return `<table class="sig-table"><tr>${cards}</tr></table>`;
        }

        case "page-break":
          return `<div class="page-break"></div>`;

        default:
          return "";
      }
    })
    .join("\n");
}

function buildSections(sections: PdfSection[]): string {
  return sections
    .map(
      (s) => `
      <div class="section">
        ${s.title ? `<div class="section-title">${escHtml(s.title)}</div>` : ""}
        ${s.legalRef ? `<div class="section-legal">${escHtml(s.legalRef)}</div>` : ""}
        ${buildContent(s.content)}
      </div>`
    )
    .join("\n");
}

// ── Eksporterte funksjoner ─────────────────────────────────────────────────────

/**
 * Bygg komplett HTML-streng for en rapport med full HMS Nova-branding.
 * Kan brukes direkte med Adobe htmlToPdf() eller returneres for videre prosessering.
 */
export async function buildReportHtml(config: PdfReportConfig): Promise<string> {
  const logo = getLogoBase64();
  const now = config.generatedAt ?? new Date();
  const dateStr = now.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });

  const logoImg = logo
    ? `<img src="${logo}" alt="HMS Nova" class="header-logo-hms" />`
    : `<span style="font-size:16px;font-weight:900;color:#16a34a;letter-spacing:-0.5px;">HMS<span style="color:#0f172a;">NOVA</span></span>`;

  const tenantLogoBase64 = await resolveImageToBase64(config.tenant.logoUrl);
  const tenantLogoImg = tenantLogoBase64
    ? `<img src="${tenantLogoBase64}" alt="${escHtml(config.tenant.name)}" class="header-logo-tenant" />`
    : "";

  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(config.title)}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <table class="report-header-table" cellpadding="0" cellspacing="0">
      <tr>
        <td class="header-logo-cell">
          ${tenantLogoImg || `<div class="header-company-name">${escHtml(config.tenant.name)}</div>`}
          ${tenantLogoImg ? `<div style="margin-top:4px;"><div class="header-company-name">${escHtml(config.tenant.name)}</div></div>` : ""}
          ${config.tenant.orgNumber ? `<div class="header-company-sub">Org.nr. ${escHtml(config.tenant.orgNumber)}</div>` : ""}
          ${config.tenant.address ? `<div class="header-company-sub">${escHtml(config.tenant.address)}</div>` : ""}
        </td>
        <td class="header-company-cell">
          ${logoImg}
        </td>
      </tr>
    </table>
    <div class="header-bar"></div>

    <!-- Tittel-blokk -->
    <div class="report-title-block">
      ${config.reportLabel ? `<div class="report-label">${escHtml(config.reportLabel)}</div>` : ""}
      <div class="report-title">${escHtml(config.title)}</div>
      ${config.subtitle ? `<div class="report-subtitle">${escHtml(config.subtitle)}</div>` : ""}
      <table class="report-meta-table" cellpadding="0" cellspacing="0">
        <tr>
          <td>Generert: <strong>${dateStr} kl. ${timeStr}</strong></td>
          ${config.generatedBy ? `<td>Av: <strong>${escHtml(config.generatedBy)}</strong></td>` : ""}
          ${config.legalReference ? `<td>Hjemmel: <strong>${escHtml(config.legalReference)}</strong></td>` : ""}
        </tr>
      </table>
    </div>

    <!-- Innhold -->
    <div class="report-body">
      ${buildSections(config.sections)}
    </div>

    <!-- Footer (fixed på hver side) -->
    <div class="report-footer">
      <table class="report-footer-table" cellpadding="0" cellspacing="0">
        <tr>
          <td><span class="footer-brand">HMS Nova</span> · hmsnova.no</td>
          <td class="footer-right">${escHtml(config.tenant.name)} · Generert ${dateStr}</td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Generer en branded PDF. Prøver Adobe PDF Services først,
 * faller tilbake til jsPDF-basert generering ved feil.
 */
export async function generateBrandedPdf(config: PdfReportConfig): Promise<Buffer> {
  try {
    const html = await buildReportHtml(config);
    return await htmlToPdf(html);
  } catch {
    return generateFallbackPdf(config);
  }
}

async function generateFallbackPdf(config: PdfReportConfig): Promise<Buffer> {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      y = margin;
    }
  };

  // Header
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(config.title, margin, y);
  y += 8;

  if (config.subtitle) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(config.subtitle, margin, y);
    pdf.setTextColor(0);
    y += 6;
  }

  if (config.tenant.name) {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    const tenantLine = [config.tenant.name, config.tenant.orgNumber, config.tenant.address]
      .filter(Boolean)
      .join(" · ");
    pdf.text(tenantLine, margin, y);
    pdf.setTextColor(0);
    y += 4;
  }

  if (config.legalReference) {
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(config.legalReference, margin, y);
    pdf.setTextColor(0);
    y += 4;
  }

  y += 6;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;

  for (const section of config.sections) {
    checkPageBreak(20);

    if (section.title) {
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text(section.title, margin, y);
      y += 5;

      if (section.legalRef) {
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(120);
        pdf.text(section.legalRef, margin, y);
        pdf.setTextColor(0);
        y += 4;
      }
      y += 2;
    }

    for (const content of section.content) {
      pdf.setFont("helvetica", "normal");

      if (content.type === "paragraph") {
        checkPageBreak(10);
        pdf.setFontSize(9);
        const lines = pdf.splitTextToSize(content.text, contentW);
        pdf.text(lines, margin, y);
        y += lines.length * 4 + 3;
      } else if (content.type === "keyvalue") {
        for (const [key, value] of content.pairs) {
          checkPageBreak(6);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${key}:`, margin, y);
          pdf.setFont("helvetica", "normal");
          pdf.text(value ?? "–", margin + 45, y);
          y += 5;
        }
        y += 2;
      } else if (content.type === "table") {
        checkPageBreak(15);
        const tableData = content.rows.map((row) =>
          row.map((cell) => (cell != null ? String(cell) : "–")),
        );
        (pdf as any).autoTable({
          startY: y,
          head: [content.headers],
          body: tableData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });
        y = (pdf as any).lastAutoTable.finalY + 6;
      } else if (content.type === "alert") {
        checkPageBreak(10);
        pdf.setFontSize(8);
        pdf.setTextColor(content.severity === "danger" ? 180 : content.severity === "warning" ? 150 : 100, content.severity === "warning" ? 100 : 0, 0);
        pdf.text(content.text, margin, y);
        pdf.setTextColor(0);
        y += 6;
      } else if (content.type === "signature-block") {
        for (const sig of content.signatures) {
          checkPageBreak(6);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.text(`${sig.name} – ${sig.date}${sig.comment ? ` (${sig.comment})` : ""}`, margin, y);
          y += 4;
        }
        y += 3;
      } else if (content.type === "html") {
        checkPageBreak(10);
        pdf.setFontSize(9);
        const plainText = content.html
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<\/h[1-6]>/gi, "\n")
          .replace(/<\/li>/gi, "\n")
          .replace(/<\/div>/gi, "\n")
          .replace(/<li>/gi, "  • ")
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        const lines = pdf.splitTextToSize(plainText, contentW);
        for (const line of lines) {
          checkPageBreak(4);
          pdf.text(line, margin, y);
          y += 4;
        }
        y += 3;
      } else if (content.type === "status-badge") {
        checkPageBreak(8);
        pdf.setFontSize(8);
        pdf.text(`${content.label}: ${content.status.toUpperCase()}`, margin, y);
        y += 5;
      } else if (content.type === "page-break") {
        pdf.addPage();
        y = margin;
      }
    }

    y += 4;
  }

  // Footer
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(150);
    pdf.text(
      `${config.tenant.name} – Generert ${config.generatedAt?.toLocaleDateString("nb-NO") ?? new Date().toLocaleDateString("nb-NO")} – Side ${i}/${pageCount}`,
      margin,
      pdf.internal.pageSize.getHeight() - 8,
    );
    pdf.setTextColor(0);
  }

  return Buffer.from(pdf.output("arraybuffer"));
}
