import type { DocumentKind } from "@prisma/client";
import type { PdfContent, PdfSection } from "@/lib/pdf-brand";

export function slugifyDocumentTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug.length > 0 ? slug : "dokument";
}

export function nextCopyName(baseName: string, existingCount: number): string {
  if (existingCount <= 0) return baseName;
  return `${baseName} (${existingCount + 1})`;
}

export function documentKindFromTemplateCategory(category?: string | null): DocumentKind {
  const normalized = (category ?? "").trim().toUpperCase();
  if (normalized === "LAW") return "LAW";
  if (normalized === "PLAN") return "PLAN";
  return "PROCEDURE";
}

export function parsePdcaGuidance(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string" && entry.trim()) {
      out[key] = entry.trim();
    }
  }
  return out;
}

export function buildDocumentTemplatePdfSections(input: {
  description?: string | null;
  bodyHtml?: string | null;
  pdcaGuidance?: unknown;
}): PdfSection[] {
  const content: PdfContent[] = [];

  if (input.description?.trim()) {
    content.push({ type: "paragraph", text: input.description.trim() });
  }

  if (input.bodyHtml?.trim()) {
    content.push({ type: "html", html: input.bodyHtml });
  }

  const pdca = parsePdcaGuidance(input.pdcaGuidance);
  const pdcaItems: [string, string][] = [
    ["Plan", pdca.plan],
    ["Do", pdca.do],
    ["Check", pdca.check],
    ["Act", pdca.act],
  ].flatMap((item) => (item[1] ? [[item[0], item[1]]] : []));

  if (pdcaItems.length > 0) {
    content.push({ type: "keyvalue", pairs: pdcaItems });
  }

  if (content.length === 0) {
    content.push({
      type: "paragraph",
      text: "Utkast opprettet fra mal. Fyll ut og godkjenn dokumentet før det distribueres til ansatte (IK-HMS § 5).",
    });
  }

  return [{ content }];
}
