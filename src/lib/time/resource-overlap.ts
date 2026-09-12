export type AssignmentWindow = {
  id?: string;
  userId: string;
  startDate: Date | string;
  endDate: Date | string;
};

function asTime(value: Date | string): number {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function assignmentsOverlap(a: AssignmentWindow, b: AssignmentWindow): boolean {
  if (a.userId !== b.userId) return false;
  if (a.id && b.id && a.id === b.id) return false;
  return asTime(a.startDate) <= asTime(b.endDate) && asTime(b.startDate) <= asTime(a.endDate);
}

export function findOverlappingAssignments(
  candidate: AssignmentWindow,
  existing: AssignmentWindow[]
): AssignmentWindow[] {
  return existing.filter((row) => assignmentsOverlap(candidate, row));
}

export function assignmentCoversDate(
  assignment: AssignmentWindow,
  date: Date | string
): boolean {
  const t = asTime(date);
  return t >= asTime(assignment.startDate) && t <= asTime(assignment.endDate);
}
