export type TimesheetKey = {
  employeeId: string;
  date: string;
  activityId: string;
  projectId: string;
};

export function timesheetKeysMatch(a: TimesheetKey, b: TimesheetKey): boolean {
  return (
    a.employeeId === b.employeeId &&
    a.date === b.date &&
    a.activityId === b.activityId &&
    a.projectId === b.projectId
  );
}

export function mergedTimesheetHours(existingHours: number, addedHours: number): number {
  return Math.round((existingHours + addedHours) * 100) / 100;
}

export function activityIdForTimeType(
  timeType: string,
  mapping: {
    normal?: string | null;
    ot50?: string | null;
    ot100?: string | null;
  }
): string | null {
  if (timeType === "OVERTIME_100" || timeType === "WEEKEND") {
    return mapping.ot100 ?? mapping.ot50 ?? mapping.normal ?? null;
  }
  if (timeType === "OVERTIME_50" || timeType === "OVERTIME_40") {
    return mapping.ot50 ?? mapping.normal ?? null;
  }
  return mapping.normal ?? null;
}

export function pickDefaultTimesheetActivities(
  activities: Array<{ externalId: string; name: string }>
): { normal: string | null; ot50: string | null; ot100: string | null } {
  const usable = activities.filter((row) => row.externalId && row.name.trim());
  if (usable.length === 0) {
    return { normal: null, ot50: null, ot100: null };
  }
  const normal =
    bestActivity(usable, ["ordinær", "normal", "arbeidstid", "timer", "time"]) ?? usable[0].externalId;
  const ot50 = bestActivity(usable, ["overtid 50", "ot 50", "50 %", "50%"]) ?? normal;
  const ot100 = bestActivity(usable, ["overtid 100", "ot 100", "100 %", "100%", "helg"]) ?? ot50;
  return { normal, ot50, ot100 };
}

function bestActivity(
  activities: Array<{ externalId: string; name: string }>,
  needles: string[]
): string | null {
  const hit = activities.find((row) => {
    const name = row.name.toLowerCase();
    return needles.some((needle) => name.includes(needle));
  });
  return hit?.externalId ?? null;
}
