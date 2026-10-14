/**
 * Periode for ledelsens gjennomgang (ISO 45001/9001/14001 kap. 9.3, IK-HMS § 5).
 *
 * Gjennomgang i januar henter forrige kalenderår (1.1–31.12).
 * Gjennomgang senere på året henter fra 1. januar samme år til gjennomgangsdatoen.
 */
export type ManagementReviewPeriod = {
  from: Date;
  to: Date;
  label: string;
  year: number;
};

function startOfDay(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 0, 0, 0, 0);
}

function endOfDay(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 23, 59, 59, 999);
}

function formatNb(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

export function managementReviewPeriod(reviewDate: Date): ManagementReviewPeriod {
  const year = reviewDate.getFullYear();
  const month = reviewDate.getMonth();

  if (month === 0) {
    const previousYear = year - 1;
    const from = startOfDay(previousYear, 0, 1);
    const to = endOfDay(previousYear, 11, 31);
    return {
      from,
      to,
      label: `${formatNb(from)}–${formatNb(to)}`,
      year: previousYear,
    };
  }

  const from = startOfDay(year, 0, 1);
  return {
    from,
    to: reviewDate,
    label: `${formatNb(from)}–${formatNb(reviewDate)}`,
    year,
  };
}
