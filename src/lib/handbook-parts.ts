/**
 * Ett styringssystem i tre deler: kvalitet, HMS og personal.
 * Felles kapitler oppfyller både ISO 9001:2015 (pkt. 7.5, 9.2, 9.3 og 10.2)
 * og internkontrollforskriften § 5 nr. 7 og 8, og vises derfor i begge deler.
 */

export const HANDBOOK_TITLE = "Kvalitet, HMS og personal";

export const HANDBOOK_PARTS = ["KS", "HMS", "HR"] as const;
export type HandbookPart = (typeof HANDBOOK_PARTS)[number];

export const HANDBOOK_PART_LABELS: Record<HandbookPart, string> = {
  KS: "Kvalitet",
  HMS: "HMS",
  HR: "Personal",
};

export const HANDBOOK_PART_DESCRIPTIONS: Record<HandbookPart, string> = {
  KS: "Kvalitetspolicy, kunder og leverandører (ISO 9001:2015).",
  HMS: "Internkontroll for helse, miljø og sikkerhet (IK-HMS § 5).",
  HR: "Arbeidsavtale, arbeidstid, ferie og personvern.",
};

/** Avvik, dokumentstyring, revisjon, ledelsens gjennomgang og rutiner. */
export const SHARED_HANDBOOK_SECTION_KEYS = ["s4", "s9", "s10", "s14", "s15"] as const;

const SHARED_KEYS = new Set<string>(SHARED_HANDBOOK_SECTION_KEYS);

export function canonicalHandbookCategory(sectionKey: string): string | null {
  if (sectionKey.startsWith("ks-")) return "KS";
  if (sectionKey.startsWith("hr-")) return "HR";
  if (SHARED_KEYS.has(sectionKey)) return "KS,HMS";
  if (/^s\d/.test(sectionKey)) return "HMS";
  return null;
}

export function displayHandbookCategory(sectionKey: string, stored?: string | null): string {
  return canonicalHandbookCategory(sectionKey) ?? (stored?.trim() || "HMS");
}

export function handbookSectionParts(sectionKey: string, stored?: string | null): HandbookPart[] {
  const parts = displayHandbookCategory(sectionKey, stored)
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is HandbookPart => part === "KS" || part === "HMS" || part === "HR");
  return parts.length > 0 ? parts : ["HMS"];
}

export function handbookSectionInPart(
  sectionKey: string,
  stored: string | null | undefined,
  part: HandbookPart,
): boolean {
  return handbookSectionParts(sectionKey, stored).includes(part);
}

export function isSharedHandbookSection(sectionKey: string): boolean {
  return SHARED_KEYS.has(sectionKey);
}

function orderHandbookPart<T extends { sectionKey: string; sortOrder: number }>(
  sections: T[],
  part: HandbookPart,
): T[] {
  return [...sections].sort((a, b) => {
    if (part === "KS") {
      const aRank = SHARED_KEYS.has(a.sectionKey) ? 1 : 0;
      const bRank = SHARED_KEYS.has(b.sectionKey) ? 1 : 0;
      if (aRank !== bRank) return aRank - bRank;
    }
    return a.sortOrder - b.sortOrder || a.sectionKey.localeCompare(b.sectionKey);
  });
}

/** Nummer 1, 2, 3 … i leserekkefølge innen hver del. */
export function groupHandbookSections<
  T extends { sectionKey: string; category?: string | null; sortOrder: number },
>(sections: T[]): Record<HandbookPart, Array<T & { sectionNumber: string }>> {
  const grouped: Record<HandbookPart, T[]> = { KS: [], HMS: [], HR: [] };
  for (const section of sections) {
    for (const part of handbookSectionParts(section.sectionKey, section.category)) {
      grouped[part].push(section);
    }
  }
  return {
    KS: orderHandbookPart(grouped.KS, "KS").map((section, index) => ({
      ...section,
      sectionNumber: String(index + 1),
    })),
    HMS: orderHandbookPart(grouped.HMS, "HMS").map((section, index) => ({
      ...section,
      sectionNumber: String(index + 1),
    })),
    HR: orderHandbookPart(grouped.HR, "HR").map((section, index) => ({
      ...section,
      sectionNumber: String(index + 1),
    })),
  };
}
