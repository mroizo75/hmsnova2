/**
 * Folketrygdloven § 8-23–§ 8-27: egenmelding inntil 3 kalenderdager
 * sammenhengende (lengre kun ved IA-avtale). Etter det kreves sykmelding.
 * GDPR art. 9: diagnose hører ikke hjemme i ansattens egenmelding.
 */

export const MAX_SELF_CERTIFIED_CALENDAR_DAYS = 3;

export function calendarDaysInclusive(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate.slice(0, 10)}T12:00:00`);
  const end = Date.parse(`${endDate.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}
