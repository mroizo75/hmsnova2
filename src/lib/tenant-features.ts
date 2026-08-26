export type TenantFeature =
  | "helseforetak"
  | "bht"
  | "healthIncidentSubcategories"
  | "trir";

const HEALTHCARE_INDUSTRY_VALUES = new Set([
  "healthcare",
  "helse",
  "helsevesen",
  "health",
]);

function normalizeIndustry(industry: string | null | undefined): string {
  return (industry ?? "").trim().toLowerCase();
}

export function isHealthcareIndustry(industry: string | null | undefined): boolean {
  const normalizedIndustry = normalizeIndustry(industry);
  return HEALTHCARE_INDUSTRY_VALUES.has(normalizedIndustry);
}

export function getTenantFeaturesForIndustry(
  industry: string | null | undefined,
): TenantFeature[] {
  if (!isHealthcareIndustry(industry)) {
    return [];
  }

  return ["helseforetak", "bht", "healthIncidentSubcategories", "trir"];
}

export function hasTenantFeature(
  industry: string | null | undefined,
  feature: TenantFeature,
): boolean {
  return getTenantFeaturesForIndustry(industry).includes(feature);
}

const INDUSTRY_SCOPE_MAP: Record<string, string[]> = {
  healthcare: ["GENERELL", "HELSE"],
  helse: ["GENERELL", "HELSE"],
  helsevesen: ["GENERELL", "HELSE"],
  health: ["GENERELL", "HELSE"],
  construction: ["GENERELL", "BYGG"],
  bygg: ["GENERELL", "BYGG"],
  transport: ["GENERELL", "TRANSPORT"],
  offshore: ["GENERELL", "OFFSHORE", "ATEX"],
  oil_gas: ["GENERELL", "OFFSHORE", "ATEX"],
  elektro: ["GENERELL", "ATEX"],
  marine: ["GENERELL", "OFFSHORE"],
  bergverk: ["GENERELL", "ATEX"],
  hospitality: ["GENERELL", "HOTELL", "RESTAURANT"],
  hotell: ["GENERELL", "HOTELL"],
  hotel: ["GENERELL", "HOTELL"],
  restaurant: ["GENERELL", "RESTAURANT"],
  food_service: ["GENERELL", "RESTAURANT"],
  cleaning: ["GENERELL", "RENGJORING"],
  rengjoring: ["GENERELL", "RENGJORING"],
  retail: ["GENERELL", "VAREHANDEL"],
  varehandel: ["GENERELL", "VAREHANDEL"],
  handel: ["GENERELL", "VAREHANDEL"],
  agriculture: ["GENERELL", "LANDBRUK"],
  landbruk: ["GENERELL", "LANDBRUK"],
  manufacturing: ["GENERELL", "INDUSTRI"],
  industri: ["GENERELL", "INDUSTRI"],
  produksjon: ["GENERELL", "INDUSTRI"],
  technology: ["GENERELL", "IT"],
  it: ["GENERELL", "IT"],
  kontor: ["GENERELL", "IT"],
  consulting: ["GENERELL", "IT"],
  real_estate: ["GENERELL", "EIENDOM"],
  eiendom: ["GENERELL", "EIENDOM"],
  education: ["GENERELL", "IT"],
  fiskeri: ["GENERELL", "OFFSHORE"],
};

export function getIncidentIndustryScopes(
  industry: string | null | undefined,
): string[] {
  const normalizedIndustry = normalizeIndustry(industry);
  return INDUSTRY_SCOPE_MAP[normalizedIndustry] ?? ["GENERELL"];
}

