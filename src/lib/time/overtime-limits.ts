/**
 * Varsler mot overtidsrammene i AML § 10-6.
 * Tallene brukes bare som informasjon. De skal aldri stoppe timeføring.
 */

export const OVERTIME_TIME_TYPES = ["OVERTIME_40", "OVERTIME_50", "OVERTIME_100", "WEEKEND"] as const;

export const OVERTIME_CAPS = {
  sevenDays: { days: 7, hours: 10 },
  fourWeeks: { days: 28, hours: 25 },
  year: { days: 52 * 7, hours: 200 },
} as const;

export type OvertimeWindowKey = keyof typeof OVERTIME_CAPS;
export type OvertimeLimitLevel = "ok" | "near" | "over";

const NEAR_RATIO = 0.8;

export type OvertimeHoursRow = {
  date: string;
  hours: number;
};

export type OvertimeWindow = {
  key: OvertimeWindowKey;
  days: number;
  cap: number;
  used: number;
  level: OvertimeLimitLevel;
};

export function isOvertimeTimeType(timeType: string): boolean {
  return (OVERTIME_TIME_TYPES as readonly string[]).includes(timeType);
}

export function overtimeLimitLevel(used: number, cap: number): OvertimeLimitLevel {
  if (used > cap) return "over";
  if (used >= cap * NEAR_RATIO) return "near";
  return "ok";
}

/** Kalenderdager fra fromIso til toIso. Begge er YYYY-MM-DD. */
export function calendarDaysBetween(fromIso: string, toIso: string): number {
  const from = utcDay(fromIso);
  const to = utcDay(toIso);
  return Math.round((to - from) / 86_400_000);
}

export function sumOvertimeHours(entries: OvertimeHoursRow[], asOf: string, windowDays: number): number {
  const total = entries.reduce((sum, entry) => {
    const age = calendarDaysBetween(entry.date, asOf);
    if (age < 0 || age > windowDays - 1) return sum;
    return sum + (Number.isFinite(entry.hours) ? entry.hours : 0);
  }, 0);
  return Math.round(total * 10) / 10;
}

export function assessOvertimeLimits(entries: OvertimeHoursRow[], asOf: string): OvertimeWindow[] {
  return (Object.keys(OVERTIME_CAPS) as OvertimeWindowKey[]).map((key) => {
    const rule = OVERTIME_CAPS[key];
    const used = sumOvertimeHours(entries, asOf, rule.days);
    return {
      key,
      days: rule.days,
      cap: rule.hours,
      used,
      level: overtimeLimitLevel(used, rule.hours),
    };
  });
}

function utcDay(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
}
