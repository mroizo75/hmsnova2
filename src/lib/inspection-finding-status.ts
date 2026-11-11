export const INSPECTION_FINDING_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export type InspectionFindingStatusValue = (typeof INSPECTION_FINDING_STATUSES)[number];

/**
 * Vernerundefunn som er sendt til avviksbehandling skal vise samme sluttstatus
 * som avviket. IK-HMS § 5: avvik skal følges opp til de er lukket.
 */
export function displayedFindingStatus(
  status: string,
  linkedIncidentStatus?: string | null,
): InspectionFindingStatusValue {
  if (linkedIncidentStatus === "CLOSED") return "CLOSED";
  if (status === "IN_PROGRESS" || status === "RESOLVED" || status === "CLOSED") return status;
  return "OPEN";
}
