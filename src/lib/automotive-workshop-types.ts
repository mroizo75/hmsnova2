import { parseIndustryScope } from "@/lib/industry-scope";

/**
 * Underkategorier for bilverksted.
 * Lagres som kommaseparerte verdier i Tenant.subIndustry.
 * Hjemmel: NACE 45.20 / 45.403 (BHT-plikt), verkstedforskriften FOR-2020-10-28-2170.
 */
export const AUTOMOTIVE_WORKSHOP_TYPES: ReadonlyArray<{
  value: string;
  label: string;
  description: string;
}> = [
  {
    value: "mekanisk",
    label: "Mekanisk / service",
    description: "Service og reparasjon av personbil og varebil (verksted 01/02/03)",
  },
  {
    value: "skade_lakk",
    label: "Skade og lakk",
    description: "Karosseri, lakk og skadereparasjon",
  },
  {
    value: "dekk",
    label: "Dekk og hjul",
    description: "Dekkhotell, hjulskift og dekkmontering",
  },
  {
    value: "pkk",
    label: "EU-kontroll",
    description: "Periodisk kjøretøykontroll / kontrollorgan",
  },
  {
    value: "elbil",
    label: "Elbil og hybrid",
    description: "Høyvolt, drivbatteri og NBF-praksis",
  },
  {
    value: "nyttekjoretoy",
    label: "Nyttekjøretøy",
    description: "Lastebil, buss og tyngre kjøretøy",
  },
  {
    value: "motorsykkel",
    label: "Motorsykkel",
    description: "MC-verksted (NACE 45.403)",
  },
  {
    value: "traktor",
    label: "Traktor / landbruk",
    description: "Landbruksverksted og traktor",
  },
];

export const AUTOMOTIVE_WORKSHOP_TYPE_VALUES = new Set(
  AUTOMOTIVE_WORKSHOP_TYPES.map((item) => item.value)
);

export function parseWorkshopTypes(subIndustry: string | null | undefined): string[] {
  if (!subIndustry?.trim()) {
    return [];
  }

  return subIndustry
    .split(/[,;|]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => AUTOMOTIVE_WORKSHOP_TYPE_VALUES.has(item));
}

export function serializeWorkshopTypes(values: ReadonlyArray<string>): string | null {
  const unique = Array.from(
    new Set(values.map((item) => item.trim().toLowerCase()).filter((item) => AUTOMOTIVE_WORKSHOP_TYPE_VALUES.has(item)))
  );
  return unique.length > 0 ? unique.join(",") : null;
}

/** Kjernemaler (uten underkategori-nøkkel) aktiveres alltid. Valgfrie kun ved treff. */
export function itemMatchesSelectedWorkshopTypes(
  workshopTypes: ReadonlyArray<string> | undefined,
  selected: ReadonlyArray<string>
): boolean {
  if (!workshopTypes || workshopTypes.length === 0) {
    return true;
  }
  if (selected.length === 0) {
    return false;
  }
  return workshopTypes.some((type) => selected.includes(type));
}

/**
 * Filtrerer verkstedmaler ved provision.
 * Maler med kun "automotive" er kjerne. Extra nøkler (skade_lakk, pkk, …) krever valgt type.
 * Fellesmaler med industryScope "all" tas med.
 */
export function routineScopeMatchesAutomotiveProvision(
  industryScope: unknown,
  selected: ReadonlyArray<string>
): boolean {
  const scope = parseIndustryScope(industryScope);
  if (scope.includes("all")) {
    return true;
  }
  if (!scope.includes("automotive")) {
    return false;
  }
  const extras = scope.filter((item) => AUTOMOTIVE_WORKSHOP_TYPE_VALUES.has(item));
  if (extras.length === 0) {
    return true;
  }
  if (selected.length === 0) {
    return false;
  }
  return extras.some((item) => selected.includes(item));
}
