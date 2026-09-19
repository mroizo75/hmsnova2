/**
 * Ansatt-visning av HMS-håndboken (IK-HMS § 5, AML § 2-3 og § 3-2).
 * Ledelseskapitler filtreres bort; lenker peker til ansatt-flaten.
 */

export const EMPLOYEE_HIDDEN_SECTION_KEYS = new Set(["s9", "s10", "s13", "s14"]);

export const EMPLOYEE_HANDBOOK_ACTIONS = [
  { href: "/ansatt/avvik/ny", label: "Meld avvik", hint: "AML § 2-3" },
  { href: "/ansatt/varsling", label: "Varsle", hint: "AML § 2 A-1" },
  { href: "/ansatt/sja", label: "SJA", hint: "Før farlig arbeid" },
  { href: "/ansatt/opplaering", label: "Opplæring", hint: "AML § 3-2" },
] as const;

export const EMPLOYEE_HANDBOOK_GROUPS = [
  {
    id: "must-know",
    title: "Dette må du vite",
    description: "Policy, roller og hvordan du sier ifra",
    keys: ["s1", "s2", "s2b", "s4", "s11b"],
  },
  {
    id: "safe-work",
    title: "Trygt arbeid",
    description: "Risiko, opplæring, SJA og vernerunde",
    keys: ["s3", "s5", "s6", "s8"],
  },
  {
    id: "emergency",
    title: "Hvis noe skjer",
    description: "Brann, beredskap og kjemikalier",
    keys: ["s7", "s12"],
  },
  {
    id: "people",
    title: "Personal",
    description: "Arbeidstid, ferie, sykdom og personvern",
    keyPrefix: "hr-",
  },
  {
    id: "more",
    title: "Mer om HMS",
    description: "Arbeidsmiljø og rutiner",
    keys: ["s11", "s15"],
  },
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

export function groupEmployeeHandbookSections<T extends { sectionKey: string }>(
  sections: T[]
): Array<{ id: string; title: string; description: string; sections: T[] }> {
  const used = new Set<string>();
  const groups: Array<{ id: string; title: string; description: string; sections: T[] }> = [];

  for (const group of EMPLOYEE_HANDBOOK_GROUPS) {
    const matched = sections.filter((section) => {
      if ("keyPrefix" in group && group.keyPrefix) {
        return section.sectionKey.startsWith(group.keyPrefix);
      }
      return "keys" in group && (group.keys as readonly string[]).includes(section.sectionKey);
    });
    if (matched.length === 0) continue;
    matched.forEach((section) => used.add(section.sectionKey));
    groups.push({
      id: group.id,
      title: group.title,
      description: group.description,
      sections: matched,
    });
  }

  const leftover = sections.filter((section) => !used.has(section.sectionKey));
  if (leftover.length > 0) {
    groups.push({
      id: "other",
      title: "Øvrig",
      description: "Andre kapitler i håndboken",
      sections: leftover,
    });
  }

  return groups;
}
