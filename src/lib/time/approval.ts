const SYNCABLE = new Set(["APPROVED", "SYNC_ERROR"]);

export function canEnqueueTimesheetSync(approvalStatus: string): boolean {
  return SYNCABLE.has(approvalStatus);
}

export function isTimesheetEditableByEmployee(approvalStatus: string): boolean {
  return approvalStatus === "DRAFT" || approvalStatus === "SUBMITTED" || approvalStatus === "REJECTED";
}
