/**
 * Godkjenning gjelder bare egenmelding fra ansattportalen.
 * Leder, admin, HMS og HR dokumenterer kompetanse direkte (IK-HMS § 5).
 * Egenmelding kjennetegnes ved at createdBy er den ansatte selv, og at den ikke er evaluert.
 */
export function trainingAwaitsApproval(training: {
  userId: string;
  createdBy?: string | null;
  evaluatedAt?: Date | string | null;
}): boolean {
  if (training.evaluatedAt) return false;
  return Boolean(training.createdBy) && training.createdBy === training.userId;
}

/** Den som fører inn kompetanse for andre skal ikke utløse godkjenning hos den ansatte. */
export function createdByForEmployerEntry(actorId: string, subjectUserId: string): string | null {
  return actorId === subjectUserId ? null : actorId;
}
