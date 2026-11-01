/**
 * Én innholdsfortegnelse for kvalitet, HMS og personal.
 * Kapittelrekkefølgen følger ISO 9001:2015 og ISO 45001:2018 pkt. 4–10
 * (samme høynivåstruktur). Kravene i internkontrollforskriften § 5 er lagt
 * inn der de hører hjemme. Personal er kapittel 8 fordi arbeidsavtalen,
 * arbeidstiden og personvernet ikke er et ISO-punkt.
 *
 * Standardpunktene har faste nummer (2.1, 2.2 …). Egne punkt blir neste
 * desimal (2.5) eller neste bokstav (2.a), slik at ISO-punktene ikke flyttes.
 */

export const HANDBOOK_CHAPTERS = [
  {
    number: "1",
    title: "Omfang og kontekst",
    legalRef: "ISO 9001:2015 og ISO 45001:2018 pkt. 4, IK-HMS § 5 nr. 1",
    description: "Hvilke krav som gjelder for virksomheten.",
  },
  {
    number: "2",
    title: "Ledelse og medvirkning",
    legalRef: "ISO 9001/45001 pkt. 5, IK-HMS § 5 nr. 3, 4 og 5",
    description: "Policy, mål, ansvar og ansattes medvirkning.",
  },
  {
    number: "3",
    title: "Planlegging",
    legalRef: "ISO 9001/45001 pkt. 6, IK-HMS § 5 nr. 6 og 8",
    description: "Risiko og planen for HMS-arbeidet.",
  },
  {
    number: "4",
    title: "Støtte",
    legalRef: "ISO 9001/45001 pkt. 7, IK-HMS § 5 nr. 2",
    description: "Kompetanse og dokumentert informasjon.",
  },
  {
    number: "5",
    title: "Drift",
    legalRef: "ISO 9001/45001 pkt. 8, IK-HMS § 5 nr. 7",
    description: "Hvordan arbeidet styres i det daglige.",
  },
  {
    number: "6",
    title: "Evaluering",
    legalRef: "ISO 9001/45001 pkt. 9, IK-HMS § 5 nr. 7 og 8",
    description: "Oppfølging, revisjon og ledelsens gjennomgang.",
  },
  {
    number: "7",
    title: "Forbedring",
    legalRef: "ISO 9001/45001 pkt. 10, IK-HMS § 5 nr. 7",
    description: "Avvik, hendelser og tiltak som fjerner årsaken.",
  },
  {
    number: "8",
    title: "Personal",
    legalRef: "AML, ferieloven og GDPR",
    description: "Arbeidsavtale, arbeidstid, ferie og personvern.",
  },
] as const;

export type HandbookChapterNumber = (typeof HANDBOOK_CHAPTERS)[number]["number"];

export const OTHER_HANDBOOK_CHAPTER = {
  number: "other",
  title: "Andre punkt",
  legalRef: "",
  description: "Punkt som ikke er knyttet til et kapittel.",
};

/** Faste nummer. sortOrder har mellomrom slik at 2.a kan ligge mellom 2.1 og 2.2. */
export const STANDARD_HANDBOOK_OUTLINE: Record<string, { number: string; sortOrder: number }> = {
  s2c: { number: "1.1", sortOrder: 110 },
  "ks-policy": { number: "2.1", sortOrder: 210 },
  s1: { number: "2.2", sortOrder: 220 },
  s2: { number: "2.3", sortOrder: 230 },
  s2b: { number: "2.4", sortOrder: 240 },
  s3: { number: "3.1", sortOrder: 310 },
  s13: { number: "3.2", sortOrder: 320 },
  s5: { number: "4.1", sortOrder: 410 },
  s10: { number: "4.2", sortOrder: 420 },
  s6: { number: "5.1", sortOrder: 510 },
  "ks-kunder": { number: "5.2", sortOrder: 520 },
  "ks-leverandor": { number: "5.3", sortOrder: 530 },
  s15: { number: "5.4", sortOrder: 540 },
  s7: { number: "5.5", sortOrder: 550 },
  s11: { number: "5.6", sortOrder: 560 },
  s12: { number: "5.7", sortOrder: 570 },
  s11b: { number: "5.8", sortOrder: 580 },
  s8: { number: "6.1", sortOrder: 610 },
  s14: { number: "6.2", sortOrder: 620 },
  s9: { number: "6.3", sortOrder: 630 },
  s4: { number: "7.1", sortOrder: 710 },
  "hr-arbeidsforhold": { number: "8.1", sortOrder: 810 },
  "hr-arbeidstid": { number: "8.2", sortOrder: 820 },
  "hr-ferie": { number: "8.3", sortOrder: 830 },
  "hr-sykefravaer": { number: "8.4", sortOrder: 840 },
  "hr-permisjon": { number: "8.5", sortOrder: 850 },
  "hr-kompetanse": { number: "8.6", sortOrder: 860 },
  "hr-personvern": { number: "8.7", sortOrder: 870 },
  "hr-opphor": { number: "8.8", sortOrder: 880 },
};

const CHAPTER_NUMBERS = new Set<string>(HANDBOOK_CHAPTERS.map((chapter) => chapter.number));

export function chapterFromSectionNumber(sectionNumber: string): string | null {
  const match = /^(\d+)\.[0-9a-z]+$/i.exec(sectionNumber.trim());
  if (!match || !CHAPTER_NUMBERS.has(match[1])) return null;
  return match[1];
}

export function handbookSectionNumber(section: { sectionKey: string; sectionNumber?: string | null }): string {
  return STANDARD_HANDBOOK_OUTLINE[section.sectionKey]?.number ?? section.sectionNumber?.trim() ?? "";
}

export function handbookSectionSort(section: { sectionKey: string; sortOrder?: number | null }): number {
  return STANDARD_HANDBOOK_OUTLINE[section.sectionKey]?.sortOrder ?? section.sortOrder ?? 9000;
}

export function chapterKeyForSection(section: { sectionKey: string; sectionNumber?: string | null }): string {
  const outline = STANDARD_HANDBOOK_OUTLINE[section.sectionKey];
  if (outline) return chapterFromSectionNumber(outline.number) ?? "other";
  return chapterFromSectionNumber(section.sectionNumber ?? "") ?? "other";
}

export type HandbookNumberStyle = "decimal" | "letter";

export function nextCustomSectionNumber(
  numbers: string[],
  chapter: string,
  style: HandbookNumberStyle,
): string | null {
  if (!CHAPTER_NUMBERS.has(chapter)) return null;
  if (style === "decimal") {
    const indexes = numbers.flatMap((number) => {
      const match = new RegExp(`^${chapter}\\.(\\d+)$`).exec(number);
      return match ? [Number(match[1])] : [];
    });
    const next = indexes.length > 0 ? Math.max(...indexes) + 1 : 1;
    return `${chapter}.${next}`;
  }
  const letters = new Set(
    numbers.flatMap((number) => {
      const match = new RegExp(`^${chapter}\\.([a-z])$`).exec(number);
      return match ? [match[1]] : [];
    }),
  );
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const next = alphabet.split("").find((letter) => !letters.has(letter));
  return next ? `${chapter}.${next}` : null;
}

/** Ledig sortOrder rett etter et punkt, uten å flytte standardkapitlene. */
export function sortOrderAfter(prev: number, occupied: number[]): number {
  const next = occupied.filter((value) => value > prev).sort((a, b) => a - b)[0] ?? null;
  if (next == null) return prev + 5;
  if (next - prev >= 2) return prev + Math.floor((next - prev) / 2);
  const max = occupied.reduce((highest, value) => Math.max(highest, value), prev);
  return max + 5;
}

export function groupHandbookChapters<
  T extends { sectionKey: string; sectionNumber?: string | null; sortOrder?: number | null },
>(sections: T[]): Array<{
  number: string;
  title: string;
  legalRef: string;
  description: string;
  sections: Array<T & { sectionNumber: string; sortOrder: number }>;
}> {
  const prepared = sections.map((section) => ({
    ...section,
    sectionNumber: handbookSectionNumber(section),
    sortOrder: handbookSectionSort(section),
    chapterKey: chapterKeyForSection({
      sectionKey: section.sectionKey,
      sectionNumber: handbookSectionNumber(section),
    }),
  }));
  prepared.sort((a, b) => a.sortOrder - b.sortOrder || a.sectionNumber.localeCompare(b.sectionNumber, "nb"));

  const chapters = [...HANDBOOK_CHAPTERS, OTHER_HANDBOOK_CHAPTER];
  return chapters.flatMap((chapter) => {
    const inChapter = prepared.filter((section) => section.chapterKey === chapter.number);
    if (inChapter.length === 0) return [];
    return [{ ...chapter, sections: inChapter }];
  });
}
