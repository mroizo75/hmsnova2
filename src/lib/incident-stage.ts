import type { IncidentStage, IncidentStatus } from "@prisma/client";

/**
 * ISO 9001 kap. 10.2 / ISO 45001 kap. 10.2 - fremdriften i behandlingen av et
 * avvik (stage) er en fremoverdrevet prosess: rapportert → under vurdering →
 * årsak funnet → tiltak planlagt → tiltak utført → verifisert.
 */
const STAGE_ORDER: readonly IncidentStage[] = [
  "REPORTED",
  "UNDER_REVIEW",
  "ROOT_CAUSE",
  "ACTIONS_DEFINED",
  "ACTIONS_COMPLETE",
  "VERIFIED",
];

export function stageFromStatus(status: IncidentStatus): IncidentStage {
  switch (status) {
    case "INVESTIGATING":
      return "UNDER_REVIEW";
    case "ACTION_TAKEN":
      return "ACTIONS_DEFINED";
    case "CLOSED":
      return "VERIFIED";
    case "OPEN":
    default:
      return "REPORTED";
  }
}

/**
 * Beregner neste stage for et avvik uten å noen gang nedgradere den.
 *
 * Bakgrunn: flere skjemaer (behandlingsskjema, årsaksanalyse, tiltak) kan
 * oppdatere samme avvik uavhengig av hverandre og sender ofte inn den
 * uendrede statusen på nytt (f.eks. "INVESTIGATING") selv om årsaksanalyse
 * allerede er gjennomført (stage=ROOT_CAUSE). Uten denne sperren ble stage
 * feilaktig satt tilbake til et tidligere steg, og den synlige
 * fremdriftsindikatoren i avvikslisten (IK-HMS § 5 nr. 7) viste feil status.
 *
 * `explicitStage` brukes når kallstedet vet nøyaktig hvilket steg avviket skal
 * til (f.eks. investigateIncident → ROOT_CAUSE, closeIncident → VERIFIED).
 */
export function resolveIncidentStage(
  currentStage: IncidentStage,
  nextStatus: IncidentStatus | undefined,
  explicitStage?: IncidentStage | null
): IncidentStage {
  if (explicitStage) return explicitStage;
  if (!nextStatus) return currentStage;

  const candidate = stageFromStatus(nextStatus);
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const candidateIndex = STAGE_ORDER.indexOf(candidate);
  return candidateIndex > currentIndex ? candidate : currentStage;
}
