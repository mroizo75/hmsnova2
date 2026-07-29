/**
 * Prosjektreferanse på avvik.
 *
 * Mange virksomheter har flere tusen små oppdrag som ikke er registrert som egne
 * prosjekter. Melderen skriver derfor inn internt prosjektnummer eller adresse som
 * fritekst, slik at avviket likevel er sporbart til arbeidsstedet (AML § 3-1).
 *
 * Skriver melderen inn et nummer som finnes som prosjektkode eller ordrenummer,
 * kobles avviket til prosjektet slik at prosjektleder får varselet.
 *
 * Oppslaget er injiserbart slik at matchingen kan testes uten database.
 */

export const PROJECT_REFERENCE_MAX_LENGTH = 120;

export interface ProjectReferenceCandidate {
  id: string;
  code: string | null;
  orderNumber: string | null;
}

export interface ProjectReferenceLookups {
  /** Prosjekter i samme tenant som har kode eller ordrenummer satt. */
  findProjectsByReference(reference: string): Promise<ProjectReferenceCandidate[]>;
}

export function normalizeProjectReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, PROJECT_REFERENCE_MAX_LENGTH);
}

/** Sammenligningsform: uten mellomrom, bindestrek og skille mellom store og små bokstaver. */
function toComparableReference(value: string): string {
  return value.toLowerCase().replace(/[\s\-_/.]/g, "");
}

export function matchProjectByReference(
  reference: string,
  candidates: readonly ProjectReferenceCandidate[]
): string | null {
  const target = toComparableReference(reference);
  if (target.length === 0) return null;

  const matches = candidates.filter((candidate) => {
    const values = [candidate.code, candidate.orderNumber].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
    return values.some((value) => toComparableReference(value) === target);
  });

  // Tvetydige treff kobles ikke automatisk – da er fritekst tryggere enn feil prosjekt.
  return matches.length === 1 ? matches[0].id : null;
}

/**
 * Finner prosjektet en fritekstreferanse peker på. Returnerer null når referansen er
 * tom, ikke matcher noe prosjekt, eller matcher flere prosjekter.
 */
export async function resolveProjectIdFromReference(
  reference: string | null,
  lookups: ProjectReferenceLookups
): Promise<string | null> {
  const normalized = normalizeProjectReference(reference);
  if (!normalized) return null;

  const candidates = await lookups.findProjectsByReference(normalized);
  return matchProjectByReference(normalized, candidates);
}
