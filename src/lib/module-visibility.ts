/**
 * Modul-synlighet per tenant
 *
 * Admin kan konfigurere hvilke roller som kan SE (lese) hvert servert modul.
 * ADMIN-rollen har alltid tilgang og kan ikke fjernes.
 * Konfigurasjonen lagres som JSON i Tenant.moduleVisibilityConfig.
 *
 * null i DB betyr systemstandard (MODULE_DEFAULTS) – aldri «ingen begrensning».
 */

import { Role } from "@prisma/client";
import { getPermissions, type RolePermissions } from "@/lib/permissions";

export type ModuleKey =
  | "incidents"
  | "ruh"
  | "sja"
  | "risks"
  | "wellbeing"
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
  | "feedback"
  | "employeeReviews";

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

/** Standard synlighet – speiler rolePermissions-matrisen for lesing av andres data */
export const MODULE_DEFAULTS: Record<ModuleKey, Role[]> = {
  incidents:    ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "BHT", "REVISOR"],
  ruh:          ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"],
  sja:          ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"],
  risks:        ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "BHT", "REVISOR"],
  wellbeing:    ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"],
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
  // Standard: kun ADMIN ser ALLE andres samtaler.
  // Alle brukere ser alltid egne samtaler uavhengig av dette.
  employeeReviews: ["ADMIN"],
};

/** Norske visningsnavn for hvert modul */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  incidents:    "Avvik & hendelser",
  ruh:          "RUH – Rapport om uønsket hendelse",
  sja:          "SJA – Sikker jobb-analyse",
  risks:        "Risikovurderinger",
  wellbeing:    "Psykososialt arbeidsmiljø",
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
  employeeReviews: "Medarbeidersamtaler (full oversikt)",
};

/**
 * Hvilke RolePermissions-flagg hvert modul kontrollerer.
 *
 * VIKTIG:
 * - canCreate* / canFill* er IKKE med – innsending forblir åpen.
 * - canReadOwn* er IKKE med – egne innsendinger/samtaler forblir synlige.
 * Modul-synlighet styrer kun LESING AV ANDRES data og BEHANDLING.
 */
export const MODULE_PERMISSION_KEYS: Record<ModuleKey, Array<keyof RolePermissions>> = {
  incidents: [
    "canReadIncidents",
    "canInvestigateIncidents",
    "canCloseIncidents",
  ],
  ruh: [
    "canReadRuh",
    "canHandleRuh",
  ],
  sja: [
    "canReadSja",
    "canApproveSja",
  ],
  risks:        ["canReadRisks", "canApproveRisks", "canDeleteRisks"],
  wellbeing:    ["canReadForms", "canReadAllFormSubmissions"],
  documents:    ["canReadDocuments", "canApproveDocuments", "canDeleteDocuments"],
  chemicals:    ["canReadChemicals"],
  audits:       ["canReadAudits", "canConductAudits", "canCloseAudits"],
  inspections:  ["canReadInspections", "canConductInspections", "canCloseInspections"],
  training:     ["canReadAllTraining"],
  actions:      ["canReadActions"],
  goals:        ["canReadGoals"],
  environment:  ["canReadEnvironment"],
  meetings:     ["canReadMeetings", "canViewAllMeetings"],
  routines:     ["canReadRoutines"],
  whistleblowing: ["canViewWhistleblowing", "canHandleWhistleblowing"],
  feedback:     ["canReadAllFeedback"],
  employeeReviews: ["canReadAllEmployeeReviews"],
};

/** Mapping fra nav-permission til modul-nøkkel */
export const NAV_PERMISSION_TO_MODULE: Partial<Record<string, ModuleKey>> = {
  incidents: "incidents",
  hseStatistics: "incidents",
  sja: "sja",
  documents: "documents",
  chemicals: "chemicals",
  audits: "audits",
  inspections: "inspections",
  training: "training",
  actions: "actions",
  goals: "goals",
  environment: "environment",
  meetings: "meetings",
  routines: "routines",
  whistleblowing: "whistleblowing",
  feedback: "feedback",
  risks: "risks",
  riskRegister: "risks",
  employeeReviews: "employeeReviews",
};

/**
 * Create/submit-tillatelser som holder nav synlig selv om lesing av andres data er stengt.
 */
export const MODULE_CREATE_PERMISSION: Partial<Record<ModuleKey, keyof RolePermissions>> = {
  incidents: "canCreateIncidents",
  ruh: "canCreateRuh",
  sja: "canCreateSja",
  wellbeing: "canFillForms",
  chemicals: "canCreateChemicals",
  inspections: "canCreateInspections",
  training: "canCreateTraining",
  actions: "canCreateActions",
  whistleblowing: "canSubmitWhistleblowing",
};

/**
 * Hent hvilke roller som har tilgang til et modul.
 * ADMIN er alltid inkludert. null-config → MODULE_DEFAULTS.
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
 * null/undefined config behandles som MODULE_DEFAULTS (aldri «ingen begrensning»).
 */
export function applyModuleVisibility(
  permissions: RolePermissions,
  config: ModuleVisibilityConfig | null | undefined,
  role: Role
): RolePermissions {
  if (role === "ADMIN") return permissions;

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
 * Effektiv tilgang for rolle + tenant-config (ren funksjon).
 */
export function getEffectivePermissions(
  role: Role,
  config: ModuleVisibilityConfig | null | undefined
): RolePermissions {
  return applyModuleVisibility(getPermissions(role), config, role);
}

/**
 * Om et nav-element skal vises gitt modul-synlighet.
 * Tillater innsendingsmoduler selv om lesing av andres data er stengt.
 */
export function isNavItemAllowedByModuleVisibility(
  permission: string,
  role: Role,
  config: ModuleVisibilityConfig | null | undefined,
  permissions: RolePermissions | null | undefined
): boolean {
  const moduleKey = NAV_PERMISSION_TO_MODULE[permission];
  if (!moduleKey) return true;
  if (canRoleAccessModule(config, moduleKey, role)) return true;
  const createPermKey = MODULE_CREATE_PERMISSION[moduleKey];
  return Boolean(createPermKey && permissions?.[createPermKey] === true);
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
