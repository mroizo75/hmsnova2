/**
 * Matcher kunngjøringer mot HMS-relevant regelverk.
 *
 * Hjemmel:
 *   IK-HMS § 5 nr. 1: oversikt over krav av særlig betydning
 *   IK-HMS § 5 nr. 2: informasjon om endringer til arbeidstakere
 *   ISO 45001:2018 6.1.3: holde oversikt over rettslige krav
 */

export type TrackedLegalItem = {
  id: string;
  title: string;
  paragraphRef?: string | null;
  legalBasis?: string | null;
  industries: string[];
};

export type LawAnnouncement = {
  source: "LOVTIDEND" | "ARBEIDSTILSYNET";
  externalId: string;
  title: string;
  summary?: string;
  sourceUrl: string;
  publishedAt?: Date;
};

export type LawChangeMatch = {
  announcement: LawAnnouncement;
  matchedKeywords: string[];
  affectedIndustries: string[];
  legalReferenceIds: string[];
  requirementIds: string[];
};

const HMS_KEYWORDS: Array<{ keyword: string; industries: string[] }> = [
  { keyword: "arbeidsmiljø", industries: ["all"] },
  { keyword: "internkontroll", industries: ["all"] },
  { keyword: "verneombud", industries: ["all"] },
  { keyword: "varsling", industries: ["all"] },
  { keyword: "arbeidstid", industries: ["all"] },
  { keyword: "yrkesskade", industries: ["all"] },
  { keyword: "personopplysning", industries: ["all"] },
  { keyword: "ferielov", industries: ["all"] },
  { keyword: "tjenestepensjon", industries: ["all"] },
  { keyword: "obligatorisk tjenestepensjon", industries: ["all"] },
  { keyword: "a-ordning", industries: ["all"] },
  { keyword: "a-melding", industries: ["all"] },
  { keyword: "brannforebygg", industries: ["all"] },
  { keyword: "rømning", industries: ["all"] },
  { keyword: "kjemikalie", industries: ["manufacturing", "construction", "healthcare"] },
  { keyword: "stoffkartotek", industries: ["manufacturing", "construction"] },
  { keyword: "eksponering", industries: ["manufacturing", "construction", "healthcare"] },
  { keyword: "tiltaksverdi", industries: ["manufacturing", "construction"] },
  { keyword: "grenseverdi", industries: ["manufacturing", "construction"] },
  { keyword: "byggherre", industries: ["construction"] },
  { keyword: "hms-kort", industries: ["construction"] },
  { keyword: "sha-plan", industries: ["construction"] },
  { keyword: "bygge- eller anlegg", industries: ["construction"] },
  { keyword: "utførelse av arbeid", industries: ["construction", "manufacturing"] },
  { keyword: "organisering, ledelse og medvirkning", industries: ["all"] },
  { keyword: "næringsmiddel", industries: ["hospitality"] },
  { keyword: "mattrygghet", industries: ["hospitality"] },
  { keyword: "haccp", industries: ["hospitality"] },
  { keyword: "skjenk", industries: ["hospitality"] },
  { keyword: "alkohollov", industries: ["hospitality"] },
  { keyword: "helsepersonell", industries: ["healthcare"] },
  { keyword: "smittevern", industries: ["healthcare"] },
  { keyword: "fse", industries: ["elektro"] },
  { keyword: "elektriske anlegg", industries: ["elektro"] },
  { keyword: "adr", industries: ["transport"] },
  { keyword: "kjøre- og hviletid", industries: ["transport"] },
  { keyword: "petroleum", industries: ["offshore", "oil_gas"] },
  { keyword: "offshore", industries: ["offshore"] },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/§/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function mergeIndustries(groups: string[][]): string[] {
  const flattened = groups.flat();
  if (flattened.includes("all")) return ["all"];
  return unique(flattened);
}

export function extractLovtidendAnnouncements(html: string): LawAnnouncement[] {
  const items: LawAnnouncement[] = [];
  const seen = new Set<string>();

  const linkRe =
    /<a[^>]+href="(\/dokument\/LTI\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null) {
    const path = match[1];
    const title = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const idMatch = path.match(/(\d{4}-\d{2}-\d{2}-\d+)/);
    const after = html.slice(match.index + match[0].length, match.index + match[0].length + 280);
    const forMatch = after.match(/\b((?:FOR|LOV)-\d{4}-\d{2}-\d{2}-\d+)\b/);
    const externalId = forMatch?.[1] ?? idMatch?.[0] ?? path;
    if (seen.has(externalId) || title.length < 8) continue;
    seen.add(externalId);
    items.push({
      source: "LOVTIDEND",
      externalId,
      title,
      sourceUrl: `https://lovdata.no${path}`,
    });
  }

  if (items.length === 0) {
    const mdRe =
      /###\s+(.+)\n(?:\n)?((?:FOR|LOV)-\d{4}-\d{2}-\d{2}-\d+)/g;
    while ((match = mdRe.exec(html)) !== null) {
      const externalId = match[2];
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      const kind = externalId.startsWith("LOV") ? "lov" : "forskrift";
      const dateId = externalId.replace(/^(FOR|LOV)-/, "");
      items.push({
        source: "LOVTIDEND",
        externalId,
        title: match[1].trim(),
        sourceUrl: `https://lovdata.no/dokument/LTI/${kind}/${dateId}`,
      });
    }
  }

  return items;
}

export function extractArbeidstilsynetAnnouncements(html: string): LawAnnouncement[] {
  const items: LawAnnouncement[] = [];
  const seen = new Set<string>();
  const linkRe =
    /<a[^>]+href="(\/nyheter\/(?:artikler|nyhetsarkiv)?[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null) {
    const path = match[1].split("?")[0];
    const title = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!path.startsWith("/nyheter/") || title.length < 12) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    items.push({
      source: "ARBEIDSTILSYNET",
      externalId: path,
      title,
      sourceUrl: `https://www.arbeidstilsynet.no${path}`,
    });
  }
  return items;
}

export function matchAnnouncement(
  announcement: LawAnnouncement,
  tracked: { references: TrackedLegalItem[]; requirements: TrackedLegalItem[] }
): LawChangeMatch | null {
  const haystack = normalize(
    `${announcement.title} ${announcement.summary ?? ""}`
  );

  const keywordHits = HMS_KEYWORDS.filter((entry) =>
    haystack.includes(entry.keyword)
  );

  const matchedReferences = tracked.references.filter((ref) => {
    const title = normalize(ref.title);
    if (title.length < 8) return false;
    const compact = title.replace(/loven$/, "lov").replace(/forskriften$/, "forskrift");
    return haystack.includes(title) || haystack.includes(compact);
  });

  const matchedRequirements = tracked.requirements.filter((req) => {
    const basis = normalize(req.legalBasis ?? "");
    const title = normalize(req.title);
    if (basis.length >= 12 && haystack.includes(basis)) return true;
    return title.length >= 12 && haystack.includes(title);
  });

  if (
    keywordHits.length === 0 &&
    matchedReferences.length === 0 &&
    matchedRequirements.length === 0
  ) {
    return null;
  }

  return {
    announcement,
    matchedKeywords: unique([
      ...keywordHits.map((hit) => hit.keyword),
      ...matchedReferences.map((ref) => ref.title),
      ...matchedRequirements.map((req) => req.title),
    ]),
    affectedIndustries: mergeIndustries([
      ...keywordHits.map((hit) => hit.industries),
      ...matchedReferences.map((ref) => ref.industries),
      ...matchedRequirements.map((req) => req.industries),
    ]),
    legalReferenceIds: matchedReferences.map((ref) => ref.id),
    requirementIds: matchedRequirements.map((req) => req.id),
  };
}

export function tenantIsAffected(
  tenantIndustry: string | null | undefined,
  affectedIndustries: string[]
): boolean {
  if (affectedIndustries.includes("all")) return true;
  if (!tenantIndustry) return false;
  return affectedIndustries.includes(tenantIndustry.trim().toLowerCase());
}
