import { K_ANONYMITY_THRESHOLD } from "@/features/intelligence/lib/metrics";

/**
 * NHO-rapporter til foreninger.
 *
 * GDPR: Bedriftsnavn og org.nr. skal ikke ut. Enkeltpersonforetak har ofte
 * personnavn i firmanavnet (personopplysning, art. 4 nr. 1). HMS-tall per
 * navngitt virksomhet er kundedata vi behandler som databehandler (art. 28)
 * og kan ikke deles med NHO uten samtykke. Anonymisert bransjestatistikk
 * med k-anonymitet (k >= 5) er hjemlet i personvernerklæringen pkt. 3b
 * og GDPR fortale 26.
 */

export interface AssociationIndustryGroup {
  canonical: string;
  label: string;
  values: readonly string[];
}

export interface NhoAssociation {
  id: string;
  label: string;
  filenamePrefix: string;
  industries: readonly AssociationIndustryGroup[];
}

export const NHO_ASSOCIATIONS: readonly NhoAssociation[] = [
  {
    id: "nho-reiseliv",
    label: "NHO Reiseliv",
    filenamePrefix: "NHO_Reiseliv_HMS",
    industries: [
      {
        canonical: "hospitality",
        label: "Hotell og overnatting",
        values: ["hospitality", "hotell", "hotel"],
      },
      {
        canonical: "food_service",
        label: "Restaurant, kafé og catering",
        values: ["food_service", "restaurant"],
      },
      {
        canonical: "aktivitet",
        label: "Aktivitet og opplevelse",
        values: ["aktivitet"],
      },
    ],
  },
];

export const DEFAULT_NHO_ASSOCIATION_ID = "nho-reiseliv";

export interface TenantHmsMetrics {
  industry: string | null;
  incidents90d: number;
  risks: number;
  inspections: number;
  trainings: number;
  measuresCompleted: number;
  measuresPending: number;
}

export interface AssociationTotals {
  tenantCount: number;
  incidents90d: number;
  risks: number;
  inspections: number;
  trainings: number;
  measuresCompleted: number;
  measuresPending: number;
}

export interface AssociationIndustryTotals extends AssociationTotals {
  industry: string;
  label: string;
}

export interface AssociationReport {
  associationId: string;
  associationLabel: string;
  kAnonymity: number;
  belowThreshold: boolean;
  totals: AssociationTotals | null;
  byIndustry: AssociationIndustryTotals[];
}

export function getNhoAssociation(id: string | null | undefined): NhoAssociation | null {
  const key = (id ?? DEFAULT_NHO_ASSOCIATION_ID).trim().toLowerCase();
  return NHO_ASSOCIATIONS.find((item) => item.id === key) ?? null;
}

export function getAssociationIndustryValues(association: NhoAssociation): string[] {
  const values = new Set<string>();
  for (const group of association.industries) {
    values.add(group.canonical);
    for (const value of group.values) values.add(value);
  }
  return [...values];
}

export function canonicalAssociationIndustry(
  association: NhoAssociation,
  industry: string | null | undefined,
): string | null {
  const normalized = (industry ?? "").trim().toLowerCase();
  if (!normalized) return null;
  for (const group of association.industries) {
    if (group.canonical === normalized || group.values.includes(normalized)) {
      return group.canonical;
    }
  }
  return null;
}

export function industryGroupLabel(association: NhoAssociation, canonical: string): string {
  return association.industries.find((group) => group.canonical === canonical)?.label ?? canonical;
}

function emptyTotals(): AssociationTotals {
  return {
    tenantCount: 0,
    incidents90d: 0,
    risks: 0,
    inspections: 0,
    trainings: 0,
    measuresCompleted: 0,
    measuresPending: 0,
  };
}

function addMetrics(target: AssociationTotals, row: TenantHmsMetrics): void {
  target.tenantCount += 1;
  target.incidents90d += row.incidents90d;
  target.risks += row.risks;
  target.inspections += row.inspections;
  target.trainings += row.trainings;
  target.measuresCompleted += row.measuresCompleted;
  target.measuresPending += row.measuresPending;
}

export function buildAssociationReport(
  rows: TenantHmsMetrics[],
  association: NhoAssociation,
  kAnonymity = K_ANONYMITY_THRESHOLD,
): AssociationReport {
  const matching: Array<{ canonical: string; row: TenantHmsMetrics }> = [];
  for (const row of rows) {
    const canonical = canonicalAssociationIndustry(association, row.industry);
    if (!canonical) continue;
    matching.push({ canonical, row });
  }

  if (matching.length < kAnonymity) {
    return {
      associationId: association.id,
      associationLabel: association.label,
      kAnonymity,
      belowThreshold: true,
      totals: null,
      byIndustry: [],
    };
  }

  const totals = emptyTotals();
  const grouped = new Map<string, AssociationTotals>();

  for (const item of matching) {
    addMetrics(totals, item.row);
    const bucket = grouped.get(item.canonical) ?? emptyTotals();
    addMetrics(bucket, item.row);
    grouped.set(item.canonical, bucket);
  }

  const byIndustry: AssociationIndustryTotals[] = [];
  const remainder = emptyTotals();

  for (const group of association.industries) {
    const bucket = grouped.get(group.canonical);
    if (!bucket) continue;
    if (bucket.tenantCount >= kAnonymity) {
      byIndustry.push({
        industry: group.canonical,
        label: group.label,
        ...bucket,
      });
    } else {
      remainder.tenantCount += bucket.tenantCount;
      remainder.incidents90d += bucket.incidents90d;
      remainder.risks += bucket.risks;
      remainder.inspections += bucket.inspections;
      remainder.trainings += bucket.trainings;
      remainder.measuresCompleted += bucket.measuresCompleted;
      remainder.measuresPending += bucket.measuresPending;
    }
  }

  if (remainder.tenantCount >= kAnonymity) {
    byIndustry.push({
      industry: "other_in_scope",
      label: "Øvrige bransjer i utvalget",
      ...remainder,
    });
  }

  return {
    associationId: association.id,
    associationLabel: association.label,
    kAnonymity,
    belowThreshold: false,
    totals,
    byIndustry,
  };
}

export function measureCompletionRate(totals: AssociationTotals | null): string {
  if (!totals) return "Skjult";
  const all = totals.measuresCompleted + totals.measuresPending;
  if (all === 0) return "N/A";
  return `${Math.round((totals.measuresCompleted / all) * 100)}%`;
}
