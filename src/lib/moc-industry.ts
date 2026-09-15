const MOC_DEFAULT_INDUSTRIES = new Set([
  "oil_gas",
  "offshore",
  "manufacturing",
  "bergverk",
  "marine",
  "elektro",
  "construction",
]);

/** ISO 45001 8.1.3: formell MoC er driftskrav i prosess- og høyrisikobransjer. */
export function isMocDefaultIndustry(industry: string | null | undefined): boolean {
  const key = (industry ?? "").trim().toLowerCase();
  return MOC_DEFAULT_INDUSTRIES.has(key);
}
