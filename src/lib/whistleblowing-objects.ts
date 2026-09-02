/**
 * Tilgangsobjekter i varslingssaker.
 * AML kap. 2 A / Arbeidstilsynet: identitet og saksopplysninger kun for strengt nødvendig krets.
 */

export const ACCESS_OBJECTS = [
  "ORIGINAL",
  "IDENTITY",
  "NOTES",
  "ATTACHMENTS",
  "STATEMENT",
  "MEASURE",
] as const;

export type AccessObject = (typeof ACCESS_OBJECTS)[number];

export const DEFAULT_ASSIGN_OBJECTS: AccessObject[] = ["ORIGINAL", "NOTES"];
export const DEFAULT_ASSIST_OBJECTS: AccessObject[] = ["ORIGINAL"];
export const FULL_CASE_OBJECTS: AccessObject[] = [...ACCESS_OBJECTS];
export const MEASURE_OBJECTS: AccessObject[] = ["MEASURE"];
export const STATEMENT_OBJECTS: AccessObject[] = ["STATEMENT"];

export const ACCESS_OBJECT_LABELS: Record<AccessObject, string> = {
  ORIGINAL: "Originalvarsel",
  IDENTITY: "Varslerens identitet",
  NOTES: "Interne saksnotater",
  ATTACHMENTS: "Vedlegg",
  STATEMENT: "Saksfremstilling til uttalelse",
  MEASURE: "Tiltak",
};

const OBJECT_SET = new Set<string>(ACCESS_OBJECTS);

export function parseAccessObjects(raw: string | null | undefined): AccessObject[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AccessObject => typeof item === "string" && OBJECT_SET.has(item));
  } catch {
    return [];
  }
}

export function stringifyAccessObjects(objects: AccessObject[]): string {
  const unique = [...new Set(objects.filter((item) => OBJECT_SET.has(item)))];
  return JSON.stringify(unique);
}

export function hasAccessObject(objects: AccessObject[], object: AccessObject): boolean {
  return objects.includes(object);
}
