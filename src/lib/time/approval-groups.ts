export type ApprovalEntry = {
  id: string;
  userId: string;
  projectId: string;
  date: string | Date;
  hours: number;
  timeType: string;
  clockFrom: string | null;
  clockTo: string | null;
  lunchMinutes: number;
  comment: string | null;
  approvalStatus: string;
  payCategoryLabel?: string | null;
  billingActivityId?: string | null;
  user: { name: string | null; email: string };
  project: { name: string; parentName?: string | null };
};

export type ApprovalUsage = {
  id: string;
  userId: string;
  projectId: string;
  date: string | Date;
  kind: string;
  productName: string;
  quantity: number;
  isPrivateCar?: boolean;
  fromAddress: string | null;
  toAddress: string | null;
};

/** Servicebil faktureres kunden og er ikke lønnstillegg. Privatbil er kjøregodtgjørelse. */
export function isServiceCarLine(line: Pick<ApprovalUsage, "kind" | "isPrivateCar">): boolean {
  return line.kind === "KM" && !line.isPrivateCar;
}

/** Lønnstillegg på stemplingen er kjøregodtgjørelse. Vare og maskin faktureres og er ikke tillegg. Overtid har egne kolonner. */
export function approvalSupplementLabel(usage: ApprovalUsage[]): string {
  return usage
    .filter((line) => line.kind === "KM" && line.isPrivateCar)
    .map((line) => `${line.quantity} km`)
    .join(", ");
}

export function approvalOrderLabel(usage: ApprovalUsage[]): string {
  return usage
    .filter((line) => line.kind === "PRODUCT" || line.kind === "MACHINE")
    .map((line) => `${line.quantity} ${line.productName}`)
    .join(", ");
}

export type ApprovalHourFilter = "all" | "work" | "overtime" | "allowance" | "order";

export function matchesApprovalFilter(
  day: Pick<ApprovalDay, "normal" | "ot50" | "ot100" | "usage" | "activityIds">,
  hour: ApprovalHourFilter,
  activityId = ""
): boolean {
  if (activityId && !day.activityIds.includes(activityId)) return false;
  if (hour === "work") return day.normal > 0;
  if (hour === "overtime") return day.ot50 + day.ot100 > 0;
  if (hour === "allowance") return day.usage.some((line) => line.kind === "KM" && line.isPrivateCar);
  if (hour === "order") {
    return day.usage.some(
      (line) => line.kind === "PRODUCT" || line.kind === "MACHINE" || isServiceCarLine(line)
    );
  }
  return true;
}

export function serviceDrivingKm(usage: ApprovalUsage[]): number {
  return usage.filter(isServiceCarLine).reduce((sum, line) => sum + line.quantity, 0);
}

export type ApprovalDay = {
  key: string;
  userId: string;
  projectId: string;
  date: string;
  userName: string;
  projectName: string;
  parentName: string | null;
  clockFrom: string | null;
  clockTo: string | null;
  comment: string | null;
  status: string;
  normal: number;
  ot50: number;
  ot100: number;
  lunchMinutes: number;
  payCategoryLabel: string;
  entryIds: string[];
  activityIds: string[];
  usage: ApprovalUsage[];
};

export function isoWeekNumber(isoDate: string): number {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function dayKey(value: string | Date): string {
  return String(value).slice(0, 10);
}

/** Ett kort per ansatt, dato, prosjekt og klokkeslett. */
export function groupApprovalDays(entries: ApprovalEntry[], usage: ApprovalUsage[]): ApprovalDay[] {
  const groups = new Map<string, ApprovalDay>();
  for (const entry of entries) {
    const day = dayKey(entry.date);
    const key = `${entry.userId}|${day}|${entry.projectId}|${entry.clockFrom ?? ""}|${entry.clockTo ?? ""}`;
    const current =
      groups.get(key) ??
      ({
        key,
        userId: entry.userId,
        projectId: entry.projectId,
        date: day,
        userName: entry.user.name || entry.user.email,
        projectName: entry.project.name,
        parentName: entry.project.parentName ?? null,
        clockFrom: entry.clockFrom,
        clockTo: entry.clockTo,
        comment: entry.comment,
        status: entry.approvalStatus,
        normal: 0,
        ot50: 0,
        ot100: 0,
        lunchMinutes: 0,
        payCategoryLabel: entry.payCategoryLabel ?? "",
        entryIds: [],
        activityIds: [],
        usage: [],
      } satisfies ApprovalDay);
    current.entryIds.push(entry.id);
    if (entry.billingActivityId && !current.activityIds.includes(entry.billingActivityId)) {
      current.activityIds.push(entry.billingActivityId);
    }
    if (entry.timeType === "OVERTIME_100" || entry.timeType === "WEEKEND") current.ot100 += entry.hours;
    else if (entry.timeType === "OVERTIME_50" || entry.timeType === "OVERTIME_40") current.ot50 += entry.hours;
    else current.normal += entry.hours;
    current.lunchMinutes = Math.max(current.lunchMinutes, entry.lunchMinutes ?? 0);
    groups.set(key, current);
  }
  for (const day of groups.values()) {
    day.usage = usage.filter(
      (line) =>
        line.userId === day.userId &&
        line.projectId === day.projectId &&
        dayKey(line.date) === day.date
    );
  }
  return [...groups.values()];
}
