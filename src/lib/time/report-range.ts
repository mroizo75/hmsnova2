import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  getWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { nb } from "date-fns/locale";

export type TimeReportPeriod = "day" | "week" | "month" | "year";

export function getTimeReportDateRange(input: {
  period: string;
  year?: number;
  month?: number;
  week?: number;
  date?: string;
}): { from: Date; to: Date } {
  const now = new Date();
  const y = input.year ?? now.getFullYear();

  if (input.period === "day") {
    const day = input.date ? new Date(`${input.date.slice(0, 10)}T12:00:00`) : now;
    return { from: startOfDay(day), to: endOfDay(day) };
  }

  if (input.period === "week") {
    const w = input.week ?? getWeek(now, { weekStartsOn: 1, locale: nb });
    const from = startOfWeek(new Date(y, 0, 1 + (w - 1) * 7), {
      weekStartsOn: 1,
      locale: nb,
    });
    return { from, to: endOfWeek(from, { weekStartsOn: 1, locale: nb }) };
  }

  if (input.period === "month") {
    const m = (input.month ?? now.getMonth() + 1) - 1;
    const from = startOfMonth(new Date(y, m, 1));
    return { from, to: endOfMonth(from) };
  }

  const from = startOfYear(new Date(y, 0, 1));
  return { from, to: endOfYear(from) };
}
