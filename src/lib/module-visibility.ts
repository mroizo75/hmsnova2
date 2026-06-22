/**
 * Modul-synlighet per tenant
 *
 * Admin kan konfigurere hvilke roller som kan SE (lese) hvert modul.
 * ADMIN-rollen har alltid tilgang og kan ikke fjernes.
 * Konfigurasjonen lagres som JSON i Tenant.moduleVisibilityConfig.
 */

import { Role } from "@prisma/client";
import type { RolePermissions } from "@/lib/permissions";

export type ModuleKey =
  | "incidents"
  | "ruh"
  | "sja"
  | "risks"
  | "forms"
  | "documents"
  | "chemicals"
  | "audits"
  | "inspections"
  | "training"
  | "actions"
  | "goals"
  | "environment"
  | "meetings"
  | "routines"
  | "whistleblowing"
  | "feedback";

export type ModuleVisibilityConfig = Partial<Record<ModuleKey, Role[]>>;

export const ALL_ROLES: Role[] = [
  "ADMIN",
  "HMS",
  "LEDER",
  "VERNEOMBUD",
  "ANSATT",
  "BHT",
  "REVISOR",
];

/** Standard synlighet – speiler rolePermissions-matrisen */
export const MODULE_DEFAULTS: Record<ModuleKey, Role[]> = {
  incidents:    ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "BHT", "REVISOR"],
  ruh:          ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"],
  sja:          ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"],
  risks:        ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "BHT", "REVISOR"],
  forms:        ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"],
  documents:    ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"],
  chemicals:    ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"],
  audits:       ["ADMIN", "HMS", "LEDER", "BHT", "REVISOR"],
  inspections:  ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "BHT", "REVISOR"],
  training:     ["ADMIN", "HMS", "LEDER", "ANSATT", "BHT", "REVISOR"],
  actions:      ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "BHT", "REVISOR"],
  goals:        ["ADMIN", "HMS", "LEDER", "BHT", "REVISOR"],
  environment:  ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "BHT"],
  meetings:     ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "BHT", "REVISOR"],
  routines:     ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"],
  whistleblowing: ["ADMIN", "HMS"],
  feedback:     ["ADMIN", "HMS", "LEDER", "BHT", "REVISOR"],
};

/** Norske visningsnavn for hvert modul */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  incidents:    "Avvik & hendelser",
  ruh:          "RUH – Rapport om uønsket hendelse",
  sja:          "SJA – Sikker jobb-analyse",
  risks:        "Risikovurderinger",
  forms:        "Skjemaer",
  documents:    "Dokumenter",
  chemicals:    "Stoffkartotek",
  audits:       "Revisjoner",
  inspections:  "Inspeksjoner / Vernerunde",
  training:     "Opplæring & kompetanse",
  actions:      "Tiltak",
  goals:        "Mål & KPIer",
  environment:  "Miljøstyring",
  meetings:     "AMU / Møter",
  routines:     "Rutiner",
  whistleblowing: "Varsling",
  feedback:     "Kundetilbakemelding",
};

/**
 * Hvilke RolePermissions-flagg hvert modul kontrollerer.
 *
 * VIKTIG: canCreate* / canFill* er IKKE med her – alle som har den retten
 * skal fortsatt kunne sende inn/rapportere selv om de ikke ser andres data.
 * Modul-synlighet styrer kun LESING og BEHANDLING.
 */
export const MODULE_PERMISSION_KEYS: Record<ModuleKey, Array<keyof RolePermissions>> = {
  incidents: [
    "canReadIncidents",
    "canReadOwnIncidents",
    "canInvestigateIncidents",
    "canCloseIncidents",
  ],
  ruh: [
    "canReadRuh",
    "canReadOwnRuh",
    "canHandleRuh",
  ],
  sja: [
    "canReadSja",
    "canReadOwnSja",
    "canApproveSja",
  ],
  risks:        ["canReadRisks", "canApproveRisks", "canDeleteRisks"],
  forms:        ["canReadForms", "canReadAllFormSubmissions", "canManageForms"],
  documents:    ["canReadDocuments", "canApproveDocuments", "canDeleteDocuments"],
  chemicals:    ["canReadChemicals"],
  audits:       ["canReadAudits", "canConductAudits", "canCloseAudits"],
  inspections:  ["canReadInspections", "canConductInspections", "canCloseInspections"],
  training:     ["canReadOwnTraining", "canReadAllTraining"],
  actions:      ["canReadActions"],
  goals:        ["canReadGoals"],
  environment:  ["canReadEnvironment"],
  meetings:     ["canReadMeetings", "canViewAllMeetings"],
  routines:     ["canReadRoutines"],
  whistleblowing: ["canViewWhistleblowing", "canHandleWhistleblowing"],
  feedback:     ["canReadOwnFeedback", "canReadAllFeedback"],
};

/**
 * Hent hvilke roller som har tilgang til et modul.
 * ADMIN er alltid inkludert.
 */
export function getVisibleRolesForModule(
  config: ModuleVisibilityConfig | null | undefined,
  module: ModuleKey
): Role[] {
  const base = config?.[module] ?? MODULE_DEFAULTS[module];
  if (!base.includes("ADMIN")) return ["ADMIN", ...base];
  return base;
}

/**
 * Sjekk om en rolle kan se et modul.
 * ADMIN har alltid tilgang uavhengig av konfig.
 */
export function canRoleAccessModule(
  config: ModuleVisibilityConfig | null | undefined,
  module: ModuleKey,
  role: Role
): boolean {
  if (role === "ADMIN") return true;
  return getVisibleRolesForModule(config, module).includes(role);
}

/**
 * Appliser modul-synlighet på et permissions-objekt.
 * Setter canRead*-flagg til false hvis rollen ikke har tilgang til modulet.
 */
export function applyModuleVisibility(
  permissions: RolePermissions,
  config: ModuleVisibilityConfig | null | undefined,
  role: Role
): RolePermissions {
  if (!config || role === "ADMIN") return permissions;

  const overridden = { ...permissions };

  for (const [moduleKey, permKeys] of Object.entries(MODULE_PERMISSION_KEYS) as [ModuleKey, Array<keyof RolePermissions>][]) {
    if (!canRoleAccessModule(config, moduleKey, role)) {
      for (const key of permKeys) {
        (overridden as any)[key] = false;
      }
    }
  }

  return overridden;
}

/**
 * Parse moduleVisibilityConfig fra Prisma JSON-felt.
 * Validerer at det er et gyldig objekt med kjente nøkler og Role[]-verdier.
 */
export function parseModuleVisibilityConfig(raw: unknown): ModuleVisibilityConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const config: ModuleVisibilityConfig = {};
  const validModules = Object.keys(MODULE_DEFAULTS) as ModuleKey[];
  const validRoles = new Set<string>(ALL_ROLES);

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!validModules.includes(key as ModuleKey)) continue;
    if (!Array.isArray(value)) continue;
    const roles = value.filter((r): r is Role => typeof r === "string" && validRoles.has(r));
    config[key as ModuleKey] = roles;
  }

  return config;
}

/**
 * Beregn varslings-roller for et modul.
 * Tar standard varslingsroller og filtrerer bort de som ikke har tilgang til modulet.
 */
export function getNotifyRolesForModule(
  config: ModuleVisibilityConfig | null | undefined,
  module: ModuleKey,
  defaultNotifyRoles: Role[]
): Role[] {
  const visibleRoles = getVisibleRolesForModule(config, module);
  return defaultNotifyRoles.filter((r) => visibleRoles.includes(r));
}
