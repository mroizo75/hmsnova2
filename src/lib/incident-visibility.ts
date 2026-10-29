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

  if (!opts.canReadIncidents) {
    return false;
  }

  if (opts.role === "VERNEOMBUD") {
    return !isQualityOnlyIncident(opts.type, opts.subcategoryKeysRaw);
  }

  if (opts.role === "LEDER") {
    const departments = opts.viewerDepartmentIds?.length
      ? opts.viewerDepartmentIds
      : opts.viewerDepartmentId
        ? [opts.viewerDepartmentId]
        : [];
    if (opts.incidentDepartmentId && departments.includes(opts.incidentDepartmentId)) return true;
    if (departments.length === 0) return false;
    return Boolean(opts.reporterDepartmentId && departments.includes(opts.reporterDepartmentId));
  }

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
}): Record<string, unknown> | null {
  const managedProjectIds = opts.managedProjectIds ?? [];
  const assignedOrProject = [
    { responsibleId: opts.userId },
    ...(managedProjectIds.length > 0 ? [{ projectId: { in: [...managedProjectIds] } }] : []),
  ];

  const base: Record<string, unknown> = { tenantId: opts.tenantId };

  if (!opts.canReadIncidents && !opts.canReadOwnIncidents && managedProjectIds.length === 0) {
    return { ...base, responsibleId: opts.userId };
  }

  if (!opts.canReadIncidents) {
    return {
      ...base,
      OR: [
        ...(opts.canReadOwnIncidents ? [{ reportedBy: opts.userId }] : []),
        ...assignedOrProject,
      ],
    };
  }

  if (opts.role === "VERNEOMBUD") {
    return {
      ...base,
      type: { notIn: VO_HIDDEN_INCIDENT_TYPES },
    };
  }

  if (opts.role === "LEDER") {
    const ids = opts.departmentUserIds ?? [];
    return {
      ...base,
      OR: [
        ...(ids.length > 0
          ? [{ reportedBy: { in: ids } }, { reportedForUserId: { in: ids } }]
          : []),
        { reportedBy: opts.userId },
        ...((opts.departmentIds?.length ? opts.departmentIds : opts.departmentId ? [opts.departmentId] : []).length > 0
          ? [{ departmentId: { in: opts.departmentIds?.length ? opts.departmentIds : [opts.departmentId as string] } }]
          : []),
        ...assignedOrProject,
      ],
    };
  }

  return base;
}
