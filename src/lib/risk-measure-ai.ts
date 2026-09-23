/**
 * Normalisering av AI-utkast til risikotiltak.
 *
 * Lovgrunnlag for selve tiltaket (ikke for AI):
 * - AML § 3-1 (2) bokstav c: kartlegge farer, vurdere risiko og iverksette tiltak
 * - Internkontrollforskriften § 5 andre ledd bokstav c: planer og tiltak for å redusere risikoforholdene
 * - ISO 45001:2018 kap. 8.1.2: tiltakshierarkiet
 * - ISO 9001:2015 kap. 10.2: godkjent tiltak skal ha ansvarlig og frist
 *
 * AI lager bare utkast. Lagring skjer først når en person godkjenner.
 */

export const AI_MEASURE_CATEGORIES = ["CORRECTIVE", "PREVENTIVE", "IMPROVEMENT", "MITIGATION"] as const;
export type AiMeasureCategory = (typeof AI_MEASURE_CATEGORIES)[number];

export const AI_CONTROL_FREQUENCIES = ["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "BIENNIAL"] as const;
export type AiControlFrequency = (typeof AI_CONTROL_FREQUENCIES)[number];

export interface NormalizedAiRiskMeasure {
  title: string;
  description: string;
  category: AiMeasureCategory;
  followUpFrequency: AiControlFrequency;
  rationale: string;
  suggestedDueDays: number;
  isDuplicate: boolean;
}

const MIN_DUE_DAYS = 7;
const MAX_DUE_DAYS = 180;
const DEFAULT_DUE_DAYS = 30;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function extractAiMeasureArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  const record = asRecord(parsed);
  if (record && Array.isArray(record.measures)) return record.measures;
  return [];
}

export function normalizeAiMeasureCategory(value: unknown): AiMeasureCategory {
  const text = readString(value).toUpperCase();
  if (AI_MEASURE_CATEGORIES.includes(text as AiMeasureCategory)) {
    return text as AiMeasureCategory;
  }
  const lower = readString(value).toLowerCase();
  if (lower.includes("korriger")) return "CORRECTIVE";
  if (lower.includes("forebygg")) return "PREVENTIVE";
  if (lower.includes("forbedr")) return "IMPROVEMENT";
  return "MITIGATION";
}

export function normalizeAiControlFrequency(value: unknown): AiControlFrequency {
  const text = readString(value).toUpperCase();
  if (AI_CONTROL_FREQUENCIES.includes(text as AiControlFrequency)) {
    return text as AiControlFrequency;
  }
  const lower = readString(value).toLowerCase();
  if (lower.includes("ukent")) return "WEEKLY";
  if (lower.includes("måned") || lower.includes("maned")) return "MONTHLY";
  if (lower.includes("kvart")) return "QUARTERLY";
  if (lower.includes("annet hvert") || lower.includes("bienn")) return "BIENNIAL";
  return "ANNUAL";
}

export function normalizeSuggestedDueDays(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(readString(value));
  if (!Number.isFinite(parsed)) return DEFAULT_DUE_DAYS;
  return Math.min(MAX_DUE_DAYS, Math.max(MIN_DUE_DAYS, Math.round(parsed)));
}

export function isDuplicateMeasureTitle(title: string, existingTitles: readonly string[]): boolean {
  const key = title.trim().toLowerCase();
  if (!key) return false;
  return existingTitles.some((existing) => existing.trim().toLowerCase() === key);
}

export function normalizeAiRiskMeasureDrafts(
  values: unknown,
  existingTitles: readonly string[] = [],
  max = 4,
): NormalizedAiRiskMeasure[] {
  const items = extractAiMeasureArray(values);
  const unique: NormalizedAiRiskMeasure[] = [];
  const duplicates: NormalizedAiRiskMeasure[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const record = asRecord(item);
    if (!record) continue;

    const title = readString(record.title);
    const description = readString(record.description);
    if (title.length < 3 || title.length > 200) continue;
    if (description.length < 10 || description.length > 2000) continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const draft: NormalizedAiRiskMeasure = {
      title,
      description,
      category: normalizeAiMeasureCategory(record.category),
      followUpFrequency: normalizeAiControlFrequency(record.followUpFrequency),
      rationale: readString(record.rationale).slice(0, 400),
      suggestedDueDays: normalizeSuggestedDueDays(record.suggestedDueDays),
      isDuplicate: isDuplicateMeasureTitle(title, existingTitles),
    };

    if (draft.isDuplicate) {
      duplicates.push(draft);
    } else {
      unique.push(draft);
    }
  }

  return [...unique, ...duplicates].slice(0, max);
}

export interface NormalizedResidualRisk {
  likelihood: number;
  consequence: number;
  rationale: string;
}

function clampRiskScale(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(readString(value));
  const safeFallback = Math.min(5, Math.max(1, Math.round(fallback)));
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return safeFallback;
  return Math.round(parsed);
}

/**
 * Restrisiko etter planlagte tiltak (ISO 45001:2018 kap. 6.1.2).
 * Verdier over dagens vurdering klemmes ned. Personen kan likevel heve dem før godkjenning.
 */
export function normalizeResidualRisk(
  parsed: unknown,
  current: { likelihood: number; consequence: number },
): NormalizedResidualRisk {
  const record = asRecord(parsed);
  const nested = asRecord(record?.residual);
  const currentLikelihood = clampRiskScale(current.likelihood, 3);
  const currentConsequence = clampRiskScale(current.consequence, 3);

  let likelihood = clampRiskScale(
    nested?.likelihood ?? record?.residualLikelihood,
    Math.max(1, currentLikelihood - 1),
  );
  let consequence = clampRiskScale(
    nested?.consequence ?? record?.residualConsequence,
    currentConsequence,
  );

  if (likelihood > currentLikelihood) likelihood = currentLikelihood;
  if (consequence > currentConsequence) consequence = currentConsequence;

  return {
    likelihood,
    consequence,
    rationale: readString(nested?.rationale ?? record?.residualRationale).slice(0, 400),
  };
}

/** Lokal kalenderdato YYYY-MM-DD, brukt som forhåndsutfylt frist før godkjenning. */
export function dueDateFromDays(days: number, from = new Date()): string {
  const safeDays = Number.isFinite(days) ? Math.max(0, Math.round(days)) : 0;
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + safeDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
