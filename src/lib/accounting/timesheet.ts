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
