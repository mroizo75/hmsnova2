import { GLOBAL_ROUTINE_TEMPLATE_LIBRARY } from "@/lib/routine-template-library";

const CATEGORY_LABELS_NB: Record<string, string> = {
  AVVIK: "Avvik og korrigerende tiltak",
  VARSLING: "Varsling",
  HMS_STYRING: "HMS-styring og system",
  EL_SIKKERHET: "Elektrisk sikkerhet",
  BYGG_ANLEGG: "Bygg og anlegg",
  HELSE: "Helse og miljø",
  TRANSPORT: "Transport og logistikk",
  INDUSTRI: "Industri og produksjon",
  HANDEL_SERVICE: "Handel og service",
  HOTELL_RESTAURANT: "Hotell og restaurant",
  UTDANNING: "Utdanning",
  TEKNOLOGI_IT: "Teknologi og IT",
  LANDBRUK: "Landbruk",
  GENERELL: "Generell HMS",
};

const CUSTOM_SENTINEL = "__ANNET__";

export function getRoutineCategoryPresets(): { value: string; label: string }[] {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  for (const entry of GLOBAL_ROUTINE_TEMPLATE_LIBRARY) {
    const c = entry.category?.trim();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push({ value: c, label: CATEGORY_LABELS_NB[c] ?? c });
  }
  out.sort((a, b) => a.label.localeCompare(b.label, "nb"));
  return out;
}

export { CUSTOM_SENTINEL };

export function resolveRoutineCategoryFromForm(preset: string, custom: string): string | null {
  const p = preset.trim();
  const c = custom.trim();
  if (p === CUSTOM_SENTINEL) {
    return c.length > 0 ? c : null;
  }
  if (p.length > 0) {
    return p;
  }
  return c.length > 0 ? c : null;
}

export function routineCategoryToPresetAndCustom(
  stored: string | null | undefined
): { preset: string; custom: string } {
  if (!stored?.trim()) {
    return { preset: "", custom: "" };
  }
  const presets = getRoutineCategoryPresets();
  const hit = presets.find((x) => x.value === stored);
  if (hit) {
    return { preset: stored, custom: "" };
  }
  return { preset: CUSTOM_SENTINEL, custom: stored };
}
