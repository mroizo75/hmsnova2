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

export function getIncidentIndustryScopes(
  industry: string | null | undefined,
): string[] {
  const normalizedIndustry = normalizeIndustry(industry);

  if (isHealthcareIndustry(normalizedIndustry)) {
    return ["GENERELL", "HELSE"];
  }

  if (normalizedIndustry === "construction" || normalizedIndustry === "bygg") {
    return ["GENERELL", "BYGG"];
  }

  if (normalizedIndustry === "transport") {
    return ["GENERELL", "TRANSPORT"];
  }

  if (normalizedIndustry === "offshore" || normalizedIndustry === "oil_gas") {
    return ["GENERELL", "OFFSHORE", "ATEX"];
  }

  if (normalizedIndustry === "elektro") {
    return ["GENERELL", "ATEX"];
  }

  if (normalizedIndustry === "marine") {
    return ["GENERELL", "OFFSHORE"];
  }

  if (normalizedIndustry === "bergverk") {
    return ["GENERELL", "ATEX"];
  }

  return ["GENERELL"];
}

