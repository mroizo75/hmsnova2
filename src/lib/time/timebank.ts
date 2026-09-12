export type TimeBankKind = "EARN" | "TAKE" | "PAYOUT" | "CORRECTION";

export function applyTimeBankFactor(hours: number, factor: number): number {
  if (hours <= 0 || factor <= 0) return 0;
  return Math.round(hours * factor * 100) / 100;
}

export function nextTimeBankBalance(
  current: number,
  kind: TimeBankKind,
  hours: number
): number {
  const delta = Math.round(Math.abs(hours) * 100) / 100;
  if (kind === "EARN") return Math.round((current + delta) * 100) / 100;
  if (kind === "CORRECTION") {
    return Math.round((current + hours) * 100) / 100;
  }
  return Math.round((current - delta) * 100) / 100;
}

export function pickTimeBankFactor(
  rules: Array<{ salaryTypeId?: string | null; timeType?: string | null; factor: number }>,
  input: { salaryTypeId?: string | null; timeType?: string | null }
): number {
  const bySalary = rules.find((r) => r.salaryTypeId && r.salaryTypeId === input.salaryTypeId);
  if (bySalary) return bySalary.factor;
  const byType = rules.find((r) => r.timeType && r.timeType === input.timeType);
  if (byType) return byType.factor;
  const fallback = rules.find((r) => !r.salaryTypeId && !r.timeType);
  return fallback?.factor ?? 1;
}
