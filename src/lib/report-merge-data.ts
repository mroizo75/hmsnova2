/**
 * JSON-kontrakt for Adobe Document Generation (Word-maler).
 * Mapper PdfReportConfig til merge-felter som malene forventer.
 */

import type { PdfContent, PdfReportConfig, PdfSection } from "@/lib/pdf-brand";

export const REPORT_TEMPLATES_DIR = "templates/reports";
export const HMS_NOVA_REPORT_TEMPLATE = "HMS_Nova_Mal.docx";

export type MergeFlag = "true" | "false";

export type MergeBlock = {
  kind: "paragraph" | "table" | "keyvalue" | "alert" | "html" | "signatures" | "pagebreak" | "badge";
  text: string;
  html: string;
  alertSeverity: string;
};

export type MergeSection = {
  title: string;
  legalRef: string;
  hasTitle: MergeFlag;
  hasLegalRef: MergeFlag;
  blocks: MergeBlock[];
};

export type ReportMergeData = {
  tenantName: string;
  orgNumber: string;
  address: string;
  tenantLogo: string;
  hmsLogo: string;
  hasTenantLogo: MergeFlag;
  hasOrgNumber: MergeFlag;
  hasAddress: MergeFlag;
  reportLabel: string;
  REPORTLABEL: string;
  title: string;
  subtitle: string;
  generatedDate: string;
  generatedBy: string;
  legalReference: string;
  hasSubtitle: MergeFlag;
  hasGeneratedBy: MergeFlag;
  hasLegalReference: MergeFlag;
  coverPage: MergeFlag;
  sections: MergeSection[];
};

function flag(value: boolean): MergeFlag {
  return value ? "true" : "false";
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "  • ")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function esc(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellStyle(extra = ""): string {
  return `padding:7px 12px;border-bottom:1px solid #e2e8f0;color:#1e293b;vertical-align:top;${extra}`;
}

export function buildHtmlTable(headers: string[], rows: (string | number | null)[][]): string {
  const head = headers
    .map(
      (h) =>
        `<th style="background-color:#16a34a;color:#ffffff;font-weight:700;text-align:left;padding:8px 12px;font-size:10px;border:none;">${esc(h)}</th>`
    )
    .join("");
  const body = rows
    .map((row, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      const cells = row
        .map((cell) => `<td style="${cellStyle()}">${esc(cell ?? "")}</td>`)
        .join("");
      return `<tr style="background-color:${bg};">${cells}</tr>`;
    })
    .join("");
  return `<table border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;font-size:10px;margin-bottom:8px;"><tr>${head}</tr>${body}</table>`;
}

export function buildHtmlKeyValue(pairs: [string, string | null | undefined][]): string {
  const rows = pairs
    .map(
      ([key, value]) =>
        `<tr><td style="${cellStyle("width:180px;background-color:#f1f5f9;font-weight:600;color:#475569;border-right:1px solid #e2e8f0;")}">${esc(key)}</td><td style="${cellStyle()}">${esc(value ?? "–")}</td></tr>`
    )
    .join("");
  return `<table border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;font-size:10px;margin-bottom:8px;">${rows}</table>`;
}

function buildHtmlSignatures(
  signatures: { name: string; date: string; comment?: string }[]
): string {
  const cells = signatures
    .map((s) => {
      const comment = s.comment
        ? `<div style="font-size:9px;color:#475569;margin-top:4px;font-style:italic;">${esc(s.comment)}</div>`
        : "";
      return `<td style="border:1px solid #e2e8f0;padding:10px 12px;background-color:#f8fafc;vertical-align:top;"><div style="font-weight:700;font-size:10px;color:#0f172a;">${esc(s.name)}</div><div style="font-size:9px;color:#64748b;margin-top:3px;">${esc(s.date)}</div>${comment}</td>`;
    })
    .join("");
  return `<table border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:10px 0;margin-bottom:8px;"><tr>${cells}</tr></table>`;
}

function alertPrefix(severity: string): string {
  if (severity === "danger") return "Kritisk: ";
  if (severity === "warning") return "Advarsel: ";
  return "";
}

function emptyBlock(): MergeBlock {
  return { kind: "paragraph", text: "", html: "", alertSeverity: "" };
}

export function contentToBlock(content: PdfContent): MergeBlock {
  switch (content.type) {
    case "paragraph":
      return { ...emptyBlock(), kind: "paragraph", text: content.text };
    case "html":
      return { ...emptyBlock(), kind: "html", text: stripHtml(content.html) };
    case "table":
      return { ...emptyBlock(), kind: "table", html: buildHtmlTable(content.headers, content.rows) };
    case "keyvalue":
      return { ...emptyBlock(), kind: "keyvalue", html: buildHtmlKeyValue(content.pairs) };
    case "status-badge":
      return { ...emptyBlock(), kind: "badge", text: content.label };
    case "alert":
      return {
        ...emptyBlock(),
        kind: "alert",
        text: `${alertPrefix(content.severity)}${content.text}`,
        alertSeverity: content.severity,
      };
    case "signature-block":
      return { ...emptyBlock(), kind: "signatures", html: buildHtmlSignatures(content.signatures) };
    case "page-break":
      return { ...emptyBlock(), kind: "pagebreak" };
    default:
      return emptyBlock();
  }
}

export function sectionToMerge(section: PdfSection): MergeSection {
  return {
    title: section.title ?? "",
    legalRef: section.legalRef ?? "",
    hasTitle: flag(Boolean(section.title)),
    hasLegalRef: flag(Boolean(section.legalRef)),
    blocks: section.content.map(contentToBlock),
  };
}

export function buildReportMergeData(
  config: PdfReportConfig,
  logos: { tenantLogo: string; hmsLogo: string }
): ReportMergeData {
  const now = config.generatedAt ?? new Date();
  const generatedDate = now.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const generatedTime = now.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    tenantName: config.tenant.name,
    orgNumber: config.tenant.orgNumber ?? "",
    address: config.tenant.address ?? "",
    tenantLogo: logos.tenantLogo,
    hmsLogo: logos.hmsLogo,
    hasTenantLogo: flag(Boolean(config.tenant.logoUrl)),
    hasOrgNumber: flag(Boolean(config.tenant.orgNumber)),
    hasAddress: flag(Boolean(config.tenant.address)),
    reportLabel: config.reportLabel ?? "Rapport",
    REPORTLABEL: (config.reportLabel ?? "Rapport").toUpperCase(),
    title: config.title,
    subtitle: config.subtitle ?? "",
    generatedDate: `${generatedDate} kl. ${generatedTime}`,
    generatedBy: config.generatedBy ?? "",
    legalReference: config.legalReference ?? "",
    hasSubtitle: flag(Boolean(config.subtitle)),
    hasGeneratedBy: flag(Boolean(config.generatedBy)),
    hasLegalReference: flag(Boolean(config.legalReference)),
    coverPage: flag(config.coverPage !== false),
    sections: config.sections.map(sectionToMerge),
  };
}
