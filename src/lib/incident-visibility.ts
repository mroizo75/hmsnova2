import type { IncidentType, Role } from "@prisma/client";
import { TREATMENT_CHECKLIST_KEYS } from "@/lib/incident-treatment-checklist";

/** AML § 6-2: VO skal ha innsyn i arbeidsulykker, tilløp, yrkessykdom og arbeidsmiljø. */
export const VO_HMS_INCIDENT_TYPES: IncidentType[] = [
  "ULYKKE",
  "NESTEN",
  "FARLIG_SITUASJON",
  "YRKESSYKDOM",
  "HMS",
  "MILJO",
  "AVVIK",
  "SKADE",
];

export const VO_HIDDEN_INCIDENT_TYPES: IncidentType[] = ["KVALITET", "CUSTOMER"];

const QUALITY_ONLY_KEYS = new Set<string>([
  ...TREATMENT_CHECKLIST_KEYS.filter((key) => key !== "INTERN_AVVIK"),
  "KVALITET_VAREMOTTAK",
  "PRODUKT_FEIL",
  "TJENESTE_FEIL",
  "LEVERANDOR_FEIL",
  "PROSESS_FEIL",
  "KALIBRERING",
  "KVALITET_UTFORELSE",
  "KVALITET_DOKUMENTASJON",
  "KVALITET_FRIST",
  "KLAGE_UTFORELSE",
  "KLAGE_PRODUKT",
  "KLAGE_LEVERING",
  "KLAGE_REKLAMASJON",
]);

export function parseSubcategoryKeys(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

/**
 * AML § 6-2 (5): verneombudet skal gjøres kjent med yrkessykdom, arbeidsulykker,
 * tilløp og påviste feil og mangler. Kvalitets- og kundeavvik er ikke arbeidsmiljø.
 */
export function copyRolesForNewIncident(
  type: IncidentType | string,
  subcategoryKeysRaw?: string | null,
): Role[] {
  const roles: Role[] = ["ADMIN", "HMS"];
  if (!isQualityOnlyIncident(type as IncidentType, subcategoryKeysRaw)) {
    roles.push("VERNEOMBUD");
  }
  return roles;
}

export function isQualityOnlyIncident(type: IncidentType, subcategoryKeysRaw: string | null | undefined): boolean {
  if (VO_HIDDEN_INCIDENT_TYPES.includes(type)) return true;
  const keys = parseSubcategoryKeys(subcategoryKeysRaw);
  if (keys.length === 0) return false;
  return keys.every((key) => QUALITY_ONLY_KEYS.has(key));
}

/** Ansattportalen viser kun saker innsenderen selv har meldt (userId, ikke navn). */
export function employeeOwnIncidentsWhere(tenantId: string, userId: string) {
  return { tenantId, reportedBy: userId };
}

const FULL_INCIDENT_ACCESS_ROLES = new Set<Role>(["ADMIN", "HMS", "HR", "BHT", "REVISOR"]);

/**
 * Virkeområde for verneombud.
 * Hovedverneombud ser alle arbeidsmiljøavvik (AML § 6-1).
 * Verneombud knyttet til områder ser bare disse, inkludert underavdelinger.
 * Verneombud uten områder ser fortsatt alle arbeidsmiljøavvik til områdene er satt.
 */
export type SafetyIncidentScope =
  | { kind: "none" }
  | { kind: "all-hms" }
  | { kind: "areas"; departmentIds: string[] };

export function resolveSafetyIncidentScope(input: {
  isChiefSafetyRep: boolean;
  areaDepartmentIds: readonly string[];
  hasSafetyRole: boolean;
}): SafetyIncidentScope {
  if (input.isChiefSafetyRep || (input.hasSafetyRole && input.areaDepartmentIds.length === 0)) {
    return { kind: "all-hms" };
  }
  if (input.areaDepartmentIds.length > 0) {
    return { kind: "areas", departmentIds: [...input.areaDepartmentIds] };
  }
  return { kind: "none" };
}

export function safetyIncidentClause(
  scope: SafetyIncidentScope,
  memberUserIds: readonly string[],
): Record<string, unknown> | null {
  if (scope.kind === "none") return null;
  const typeFilter = { type: { notIn: VO_HIDDEN_INCIDENT_TYPES } };
  if (scope.kind === "all-hms") return typeFilter;
  const memberIds = [...memberUserIds];
  return {
    AND: [
      typeFilter,
      {
        OR: [
          { departmentId: { in: scope.departmentIds } },
          ...(memberIds.length > 0
            ? [{ reportedBy: { in: memberIds } }, { reportedForUserId: { in: memberIds } }]
            : []),
        ],
      },
    ],
  };
}

export function incidentPassesSafetyQualityFilter(input: {
  scope: SafetyIncidentScope;
  leaderDepartmentIds: readonly string[];
  viewerId: string;
  reportedBy: string;
  type: IncidentType;
  subcategoryKeys: string | null;
  incidentDepartmentId: string | null;
}): boolean {
  if (input.scope.kind === "none") return true;
  if (input.reportedBy === input.viewerId) return true;
  if (!isQualityOnlyIncident(input.type, input.subcategoryKeys)) return true;
  return Boolean(
    input.incidentDepartmentId && input.leaderDepartmentIds.includes(input.incidentDepartmentId),
  );
}

/** Admin og HMS får alltid kopi. Verneombud får kopi bare når de faktisk kan åpne avviket. */
export function receivesSafetyIncidentNotice(input: {
  isChiefSafetyRep: boolean;
  hasSafetyRole: boolean;
  areaDepartmentIds: readonly string[];
  incidentDepartmentId: string | null;
  reporterDepartmentId: string | null;
  hasFullCopyRole: boolean;
}): boolean {
  if (input.hasFullCopyRole) return true;
  const scope = resolveSafetyIncidentScope(input);
  if (scope.kind === "none" || scope.kind === "all-hms") return true;
  if (input.incidentDepartmentId && scope.departmentIds.includes(input.incidentDepartmentId)) return true;
  if (input.reporterDepartmentId && scope.departmentIds.includes(input.reporterDepartmentId)) return true;
  return false;
}

function matchesSafetyScope(opts: {
  safetyScope?: SafetyIncidentScope;
  type: IncidentType;
  subcategoryKeysRaw?: string | null;
  incidentDepartmentId?: string | null;
  reporterDepartmentId?: string | null;
}): boolean {
  const scope = opts.safetyScope;
  if (!scope || scope.kind === "none") return false;
  if (isQualityOnlyIncident(opts.type, opts.subcategoryKeysRaw)) return false;
  if (scope.kind === "all-hms") return true;
  if (opts.incidentDepartmentId && scope.departmentIds.includes(opts.incidentDepartmentId)) return true;
  if (opts.reporterDepartmentId && scope.departmentIds.includes(opts.reporterDepartmentId)) return true;
  return false;
}

export function canRoleSeeIncident(opts: {
  role: Role;
  canReadIncidents: boolean;
  canReadOwnIncidents: boolean;
  viewerId: string;
  reportedBy: string;
  type: IncidentType;
  subcategoryKeysRaw?: string | null;
  reporterDepartmentId?: string | null;
  viewerDepartmentId?: string | null;
  incidentDepartmentId?: string | null;
  viewerDepartmentIds?: readonly string[] | null;
  responsibleId?: string | null;
  projectId?: string | null;
  managedProjectIds?: readonly string[];
  isLeader?: boolean;
  safetyScope?: SafetyIncidentScope;
}): boolean {
  const assignedToViewer = opts.responsibleId === opts.viewerId;
  const managesProject = Boolean(
    opts.projectId && opts.managedProjectIds?.includes(opts.projectId),
  );
  // «Send videre» og prosjektleder skal se saken selv om melderen sitter i en annen avdeling.
  if (assignedToViewer || managesProject) return true;

  if (opts.reportedBy === opts.viewerId && opts.canReadOwnIncidents) {
    return true;
  }

  if (matchesSafetyScope(opts)) return true;

  if (!opts.canReadIncidents) {
    return false;
  }

  if (opts.role === "VERNEOMBUD" && !opts.safetyScope) {
    return !isQualityOnlyIncident(opts.type, opts.subcategoryKeysRaw);
  }

  const isLeader = opts.isLeader ?? opts.role === "LEDER";
  if (isLeader) {
    const departments = opts.viewerDepartmentIds?.length
      ? opts.viewerDepartmentIds
      : opts.viewerDepartmentId
        ? [opts.viewerDepartmentId]
        : [];
    if (opts.incidentDepartmentId && departments.includes(opts.incidentDepartmentId)) return true;
    if (departments.length === 0) return false;
    return Boolean(opts.reporterDepartmentId && departments.includes(opts.reporterDepartmentId));
  }

  if (opts.role === "VERNEOMBUD") return false;

  return true;
}

export function prismaIncidentWhereForRole(opts: {
  role: Role;
  tenantId: string;
  userId: string;
  canReadIncidents: boolean;
  canReadOwnIncidents: boolean;
  departmentId: string | null;
  departmentIds?: string[];
  departmentUserIds?: string[];
  managedProjectIds?: readonly string[];
  roles?: readonly Role[];
  safetyScope?: SafetyIncidentScope;
  safetyMemberUserIds?: readonly string[];
}): Record<string, unknown> | null {
  const roles = opts.roles?.length ? [...opts.roles] : [opts.role];
  const scope = opts.safetyScope ?? (opts.role === "VERNEOMBUD" ? { kind: "all-hms" as const } : { kind: "none" as const });
  const managedProjectIds = opts.managedProjectIds ?? [];
  const assignedOrProject = [
    { responsibleId: opts.userId },
    ...(managedProjectIds.length > 0 ? [{ projectId: { in: [...managedProjectIds] } }] : []),
  ];

  const base: Record<string, unknown> = { tenantId: opts.tenantId };

  if (opts.canReadIncidents && roles.some((role) => FULL_INCIDENT_ACCESS_ROLES.has(role))) {
    return base;
  }

  const safetyClause = safetyIncidentClause(scope, opts.safetyMemberUserIds ?? []);
  const isLeader = roles.includes("LEDER");
  const parts: Record<string, unknown>[] = [...assignedOrProject];

  if (opts.canReadOwnIncidents || isLeader || roles.includes("VERNEOMBUD") || scope.kind !== "none") {
    parts.push({ reportedBy: opts.userId });
  }

  if (isLeader) {
    const ids = opts.departmentUserIds ?? [];
    if (ids.length > 0) {
      parts.push({ reportedBy: { in: ids } }, { reportedForUserId: { in: ids } });
    }
    const departmentIds = opts.departmentIds?.length
      ? opts.departmentIds
      : opts.departmentId
        ? [opts.departmentId]
        : [];
    if (departmentIds.length > 0) {
      parts.push({ departmentId: { in: departmentIds } });
    }
  }

  if (safetyClause) parts.push(safetyClause);

  if (!opts.canReadIncidents && !opts.canReadOwnIncidents && managedProjectIds.length === 0 && !safetyClause) {
    return { ...base, responsibleId: opts.userId };
  }

  return { ...base, OR: parts };
}
