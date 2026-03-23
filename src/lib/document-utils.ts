export function calculateNextReviewDate(base: Date, months: number): Date {
  if (!(base instanceof Date) || Number.isNaN(base.getTime())) {
    return new Date();
  }

  const utcBase = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const next = new Date(utcBase.getTime());
  next.setUTCMonth(next.getUTCMonth() + Math.max(months, 1));

  if (next.getUTCDate() !== utcBase.getUTCDate()) {
    next.setUTCDate(0);
  }

  return next;
}

export function parseDateInput(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Dato fra skjemafelt type=date (YYYY-MM-DD), lagret som middag UTC for stabil kalenderdag. */
export function dateFromYmdInput(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  return Number.isNaN(dt.getTime()) ? null : dt;
}


