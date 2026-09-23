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
  rules: Array<{
    salaryTypeId?: string | null;
    timeType?: string | null;
    factor: number;
    appliesToUserIds?: unknown;
  }>,
  input: { salaryTypeId?: string | null; timeType?: string | null; userId?: string }
): number {
  const applicable = rules.filter((r) => {
    const ids = Array.isArray(r.appliesToUserIds) ? (r.appliesToUserIds as string[]) : [];
    if (ids.length === 0) return true;
    return Boolean(input.userId && ids.includes(input.userId));
  });
  const bySalary = applicable.find((r) => r.salaryTypeId && r.salaryTypeId === input.salaryTypeId);
  if (bySalary) return bySalary.factor;
  const byType = applicable.find((r) => r.timeType && r.timeType === input.timeType);
  if (byType) return byType.factor;
  const fallback = applicable.find((r) => !r.salaryTypeId && !r.timeType);
  return fallback?.factor ?? 1;
}

export function assertTimeBankBalance(
  next: number,
  limits: { min?: number | null; max?: number | null }
): { ok: boolean; error?: string } {
  if (limits.max != null && next > limits.max) {
    return { ok: false, error: `Timebank kan ikke overstige ${limits.max} t` };
  }
  if (limits.min != null && next < limits.min) {
    return { ok: false, error: `Timebank kan ikke gå under ${limits.min} t` };
  }
  return { ok: true };
}

export function withinTakeLimit(hours: number, maxTakeHours?: number | null): boolean {
  if (maxTakeHours == null) return true;
  return hours <= maxTakeHours;
}
