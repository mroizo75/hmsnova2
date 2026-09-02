/**
 * Bindende avtalevilkår ved registrering.
 *
 * Angrerettloven (lov 20. juni 2014 nr. 27) § 1 og § 5 bokstav a gjelder
 * forbrukere, ikke næringsdrivende. HMS Nova er B2B. 14 dagers angrefrist
 * er derfor en avtalt kommersiell rett, ikke lovpålagt forbrukervern.
 *
 * Etter utløpt angrefrist: 12 måneders binding og deretter 3 måneders
 * skriftlig oppsigelse, jf. abonnementsavtalen.
 */

export const CONTRACT_DOCUMENT_VERSION = "2026-09-01";
export const WITHDRAWAL_DAYS = 14;
export const BINDING_MONTHS = 12;
export const NOTICE_MONTHS = 3;
export const WITHDRAWAL_EMAIL = "post@hmsnova.no";

export const CONTRACT_WITHDRAWAL_LABEL =
  "Jeg har lest angrerettserklæringen og forstår at bedriften har 14 kalenderdager fra i dag til å si opp kostnadsfritt ved skriftlig melding til post@hmsnova.no. Dette er en avtalt angrefrist, ikke en gratis prøveperiode.";

export const CONTRACT_BINDING_LABEL =
  "Jeg forstår og godtar at dersom bedriften ikke sier opp innen 14 dager, er abonnementet bindende i 12 måneder. Etter bindingsperioden gjelder 3 måneders skriftlig oppsigelse. Jeg kan ikke senere hevde at jeg ikke kjente til disse vilkårene.";

export const CONTRACT_TERMS_LABEL =
  "Jeg har lest og godtar abonnementsavtalen. Elektronisk aksept er juridisk bindende etter avtaleloven § 1.";

export function addCalendarDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getWithdrawalDeadline(acceptedAt: Date): Date {
  return addCalendarDays(acceptedAt, WITHDRAWAL_DAYS);
}

export function getBindingStart(acceptedAt: Date): Date {
  const start = addCalendarDays(acceptedAt, WITHDRAWAL_DAYS);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function formatContractDate(date: Date): string {
  return date.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
