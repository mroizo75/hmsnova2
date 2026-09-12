export type DayRules = {
  dayStartHour: number;
  dayEndHour: number;
  overtime50CapHours: number;
  saturdayOt50UntilHour: number;
  lunchMinutes: number;
};

export type SplitSegment = {
  timeType: "NORMAL" | "OVERTIME_50" | "OVERTIME_100";
  hours: number;
};

export function parseClockToHours(clock: string): number | null {
  const match = clock.trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours > 23 || minutes > 59) return null;
  return Math.round((hours + minutes / 60) * 100) / 100;
}

export function hoursToClock(hour: number): string {
  const totalMinutes = Math.round(hour * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = ((totalMinutes % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function netWorkedHours(fromHour: number, toHour: number, lunchMinutes: number): number {
  let span = toHour - fromHour;
  if (span < 0) span += 24;
  const net = span - lunchMinutes / 60;
  return Math.max(0, Math.round(net * 100) / 100);
}

export function weekdayNormHours(rules: DayRules): number {
  const lunchHours = rules.lunchMinutes / 60;
  return Math.max(0, Math.round((rules.dayEndHour - rules.dayStartHour - lunchHours) * 100) / 100);
}

function pushSegment(segments: SplitSegment[], timeType: SplitSegment["timeType"], hours: number) {
  if (hours <= 0) return;
  const last = segments[segments.length - 1];
  if (last && last.timeType === timeType) {
    last.hours = Math.round((last.hours + hours) * 100) / 100;
    return;
  }
  segments.push({ timeType, hours: Math.round(hours * 100) / 100 });
}

/** Splitt klokketid i aktivitetsspor etter tenant-dagsregler (AML kap. 10 — konfigurerbart). */
export function splitDayHours(input: {
  date: Date;
  clockFrom: string;
  clockTo: string;
  lunchMinutes: number;
  rules: DayRules;
}): SplitSegment[] {
  const from = parseClockToHours(input.clockFrom);
  const to = parseClockToHours(input.clockTo);
  if (from == null || to == null) return [];
  const net = netWorkedHours(from, to, input.lunchMinutes);
  if (net <= 0) return [];

  const weekday = input.date.getDay();
  const segments: SplitSegment[] = [];

  if (weekday === 0) {
    pushSegment(segments, "OVERTIME_100", net);
    return segments;
  }

  if (weekday === 6) {
    const cap = input.rules.saturdayOt50UntilHour;
    const lunchHours = input.lunchMinutes / 60;
    let remaining = net;
    const grossUntilCap = Math.max(0, Math.min(to, cap) - from);
    const ot50 = Math.max(0, Math.min(remaining, Math.max(0, grossUntilCap - lunchHours)));
    pushSegment(segments, "OVERTIME_50", ot50);
    remaining = Math.round((remaining - ot50) * 100) / 100;
    pushSegment(segments, "OVERTIME_100", remaining);
    return segments;
  }

  const normalCap = weekdayNormHours({ ...input.rules, lunchMinutes: input.lunchMinutes });
  const normal = Math.min(net, normalCap);
  pushSegment(segments, "NORMAL", normal);
  let overtime = Math.round((net - normal) * 100) / 100;
  const ot50 = Math.min(overtime, input.rules.overtime50CapHours);
  pushSegment(segments, "OVERTIME_50", ot50);
  overtime = Math.round((overtime - ot50) * 100) / 100;
  pushSegment(segments, "OVERTIME_100", overtime);
  return segments;
}
