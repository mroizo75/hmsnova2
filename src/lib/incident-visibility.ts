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
}): boolean {
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
    if (!opts.viewerDepartmentId) return false;
    return opts.reporterDepartmentId === opts.viewerDepartmentId;
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
  departmentUserIds?: string[];
}): Record<string, unknown> | null {
  if (!opts.canReadIncidents && !opts.canReadOwnIncidents) {
    return null;
  }

  const base: Record<string, unknown> = { tenantId: opts.tenantId };

  if (!opts.canReadIncidents) {
    return { ...base, reportedBy: opts.userId };
  }

  if (opts.role === "VERNEOMBUD") {
    return {
      ...base,
      type: { notIn: VO_HIDDEN_INCIDENT_TYPES },
    };
  }

  if (opts.role === "LEDER") {
    const ids = opts.departmentUserIds ?? [];
    if (!opts.departmentId || ids.length === 0) {
      return { ...base, reportedBy: opts.userId };
    }
    return {
      ...base,
      OR: [{ reportedBy: { in: ids } }, { reportedForUserId: { in: ids } }, { reportedBy: opts.userId }],
    };
  }

  return base;
}
