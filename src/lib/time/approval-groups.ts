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
  fromAddress: string | null;
  toAddress: string | null;
};

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
  entryIds: string[];
  usage: ApprovalUsage[];
};

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
        entryIds: [],
        usage: [],
      } satisfies ApprovalDay);
    current.entryIds.push(entry.id);
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
