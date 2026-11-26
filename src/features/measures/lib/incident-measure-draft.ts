import {
  normalizeAiControlFrequency,
  normalizeAiMeasureCategory,
  type AiControlFrequency,
  type AiMeasureCategory,
} from "@/lib/risk-measure-ai";

/**
 * Utkast til tiltak fra en hendelse. Personen godkjenner før lagring.
 * Frist klemmes til 7–90 dager slik at oppfølging verken blir umiddelbar eller utsettes et år.
 * IK-HMS § 5 andre ledd bokstav c: planer og tiltak for å redusere risikoforholdene.
 */
export interface IncidentMeasureDraft {
  title: string;
  description: string;
  category: AiMeasureCategory;
  followUpFrequency: AiControlFrequency;
  dueInDays: number;
}

const MIN_DUE_DAYS = 7;
const MAX_DUE_DAYS = 90;

function readText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function parseIncidentMeasureDraft(raw: string): IncidentMeasureDraft | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const title = readText(record.title);
  const description = readText(record.description);
  if (title.length < 3 || description.length < 10) return null;

  const dueRaw = typeof record.dueInDays === "number" ? record.dueInDays : Number(readText(record.dueInDays));
  const dueInDays = Number.isFinite(dueRaw)
    ? Math.min(MAX_DUE_DAYS, Math.max(MIN_DUE_DAYS, Math.round(dueRaw)))
    : MIN_DUE_DAYS;

  return {
    title,
    description,
    category: normalizeAiMeasureCategory(record.category),
    followUpFrequency: normalizeAiControlFrequency(record.followUpFrequency),
    dueInDays,
  };
}
