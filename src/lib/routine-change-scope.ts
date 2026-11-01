/** ISO 9001:2015 pkt. 6.3 og ISO 45001:2018 pkt. 8.1.3: omfanget styrer hvor tung godkjenningen er. */

export const ROUTINE_CHANGE_SCOPES = ["MINOR", "SIGNIFICANT"] as const;
export type RoutineChangeScopeValue = (typeof ROUTINE_CHANGE_SCOPES)[number];

export const APPROVED_MOC_STATUSES = ["APPROVED", "IMPLEMENTING", "VERIFYING", "CLOSED"] as const;

export function parseRoutineChangeScope(value: string | null | undefined): RoutineChangeScopeValue {
  return value === "SIGNIFICANT" ? "SIGNIFICANT" : "MINOR";
}

export function routineChangeRequiresApprovedMoc(scope: RoutineChangeScopeValue): boolean {
  return scope === "SIGNIFICANT";
}

export function approvedMocCoversRoutineChange(status: string): boolean {
  return (APPROVED_MOC_STATUSES as readonly string[]).includes(status);
}
