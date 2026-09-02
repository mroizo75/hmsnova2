import type { RiskCategory } from "@prisma/client";

/**
 * Matcher AI sitt severity-nivå (LOW|MEDIUM|HIGH|CRITICAL) til sannsynlighet/konsekvens
 * på ISO 45001 sin 5x5-matrise. Delt mellom alle steder som lagrer AI-genererte
 * risikoforslag (tenant-selvbetjening og superadmin-provisionering), slik at samme
 * severity alltid gir samme score uansett hvilken flyt som brukte den.
 */
export function mapAiSeverityToValues(severity: string): { likelihood: number; consequence: number } {
  const normalized = severity.trim().toUpperCase();
  if (normalized === "CRITICAL") return { likelihood: 5, consequence: 5 };
  if (normalized === "HIGH") return { likelihood: 4, consequence: 4 };
  if (normalized === "MEDIUM") return { likelihood: 2, consequence: 4 };
  return { likelihood: 1, consequence: 2 };
}

const RISK_CATEGORY_VALUES: readonly RiskCategory[] = [
  "STRATEGIC",
  "OPERATIONAL",
  "SAFETY",
  "HEALTH",
  "ENVIRONMENTAL",
  "LEGAL",
  "INFORMATION_SECURITY",
  "PSYCHOSOCIAL",
  "ERGONOMIC",
  "ORGANISATIONAL",
  "PHYSICAL",
];

/**
 * Matcher AI-forslått kategori til Prisma sin RiskCategory-enum.
 *
 * Gjeldende AI-prompter (src/lib/ai.ts) ber eksplisitt om enum-verdier, så
 * normaltilfellet er en direkte match. Nøkkelord-fallbacket dekker eldre bufrede
 * AI-svar og gir robusthet dersom modellen likevel svarer med norsk fritekst.
 */
export function mapAiCategoryToRiskCategory(
  category: string,
  fallback: RiskCategory = "OPERATIONAL"
): RiskCategory {
  const normalizedEnum = category.trim().toUpperCase();
  if (RISK_CATEGORY_VALUES.includes(normalizedEnum as RiskCategory)) {
    return normalizedEnum as RiskCategory;
  }

  const lower = category.trim().toLowerCase();
  if (lower.includes("ergonomi")) return "ERGONOMIC";
  if (lower.includes("sikker")) return "SAFETY";
  if (lower.includes("psyk")) return "PSYCHOSOCIAL";
  if (lower.includes("kjem") || lower.includes("helse")) return "HEALTH";
  if (lower.includes("fysisk")) return "PHYSICAL";
  if (lower.includes("milj")) return "ENVIRONMENTAL";
  if (lower.includes("jurid")) return "LEGAL";
  if (lower.includes("organisat")) return "ORGANISATIONAL";
  if (lower.includes("strateg")) return "STRATEGIC";
  if (lower.includes("informasjon") || lower.includes("data")) return "INFORMATION_SECURITY";

  return fallback;
}

/** Rydder og begrenser AI-foreslåtte tiltak - felles for alle AI-risikoflyter. */
export function normalizeAiMeasures(values: unknown, max = 5): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index)
    .slice(0, max);
}
