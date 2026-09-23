const DEFAULT_SKIP = new Set(["COMPENSATORY"]);

export function shouldSyncAbsenceToPayroll(
  type: string,
  payrollTypes: unknown
): boolean {
  if (Array.isArray(payrollTypes) && payrollTypes.length > 0) {
    return payrollTypes.includes(type);
  }
  return !DEFAULT_SKIP.has(type);
}
