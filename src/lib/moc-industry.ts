const MOC_HIGHLIGHTED_INDUSTRIES = new Set([
  "oil_gas",
  "offshore",
  "manufacturing",
  "bergverk",
  "marine",
  "elektro",
  "construction",
]);

/** Endringsstyring er del av produktet for alle kunder (ISO 45001 8.1.3 og ISO 9001 6.3). */
export function isMocDefaultIndustry(_industry: string | null | undefined): boolean {
  return true;
}

/** Høyrisikobransjer får modulen fremhevet, fordi ISO 45001 pkt. 8.1.3 brukes oftere der. */
export function isMocHighlightedIndustry(industry: string | null | undefined): boolean {
  const key = (industry ?? "").trim().toLowerCase();
  return MOC_HIGHLIGHTED_INDUSTRIES.has(key);
}
