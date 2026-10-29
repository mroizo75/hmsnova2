export interface TrainingIdentity {
  userId: string;
  courseKey: string;
  completedAt?: Date | string | null;
  validUntil?: Date | string | null;
  createdAt?: Date | string | null;
}

function timeOf(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** Nyeste gjennomføring vinner, slik at et fornyet kurs erstatter det utløpte. */
export function isNewerTraining(candidate: TrainingIdentity, current: TrainingIdentity): boolean {
  const completedDelta = timeOf(candidate.completedAt) - timeOf(current.completedAt);
  if (completedDelta !== 0) return completedDelta > 0;
  const validDelta = timeOf(candidate.validUntil) - timeOf(current.validUntil);
  if (validDelta !== 0) return validDelta > 0;
  return timeOf(candidate.createdAt) > timeOf(current.createdAt);
}

export function pickCurrentTrainings<T extends TrainingIdentity>(rows: readonly T[]): T[] {
  const current = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.userId}::${row.courseKey}`;
    const existing = current.get(key);
    if (!existing || isNewerTraining(row, existing)) {
      current.set(key, row);
    }
  }
  return [...current.values()];
}

export function daysUntil(validUntil: Date | string | null | undefined, now = new Date()): number | null {
  if (!validUntil) return null;
  return Math.ceil((new Date(validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export interface ExpiryCourseSummary {
  courseKey: string;
  title: string;
  expiring: number;
  expired: number;
}

/**
 * Én samlet tekst til HMS-ansvarlig. IK-HMS § 5: kompetanse skal være kjent,
 * uten ett varsel per ansatt.
 */
export function expiryDigestMessage(input: {
  expiringCount: number;
  expiredCount: number;
  reminderDays: number;
  courses: ExpiryCourseSummary[];
}): string {
  const parts: string[] = [];
  if (input.expiringCount > 0) {
    parts.push(`${input.expiringCount} kurs utløper innen ${input.reminderDays} dager`);
  }
  if (input.expiredCount > 0) {
    parts.push(`${input.expiredCount} kurs er utløpt`);
  }
  const ranked = [...input.courses]
    .filter((course) => course.expiring + course.expired > 0)
    .sort((a, b) => b.expiring + b.expired - (a.expiring + a.expired));
  const shown = ranked.slice(0, 6).map((course) => {
    const bits: string[] = [];
    if (course.expiring > 0) bits.push(`${course.expiring} utløper`);
    if (course.expired > 0) bits.push(`${course.expired} utløpt`);
    return `${course.title} (${bits.join(", ")})`;
  });
  const rest = ranked.length - shown.length;
  const courseText = rest > 0 ? `${shown.join(". ")}. Og ${rest} andre kurs.` : `${shown.join(". ")}.`;
  return `${parts.join(", og ")}. ${courseText} Se oversikten og forny samlet.`;
}
