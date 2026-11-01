import { randomUUID } from "crypto";

/** Egne kapitler bedriften legger inn. Standardkapitler (IK-HMS § 5) har faste nøkler. */
export const CUSTOM_SECTION_KEY_PREFIX = "custom-";

export function isCustomHandbookSection(sectionKey: string): boolean {
  return sectionKey.startsWith(CUSTOM_SECTION_KEY_PREFIX);
}

export function createCustomSectionKey(): string {
  return `${CUSTOM_SECTION_KEY_PREFIX}${randomUUID()}`;
}

export function plainTextToHandbookHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "<p></p>";
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export type SortPlacement = {
  sortOrder: number;
  /** Når satt, økes sortOrder med 2 for alle seksjoner fra og med denne verdien før innsetting. */
  shiftFrom: number | null;
};

/** Finn et ledig heltall mellom to naboer, eller åpne et hull når de ligger inntil hverandre. */
export function sortPlacement(prev: number | null, next: number | null): SortPlacement {
  if (prev == null && next == null) return { sortOrder: 10, shiftFrom: null };
  if (prev == null) return { sortOrder: (next as number) - 1, shiftFrom: null };
  if (next == null) return { sortOrder: prev + 1, shiftFrom: null };
  if (next - prev >= 2) {
    return { sortOrder: prev + Math.floor((next - prev) / 2), shiftFrom: null };
  }
  return { sortOrder: prev + 1, shiftFrom: next };
}

export function insertionNeighbors<T extends { id: string; sortOrder: number }>(
  ordered: T[],
  insertAfterId: string | null,
): { prev: T | null; next: T | null } | null {
  if (insertAfterId == null) {
    return {
      prev: ordered.length > 0 ? ordered[ordered.length - 1] : null,
      next: null,
    };
  }
  const index = ordered.findIndex((section) => section.id === insertAfterId);
  if (index < 0) return null;
  return { prev: ordered[index], next: ordered[index + 1] ?? null };
}
