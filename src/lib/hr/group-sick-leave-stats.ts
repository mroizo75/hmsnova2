/**
 * Aggregert sykefravær for konsern.
 * AML § 5-1 (4): statistikk over sykefravær.
 * AML § 4-6: forfalte oppfølgingsplaner og dialogmøter.
 * GDPR art. 9: bare tall. Ingen navn, grunn eller diagnose.
 * Bedrifter under anonymitetsgrensen skjules i oppstillingen.
 */

export const SICK_LEAVE_MIN_EMPLOYEES = 5;

export type SickLeaveAbsenceSpan = {
  tenantId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  percentage: number;
};

export type GroupSickLeaveTenantStat = {
  tenantId: string;
  tenantName: string;
  employeeCount: number;
  onSickLeaveNow: number | null;
  sickLeavePercentage: number | null;
  sickDays: number | null;
  overdueFollowUps: number;
  hidden: boolean;
};

export type GroupSickLeaveSummary = {
  onSickLeaveNow: number;
  sickLeavePercentage: number;
  sickDays: number;
  availableWorkdays: number;
  overdueFollowUps: number;
  byTenant: GroupSickLeaveTenantStat[];
};

export function countWeekdays(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const current = new Date(start);
  current.setHours(12, 0, 0, 0);
  const last = new Date(end);
  last.setHours(12, 0, 0, 0);
  while (current <= last) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function overlapDays(start: Date, end: Date, periodStart: Date, periodEnd: Date, percentage: number): number {
  const from = new Date(Math.max(start.getTime(), periodStart.getTime()));
  const to = new Date(Math.min(end.getTime(), periodEnd.getTime()));
  if (from > to) return 0;
  return countWeekdays(from, to) * (percentage / 100);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function summarizeGroupSickLeave(input: {
  tenants: Array<{ tenantId: string; tenantName: string; employeeCount: number }>;
  absences: SickLeaveAbsenceSpan[];
  overdueByTenant: Array<{ tenantId: string; count: number }>;
  periodStart: Date;
  periodEnd: Date;
  today: Date;
}): GroupSickLeaveSummary {
  const overdue = new Map(input.overdueByTenant.map((row) => [row.tenantId, row.count]));
  const periodDays = countWeekdays(input.periodStart, input.periodEnd);

  const byTenant = input.tenants.map((tenant) => {
    const rows = input.absences.filter((absence) => absence.tenantId === tenant.tenantId);
    const sickDays = rows.reduce(
      (sum, absence) =>
        sum + overlapDays(absence.startDate, absence.endDate, input.periodStart, input.periodEnd, absence.percentage),
      0,
    );
    const onSickLeaveNow = new Set(
      rows
        .filter((absence) => absence.startDate <= input.today && absence.endDate >= input.today)
        .map((absence) => absence.userId),
    ).size;
    const available = tenant.employeeCount * periodDays;
    const percentage = available > 0 ? Math.round((sickDays / available) * 10000) / 100 : 0;
    const hidden = tenant.employeeCount < SICK_LEAVE_MIN_EMPLOYEES;
    return {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      employeeCount: tenant.employeeCount,
      onSickLeaveNow: hidden ? null : onSickLeaveNow,
      sickLeavePercentage: hidden ? null : percentage,
      sickDays: hidden ? null : round1(sickDays),
      overdueFollowUps: overdue.get(tenant.tenantId) ?? 0,
      hidden,
    };
  });

  const totalEmployees = input.tenants.reduce((sum, tenant) => sum + tenant.employeeCount, 0);
  const totalSickDays = input.absences.reduce(
    (sum, absence) =>
      sum + overlapDays(absence.startDate, absence.endDate, input.periodStart, input.periodEnd, absence.percentage),
    0,
  );
  const availableWorkdays = totalEmployees * periodDays;
  const onSickLeaveNow = new Set(
    input.absences
      .filter((absence) => absence.startDate <= input.today && absence.endDate >= input.today)
      .map((absence) => `${absence.tenantId}:${absence.userId}`),
  ).size;

  return {
    onSickLeaveNow,
    sickDays: round1(totalSickDays),
    availableWorkdays,
    sickLeavePercentage:
      availableWorkdays > 0 ? Math.round((totalSickDays / availableWorkdays) * 10000) / 100 : 0,
    overdueFollowUps: input.overdueByTenant.reduce((sum, row) => sum + row.count, 0),
    byTenant: byTenant.sort((a, b) => (b.sickLeavePercentage ?? -1) - (a.sickLeavePercentage ?? -1)),
  };
}
