import { z } from "zod";

/**
 * Brannøvelse — Forskrift om brannforebygging § 12 og § 13
 *
 * § 12b: Rutiner for evakuering og redning ved brann
 * § 12c: Rutiner som sikrer tilstrekkelige kunnskaper og ferdigheter
 * § 12d: Informasjon til alle som oppholder seg i byggverket
 * § 12e: Rutiner for å avdekke, rette opp og forebygge mangler
 * § 13:  Dokumentasjon av alle pliktene etter § 11 og § 12
 *
 * Anbefalt hyppighet: minst én fullskala evakueringsøvelse per år (DSB-veiledning)
 */

export const FIRE_DRILL_TYPES = ["EVACUATION", "FIRE_SUPPRESSION", "ALARM_TEST", "FULL_SCALE"] as const;
export type FireDrillType = (typeof FIRE_DRILL_TYPES)[number];

export const FIRE_DRILL_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "EVALUATED", "CANCELLED"] as const;
export type FireDrillStatus = (typeof FIRE_DRILL_STATUSES)[number];

export const FIRE_DRILL_TYPE_LABELS: Record<FireDrillType, string> = {
  EVACUATION: "Evakueringsøvelse",
  FIRE_SUPPRESSION: "Slokkeopplæring",
  ALARM_TEST: "Brannalarmtest",
  FULL_SCALE: "Fullskalaøvelse",
};

export const FIRE_DRILL_STATUS_LABELS: Record<FireDrillStatus, string> = {
  PLANNED: "Planlagt",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Gjennomført",
  EVALUATED: "Evaluert",
  CANCELLED: "Avlyst",
};

export const OBJECTIVES_ACHIEVED_LABELS: Record<string, string> = {
  FULL: "Ja — alle mål nådd",
  PARTIAL: "Delvis — noen mål nådd",
  NOT_ACHIEVED: "Nei — mål ikke nådd",
};

export const createFireDrillSchema = z.object({
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  drillType: z.enum(FIRE_DRILL_TYPES),
  isAnnounced: z.boolean().default(true),
  plannedDate: z.date({ error: "Planlagt dato er påkrevd" }),
  location: z.string().min(2, "Lokasjon er påkrevd — § 13"),
  responsibleId: z.string().cuid("Øvingsleder er påkrevd"),
  // § 12b/c/d: mål er obligatorisk for å dokumentere hensikt
  objectives: z.string().min(10, "Mål for øvelsen er påkrevd (min. 10 tegn) — § 12"),
  scenario: z.string().optional(),
  riskAssessment: z.string().optional(),
  participantIds: z.array(z.string().cuid()).optional(),
  // § 4 tredje ledd: samordning mellom brukere i delt bygg
  sharedPremises: z.boolean().default(false),
  buildingOwnerCoordinated: z.boolean().optional(),
  buildingOwnerName: z.string().optional(),
  otherTenantsInformed: z.boolean().optional(),
  fullBuildingEvacuation: z.boolean().optional(),
  totalBuildingOccupants: z.number().int().min(1).optional(),
});

export const completeFireDrillSchema = z.object({
  completedAt: z.date({ error: "Gjennomføringsdato er påkrevd" }),
  // § 13: antall deltakere er lovpålagt i dokumentasjonen
  actualParticipantCount: z
    .number()
    .int()
    .min(1, "Minst 1 deltaker — påkrevd for § 13-dokumentasjon"),
  evacuationTimeSeconds: z.number().int().min(1).optional(),
  // § 13: observasjoner er lovpålagt
  observations: z.string().min(10, "Observasjoner er påkrevd (min. 10 tegn) — § 13"),
});

export const evaluateFireDrillSchema = z.object({
  objectivesAchieved: z.enum(["FULL", "PARTIAL", "NOT_ACHIEVED"], {
    error: "Angi om målene ble nådd",
  }),
  // § 12e + § 13: evaluering er lovpålagt
  evaluation: z.string().min(10, "Evaluering er påkrevd (min. 10 tegn) — § 12e"),
  // § 13: forbedringspunkter er lovpålagt i dokumentasjon
  improvementPoints: z.string().min(5, "Forbedringspunkter er påkrevd — § 13"),
  procedureChangesNeeded: z.boolean().default(false),
  procedureChangesDesc: z.string().optional(),
});

export const updateFireDrillSchema = z.object({
  title: z.string().min(3).optional(),
  drillType: z.enum(FIRE_DRILL_TYPES).optional(),
  isAnnounced: z.boolean().optional(),
  plannedDate: z.date().optional(),
  location: z.string().min(2).optional(),
  responsibleId: z.string().cuid().optional(),
  objectives: z.string().min(10).optional(),
  scenario: z.string().optional(),
  riskAssessment: z.string().optional(),
  participantIds: z.array(z.string().cuid()).optional(),
  status: z.enum(FIRE_DRILL_STATUSES).optional(),
  sharedPremises: z.boolean().optional(),
  buildingOwnerCoordinated: z.boolean().optional(),
  buildingOwnerName: z.string().optional(),
  otherTenantsInformed: z.boolean().optional(),
  fullBuildingEvacuation: z.boolean().optional(),
  totalBuildingOccupants: z.number().int().min(1).optional(),
});

export type CreateFireDrillInput = z.infer<typeof createFireDrillSchema>;
export type CompleteFireDrillInput = z.infer<typeof completeFireDrillSchema>;
export type EvaluateFireDrillInput = z.infer<typeof evaluateFireDrillSchema>;
export type UpdateFireDrillInput = z.infer<typeof updateFireDrillSchema>;
