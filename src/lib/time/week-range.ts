/**
 * Kalenderuke for timeføring (man–søn).
 * @db.Date sammenlignes som UTC-dato, ikke lokal midnatt.
 */
export function calendarDateUtc(iso: string): Date {
  const day = iso.slice(0, 10);
  return new Date(`${day}T00:00:00.000Z`);
}

export function addCalendarDays(iso: string, days: number): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function mondayOfWeek(iso: string): string {
  const day = iso.slice(0, 10);
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  const weekday = utc.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addCalendarDays(day, offset);
}

export function weekDateRange(weekStartIso: string): {
  from: Date;
  to: Date;
  days: string[];
} {
  const monday = mondayOfWeek(weekStartIso);
  const days = Array.from({ length: 7 }, (_, i) => addCalendarDays(monday, i));
  return {
    from: calendarDateUtc(days[0]),
    to: calendarDateUtc(days[6]),
    days,
  };
}

export function entryDateKey(value: Date | string): string {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
    return parsed.toISOString().slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

export function dayIndexInWeek(entryDate: Date | string, weekDays: string[]): number {
  return weekDays.indexOf(entryDateKey(entryDate));
}
