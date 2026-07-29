import { z } from "zod";
import { ActionEffectiveness, IncidentStage, IncidentType, IncidentStatus } from "@prisma/client";
import { PROJECT_REFERENCE_MAX_LENGTH } from "@/lib/incident-project-reference";

/**
 * ISO 9001 - 10.2 Avvik og korrigerende tiltak
 * 
 * Krav:
 * a) Reagere på avvik, og om aktuelt:
 *    1) iverksette tiltak for å kontrollere og rette opp i avviket
 *    2) håndtere konsekvensene
 * b) Vurdere behovet for tiltak for å eliminere årsakene til avviket
 * c) Implementere nødvendige tiltak
 * d) Gjennomgå effektiviteten av korrigerende tiltak som er iverksatt
 * e) Oppdatere risikoer og muligheter bestemt under planlegging, om nødvendig
 * f) Foreta endringer i kvalitetsstyringssystemet, om nødvendig
 * 
 * Avvik skal dokumenteres og bevares som dokumentert informasjon.
 */

export const createIncidentSchema = z.object({
  tenantId: z.string().cuid(),
  type: z.nativeEnum(IncidentType),
  title: z.string().min(5, "Tittel må være minst 5 tegn"),
  description: z.string().min(20, "Beskrivelse må være minst 20 tegn"),
  // Valgfri: leder vurderer alvorlighetsgrad ved behandling (IK-HMS § 5)
  severity: z.number().int().min(1).max(5, "Alvorlighetsgrad må være 1-5").nullish(),
  occurredAt: z.date(),
  reportedBy: z.string().cuid(),
  reportedForUserId: z.string().cuid().optional(),
  location: z.string().optional(),
  witnessName: z.string().optional(),
  immediateAction: z.string().optional(),
  injuryType: z.string().max(120).optional(),
  medicalAttentionRequired: z.boolean().optional(),
  lostTimeMinutes: z.number().int().min(0).optional(),
  riskReferenceId: z.string().cuid().optional(),
  customerName: z.string().max(140).optional().or(z.literal("")),
  customerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  customerPhone: z.string().max(60).optional().or(z.literal("")),
  customerTicketId: z.string().max(120).optional().or(z.literal("")),
  responseDeadline: z.date().optional(),
  customerSatisfaction: z.number().int().min(1).max(5).optional(),
  // Prosjektkobling
  projectId: z.string().cuid().optional(),
  // Fritekst prosjektnummer/adresse for oppdrag som ikke er registrert som prosjekt
  projectReference: z.string().max(PROJECT_REFERENCE_MAX_LENGTH).optional().nullable(),
  // Underkategorier (sjekkbokser per hendelsestype)
  subcategoryKeys: z.array(z.string()).optional(),
  // RUH-felt (AML § 5-2)
  involvedPersons: z.string().optional(),
  injuryDescription: z.string().optional(),
  suggestedActions: z.string().optional(),
  // HSE-statistikk (TRIR-beregning)
  isFatal: z.boolean().optional(),
  isLostTimeIncident: z.boolean().optional(),
  lostWorkdays: z.number().int().min(0).optional(),
  isRestrictedWork: z.boolean().optional(),
});

export const updateIncidentSchema = z.object({
  id: z.string().cuid(),
  type: z.nativeEnum(IncidentType).optional(),
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  severity: z.number().int().min(1).max(5).nullish(),
  occurredAt: z.date().optional(),
  location: z.string().optional(),
  witnessName: z.string().optional(),
  immediateAction: z.string().optional(),
  rootCause: z.string().optional(), // ISO 9001: Årsaksanalyse
  contributingFactors: z.string().optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  injuryType: z.string().max(120).optional(),
  medicalAttentionRequired: z.boolean().optional(),
  lostTimeMinutes: z.number().int().min(0).optional(),
  riskReferenceId: z.string().cuid().optional().nullable(),
  measureEffectiveness: z.nativeEnum(ActionEffectiveness).optional(),
  stage: z.nativeEnum(IncidentStage).optional(),
  customerName: z.string().max(140).optional().or(z.literal("")),
  customerEmail: z.union([z.string().email(), z.literal("")]).optional().nullable(),
  customerPhone: z.string().max(60).optional().or(z.literal("")),
  customerTicketId: z.string().max(120).optional().or(z.literal("")),
  responseDeadline: z.date().optional().nullable(),
  customerSatisfaction: z.number().int().min(1).max(5).optional().nullable(),
  // Prosjektkobling
  projectId: z.string().cuid().optional().nullable(),
  projectReference: z.string().max(PROJECT_REFERENCE_MAX_LENGTH).optional().nullable(),
  // Underkategorier
  subcategoryKeys: z.array(z.string()).optional(),
  // RUH-felt
  involvedPersons: z.string().optional(),
  injuryDescription: z.string().optional(),
  suggestedActions: z.string().optional(),
  // HSE-statistikk
  isFatal: z.boolean().optional(),
  isLostTimeIncident: z.boolean().optional(),
  lostWorkdays: z.number().int().min(0).optional(),
  isRestrictedWork: z.boolean().optional(),
  // Kilde: INTERNAL eller EXTERNAL
  source: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
});

export const investigateIncidentSchema = z.object({
  id: z.string().cuid(),
  rootCause: z.string().min(20, "Årsaksanalyse må være minst 20 tegn"),
  contributingFactors: z.string().optional(),
  investigatedBy: z.string().cuid(),
});

export const closeIncidentSchema = z.object({
  id: z.string().cuid(),
  closedBy: z.string().cuid(),
  effectivenessReview: z.string().min(20, "Effektivitetsvurdering må være minst 20 tegn"),
  lessonsLearned: z.string().optional(),
  measureEffectiveness: z.nativeEnum(ActionEffectiveness).optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type InvestigateIncidentInput = z.infer<typeof investigateIncidentSchema>;
export type CloseIncidentInput = z.infer<typeof closeIncidentSchema>;

export type MainIncidentCategory = "AVVIK" | "RUH";

const RUH_TYPES: ReadonlySet<IncidentType> = new Set<IncidentType>([
  "ULYKKE",
  "NESTEN",
  "FARLIG_SITUASJON",
  "YRKESSYKDOM",
]);

export function getMainCategory(type: IncidentType): MainIncidentCategory {
  return RUH_TYPES.has(type) ? "RUH" : "AVVIK";
}

/**
 * Toppnivå i typevalget når et avvik meldes.
 *
 * Virksomheter som bruker RUH velger først mellom Avvik og RUH. Virksomheter som
 * har slått av RUH velger i stedet fagområde, slik at meldeplikten etter
 * arbeidsmiljøloven § 5-2 dekkes av HMS-gruppen.
 */
export type IncidentTypeGroup =
  | "AVVIK"
  | "RUH"
  | "HMS"
  | "KVALITET"
  | "MILJO"
  | "CUSTOMER";

export interface IncidentTypeGroupDefinition {
  group: IncidentTypeGroup;
  types: readonly IncidentType[];
  /**
   * Typer som hører til gruppen, men ikke tilbys i skjemaet. Dekker eldre data og
   * systemgenererte avvik, slik at et lagret avvik alltid finner gruppen sin.
   */
  legacyTypes?: readonly IncidentType[];
}

export const RUH_MODE_GROUPS: readonly IncidentTypeGroupDefinition[] = [
  { group: "AVVIK", types: ["HMS", "KVALITET", "MILJO", "CUSTOMER"], legacyTypes: ["AVVIK"] },
  {
    group: "RUH",
    types: ["ULYKKE", "NESTEN", "FARLIG_SITUASJON", "YRKESSYKDOM"],
    legacyTypes: ["SKADE"],
  },
];

export const AVVIK_ONLY_GROUPS: readonly IncidentTypeGroupDefinition[] = [
  // AML § 5-1, § 5-2 og § 2-3: ulykke, tilløp, sykdom og farlige forhold
  {
    group: "HMS",
    types: ["HMS", "ULYKKE", "NESTEN", "FARLIG_SITUASJON", "YRKESSYKDOM"],
    legacyTypes: ["AVVIK", "SKADE"],
  },
  { group: "KVALITET", types: ["KVALITET"] },
  { group: "MILJO", types: ["MILJO"] },
  { group: "CUSTOMER", types: ["CUSTOMER"] },
];

export function getIncidentTypeGroups(
  ruhModuleEnabled: boolean
): readonly IncidentTypeGroupDefinition[] {
  return ruhModuleEnabled ? RUH_MODE_GROUPS : AVVIK_ONLY_GROUPS;
}

export function getIncidentTypesForGroup(
  group: IncidentTypeGroup,
  ruhModuleEnabled: boolean
): readonly IncidentType[] {
  const definition = getIncidentTypeGroups(ruhModuleEnabled).find(
    (candidate) => candidate.group === group
  );
  return definition?.types ?? [];
}

/**
 * Finner gruppen en type hører til, også for typer som bare finnes i eldre data.
 * Returnerer null når typen ikke hører til noen gruppe i gjeldende oppsett.
 */
export function getIncidentTypeGroup(
  type: IncidentType | "",
  ruhModuleEnabled: boolean
): IncidentTypeGroup | null {
  if (!type) return null;
  const definition = getIncidentTypeGroups(ruhModuleEnabled).find(
    (candidate) =>
      candidate.types.includes(type) || (candidate.legacyTypes?.includes(type) ?? false)
  );
  return definition?.group ?? null;
}

/**
 * Grupper med bare én type trenger ikke et eget typevalg – typen velges direkte.
 */
export function getSingleTypeForGroup(
  group: IncidentTypeGroup,
  ruhModuleEnabled: boolean
): IncidentType | null {
  const types = getIncidentTypesForGroup(group, ruhModuleEnabled);
  return types.length === 1 ? types[0] : null;
}

export function getMainCategoryLabel(category: MainIncidentCategory): string {
  return category === "RUH" ? "RUH" : "Avvik";
}

export function getMainCategoryColor(category: MainIncidentCategory): string {
  return category === "RUH"
    ? "bg-orange-50 text-orange-700 border-orange-300"
    : "bg-blue-50 text-blue-700 border-blue-300";
}

/**
 * Get incident type label
 */
export function getIncidentTypeLabel(type: IncidentType): string {
  const labels: Record<IncidentType, string> = {
    AVVIK: "Avvik",
    NESTEN: "Nestenulykke",
    ULYKKE: "Arbeidsulykke",
    FARLIG_SITUASJON: "Farlig situasjon / observasjon",
    YRKESSYKDOM: "Yrkessykdom",
    SKADE: "Personskade",
    MILJO: "Miljøavvik",
    KVALITET: "Kvalitetsavvik",
    HMS: "HMS-avvik",
    CUSTOMER: "Kundeklage",
  };
  return labels[type];
}

/**
 * Get incident type color
 */
export function getIncidentTypeColor(type: IncidentType): string {
  const colors: Record<IncidentType, string> = {
    AVVIK: "bg-orange-100 text-orange-800 border-orange-300",
    NESTEN: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ULYKKE: "bg-red-100 text-red-800 border-red-300",
    FARLIG_SITUASJON: "bg-amber-100 text-amber-800 border-amber-300",
    YRKESSYKDOM: "bg-pink-100 text-pink-800 border-pink-300",
    SKADE: "bg-red-100 text-red-800 border-red-300",
    MILJO: "bg-green-100 text-green-800 border-green-300",
    KVALITET: "bg-blue-100 text-blue-800 border-blue-300",
    HMS: "bg-teal-100 text-teal-800 border-teal-300",
    CUSTOMER: "bg-purple-100 text-purple-800 border-purple-300",
  };
  return colors[type];
}

/**
 * Get severity label and color.
 * Null betyr at alvorlighetsgraden ennå ikke er vurdert av leder.
 */
export function getSeverityInfo(severity: number | null | undefined): { label: string; color: string; bgColor: string; textColor: string } {
  if (severity === null || severity === undefined) {
    return {
      label: "Ikke vurdert",
      color: "text-slate-700",
      bgColor: "bg-slate-100 border-slate-300",
      textColor: "text-slate-700",
    };
  }
  if (severity >= 5) {
    return {
      label: "Kritisk",
      color: "text-red-900",
      bgColor: "bg-red-100 border-red-300",
      textColor: "text-red-900",
    };
  } else if (severity >= 4) {
    return {
      label: "Alvorlig",
      color: "text-orange-900",
      bgColor: "bg-orange-100 border-orange-300",
      textColor: "text-orange-900",
    };
  } else if (severity >= 3) {
    return {
      label: "Moderat",
      color: "text-yellow-900",
      bgColor: "bg-yellow-100 border-yellow-300",
      textColor: "text-yellow-900",
    };
  } else if (severity >= 2) {
    return {
      label: "Mindre",
      color: "text-blue-900",
      bgColor: "bg-blue-100 border-blue-300",
      textColor: "text-blue-900",
    };
  } else {
    return {
      label: "Ubetydelig",
      color: "text-gray-900",
      bgColor: "bg-gray-100 border-gray-300",
      textColor: "text-gray-900",
    };
  }
}

/**
 * Get status label
 */
// ISO 9001/45001 kap. 10.2 – avvik skal følges opp til lukket
export function getIncidentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    OPEN: "Registrert",
    INVESTIGATING: "Under utredning",
    ACTION_TAKEN: "Tiltak iverksatt",
    CLOSED: "Lukket",
  };
  return labels[status] || status;
}

/**
 * Get status color
 */
export function getIncidentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: "bg-red-100 text-red-800 border-red-300",
    INVESTIGATING: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ACTION_TAKEN: "bg-blue-100 text-blue-800 border-blue-300",
    CLOSED: "bg-green-100 text-green-800 border-green-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
}

export function getIncidentStageLabel(stage: IncidentStage): string {
  const labels: Record<IncidentStage, string> = {
    REPORTED: "Rapportert",
    UNDER_REVIEW: "Under vurdering",
    ROOT_CAUSE: "Årsak funnet",
    ACTIONS_DEFINED: "Tiltak planlagt",
    ACTIONS_COMPLETE: "Tiltak utført",
    VERIFIED: "Verifisert",
  };
  return labels[stage];
}

