/** ISO 9001:2015 pkt. 8.4: kriterier, godkjenning og re-evaluering av leverandører. */

export const SUPPLIER_STATUSES = ["PENDING", "APPROVED", "CONDITIONAL", "REJECTED", "SUSPENDED"] as const;
export type SupplierStatusValue = (typeof SUPPLIER_STATUSES)[number];

export const SUPPLIER_CRITICALITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type SupplierCriticalityValue = (typeof SUPPLIER_CRITICALITIES)[number];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatusValue, string> = {
  PENDING: "Til vurdering",
  APPROVED: "Godkjent",
  CONDITIONAL: "Betinget godkjent",
  REJECTED: "Avvist",
  SUSPENDED: "Suspendert",
};

export const SUPPLIER_CRITICALITY_LABELS: Record<SupplierCriticalityValue, string> = {
  LOW: "Lav",
  MEDIUM: "Middels",
  HIGH: "Høy",
};

export function approvalRequiresCriteria(status: string): boolean {
  return status === "APPROVED" || status === "CONDITIONAL";
}

export function validateSupplierApproval(input: {
  status: string;
  criteria: string;
  nextReviewAt: Date | null;
  now: Date;
}): { ok: true } | { ok: false; message: string } {
  if (!approvalRequiresCriteria(input.status)) {
    return { ok: true };
  }
  if (input.criteria.trim().length < 10) {
    return { ok: false, message: "Godkjenning krever kriterier for leveransen (ISO 9001 pkt. 8.4)." };
  }
  if (!input.nextReviewAt || Number.isNaN(input.nextReviewAt.getTime())) {
    return { ok: false, message: "Godkjenning krever dato for re-evaluering." };
  }
  const startOfToday = new Date(input.now);
  startOfToday.setHours(0, 0, 0, 0);
  if (input.nextReviewAt < startOfToday) {
    return { ok: false, message: "Dato for re-evaluering må være i dag eller senere." };
  }
  return { ok: true };
}

export function normalizeOrgNumber(value: string): string | null {
  const digits = value.replace(/\s/g, "");
  if (!digits) return null;
  if (!/^\d{9}$/.test(digits)) {
    throw new Error("Organisasjonsnummer må være 9 siffer");
  }
  return digits;
}

export function supplierPerformance(input: {
  openDeviations: number;
  hasEvaluation: boolean;
}): { score: number | null; label: string } {
  if (!input.hasEvaluation && input.openDeviations === 0) {
    return { score: null, label: "Ikke evaluert" };
  }
  const score = Math.max(0, 100 - input.openDeviations * 15);
  if (score >= 80) return { score, label: "God" };
  if (score >= 50) return { score, label: "Følges opp" };
  return { score, label: "Svak" };
}
