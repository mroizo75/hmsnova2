/**
 * Ansatt-visning av styringssystemet (IK-HMS § 5, ISO 9001, AML § 2-3 og § 3-2).
 * Ledelseskapitler filtreres bort; lenker peker til ansatt-flaten.
 */

import {
  HANDBOOK_PART_DESCRIPTIONS,
  HANDBOOK_PART_LABELS,
  HANDBOOK_PARTS,
  groupHandbookSections,
} from "@/lib/handbook-parts";

export const EMPLOYEE_HIDDEN_SECTION_KEYS = new Set(["s9", "s10", "s13", "s14"]);

export const EMPLOYEE_HANDBOOK_ACTIONS = [
  { href: "/ansatt/avvik/ny", label: "Meld avvik", hint: "AML § 2-3" },
  { href: "/ansatt/varsling", label: "Varsle", hint: "AML § 2 A-1" },
  { href: "/ansatt/sja", label: "SJA", hint: "Før farlig arbeid" },
  { href: "/ansatt/opplaering", label: "Opplæring", hint: "AML § 3-2" },
] as const;

const EMPLOYEE_MODULE_LINKS: Record<string, string> = {
  s4: "/ansatt/avvik/ny",
  s5: "/ansatt/opplaering",
  s6: "/ansatt/sja",
  s7: "/ansatt/brannoevelser",
  s8: "/ansatt/vernerunder",
  s11b: "/ansatt/varsling",
  s12: "/ansatt/stoffkartotek",
  s15: "/ansatt/rutiner",
};

export function employeeHandbookModuleLink(sectionKey: string): string | null {
  return EMPLOYEE_MODULE_LINKS[sectionKey] ?? null;
}

export function stripHandbookHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function handbookSectionMatchesQuery<T extends { title: string; content: string; legalRef?: string | null }>(
  section: T,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${section.title} ${stripHandbookHtml(section.content)} ${section.legalRef ?? ""}`.toLowerCase();
  return haystack.includes(q);
}

export function groupEmployeeHandbookSections<
  T extends { sectionKey: string; category?: string | null; sortOrder?: number },
>(sections: T[]): Array<{ id: string; title: string; description: string; sections: T[] }> {
  const withOrder = sections.map((section, index) => ({
    ...section,
    sortOrder: section.sortOrder ?? index,
  }));
  const grouped = groupHandbookSections(withOrder);

  return HANDBOOK_PARTS.flatMap((part) => {
    const partSections = grouped[part];
    if (partSections.length === 0) return [];
    return [
      {
        id: part,
        title: HANDBOOK_PART_LABELS[part],
        description: HANDBOOK_PART_DESCRIPTIONS[part],
        sections: partSections,
      },
    ];
  });
}
