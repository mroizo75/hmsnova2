import { tripletexNumericId } from "./project-payload";

/** Tripletex TimesheetEntry: activity, employee, date, hours og chargeableHours er påkrevd. */
export function buildTripletexTimesheetPayload(input: {
  projectExternalId: string;
  employeeExternalId: string;
  activityExternalId: string;
  date: string;
  hours: number;
  comment?: string | null;
  salaryTypeExternalId?: string | null;
}): Record<string, unknown> {
  const projectId = tripletexNumericId(input.projectExternalId);
  const employeeId = tripletexNumericId(input.employeeExternalId);
  const activityId = tripletexNumericId(input.activityExternalId);
  if (!projectId) throw new Error("Prosjektet er ikke synket til Tripletex ennå");
  if (!employeeId) throw new Error("Ansatt er ikke koblet til Tripletex-bruker");
  if (!activityId) throw new Error("Timeaktivitet er ikke mappet i innstillinger");

  const body: Record<string, unknown> = {
    project: { id: projectId },
    activity: { id: activityId },
    employee: { id: employeeId },
    date: input.date.slice(0, 10),
    hours: input.hours,
    chargeableHours: input.hours,
    chargeable: true,
  };
  if (input.comment) body.comment = input.comment;
  const salaryTypeId = tripletexNumericId(input.salaryTypeExternalId ?? null);
  if (salaryTypeId) body.salaryType = { id: salaryTypeId };
  return body;
}
