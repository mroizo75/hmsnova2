/**
 * IK-mat § 5 nr. 4–5 og forordning (EF) 852/2004 art. 5:
 * Avvik skal registreres, håndteres og følges opp slik at de ikke gjentas.
 */

export const IK_MAT_SOURCE = "IK-MAT";

export const IK_MAT_SUBCATEGORY = {
  temperatur: "MATTEMPERATUR_AVVIK",
  renhold: "HYGIENE_AVVIK",
  varemottak: "VAREMOTTAK",
  haccp: "HACCP_AVVIK",
  allergen: "KLAGE_ALLERGEN_SERVERING",
} as const;

export const TEMP_LIMITS: Record<string, { min: number; max: number; label: string }> = {
  KJOLEROM: { min: -2, max: 8, label: "Kjølerom" },
  FRYSER: { min: -40, max: -15, label: "Fryser" },
  VARMHOLDING: { min: 60, max: 100, label: "Varmholding" },
  ANNET: { min: -40, max: 100, label: "Annet" },
};

/** Typisk øvre grense for kjølevarer ved mottak. */
export const VAREMOTTAK_MAX_TEMP = 8;

export function isTemperatureDeviation(unitType: string, temperature: number): boolean {
  const limit = TEMP_LIMITS[unitType];
  if (!limit) return false;
  return temperature < limit.min || temperature > limit.max;
}

export function shouldCreateVaremottakAvvik(input: {
  accepted: boolean;
  deviationNote?: string | null;
  temperature?: number | null;
}): boolean {
  if (!input.accepted) return true;
  if (input.deviationNote?.trim()) return true;
  if (input.temperature != null && input.temperature > VAREMOTTAK_MAX_TEMP) return true;
  return false;
}

export function isIkMatIncident(incident: {
  projectReference?: string | null;
  subcategoryKeys?: string | null;
}): boolean {
  if (incident.projectReference === IK_MAT_SOURCE) return true;
  const keys = incident.subcategoryKeys ?? "";
  return Object.values(IK_MAT_SUBCATEGORY).some((key) => keys.includes(key));
}
