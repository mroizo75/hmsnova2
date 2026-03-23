import type { Prisma } from "@prisma/client";

export const ROUTINE_CONTENT_SECTION_KEYS = [
  "formaal",
  "omfang",
  "ansvar",
  "gjennomforing",
  "dokumentasjon",
  "avvikOppfolging",
  "revisjon",
  "kilder",
] as const;

export type RoutineContentSectionKey = (typeof ROUTINE_CONTENT_SECTION_KEYS)[number];

const ARRAY_KEYS = new Set<RoutineContentSectionKey>([
  "ansvar",
  "gjennomforing",
  "dokumentasjon",
  "avvikOppfolging",
  "kilder",
]);

export type StructuredRoutineContent = Record<RoutineContentSectionKey, string | string[]>;

function emptyStructured(): StructuredRoutineContent {
  return {
    formaal: "",
    omfang: "",
    ansvar: [],
    gjennomforing: [],
    dokumentasjon: [],
    avvikOppfolging: [],
    revisjon: "",
    kilder: [],
  };
}

export function normalizeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((x) => String(x).trim()).filter((s) => s.length > 0);
  }
  if (typeof val === "string" && val.trim()) {
    return val
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }
  return [];
}

export function stringArrayToMultiline(arr: string[] | string): string {
  if (typeof arr === "string") return arr;
  return arr.join("\n");
}

export function multilineToStringArray(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export function toStructuredRoutineContent(raw: unknown): StructuredRoutineContent {
  const out = emptyStructured();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return out;
  }
  const o = raw as Record<string, unknown>;
  for (const key of ROUTINE_CONTENT_SECTION_KEYS) {
    const val = o[key];
    if (ARRAY_KEYS.has(key)) {
      (out[key] as string[]) = normalizeStringArray(val);
    } else {
      (out[key] as string) = typeof val === "string" ? val : "";
    }
  }
  return out;
}

export function structuredHasAnyDisplayable(data: StructuredRoutineContent): boolean {
  for (const key of ROUTINE_CONTENT_SECTION_KEYS) {
    const v = data[key];
    if (Array.isArray(v)) {
      if (v.length > 0) return true;
    } else if (typeof v === "string" && v.trim()) {
      return true;
    }
  }
  return false;
}

export function mergeRoutineContentFromForm(
  formData: FormData,
  existing: unknown
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  for (const key of ROUTINE_CONTENT_SECTION_KEYS) {
    delete base[key];
  }

  const structured: Record<string, string | string[]> = {
    formaal: String(formData.get("content_formaal") ?? "").trim(),
    omfang: String(formData.get("content_omfang") ?? "").trim(),
    revisjon: String(formData.get("content_revisjon") ?? "").trim(),
    ansvar: multilineToStringArray(String(formData.get("content_ansvar") ?? "")),
    gjennomforing: multilineToStringArray(String(formData.get("content_gjennomforing") ?? "")),
    dokumentasjon: multilineToStringArray(String(formData.get("content_dokumentasjon") ?? "")),
    avvikOppfolging: multilineToStringArray(String(formData.get("content_avvikOppfolging") ?? "")),
    kilder: multilineToStringArray(String(formData.get("content_kilder") ?? "")),
  };

  return { ...base, ...structured } as Prisma.InputJsonValue;
}
