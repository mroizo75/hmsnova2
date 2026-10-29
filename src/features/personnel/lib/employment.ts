export type EmploymentType = "FAST" | "MIDLERTIDIG" | "SKOLEUNGDOM";
export type TemporaryBasis =
  | "MIDLERTIDIG_KARAKTER"
  | "VIKARIAT"
  | "PRAKSIS"
  | "ARBEIDSMARKEDSTILTAK"
  | "IDRETT";

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  FAST: "Fast ansatt",
  MIDLERTIDIG: "Midlertidig",
  SKOLEUNGDOM: "Skoleungdom",
};

export const TEMPORARY_BASIS_LABEL: Record<TemporaryBasis, string> = {
  MIDLERTIDIG_KARAKTER: "Arbeid av midlertidig karakter (§ 14-9 (2) a)",
  VIKARIAT: "Vikariat (§ 14-9 (2) b)",
  PRAKSIS: "Praksisarbeid (§ 14-9 (2) c)",
  ARBEIDSMARKEDSTILTAK: "Arbeidsmarkedstiltak (§ 14-9 (2) d)",
  IDRETT: "Idrett (§ 14-9 (2) e)",
};

const THREE_YEAR_BASES = new Set<TemporaryBasis>(["MIDLERTIDIG_KARAKTER", "VIKARIAT"]);
const RULE_CHANGE = new Date("2024-01-01T00:00:00.000Z");

export type EmploymentAlert = {
  tone: "warning";
  text: string;
};

function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function ageOn(dateOfBirth: Date, on: Date): number {
  let age = on.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const month = on.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (month < 0 || (month === 0 && on.getUTCDate() < dateOfBirth.getUTCDate())) age -= 1;
  return age;
}

/**
 * AML § 14-9 (7): mer enn tre år sammenhengende på grunnlag a eller b gir fast ansettelse.
 * Avtaler om midlertidig karakter inngått før 1. januar 2024 følger fortsatt fireårsgrensen.
 * AML § 14-9 (5): varsel om fratreden senest én måned før, når ansettelsen har vart mer enn ett år.
 * AML kap. 11: særskilt vern for arbeidstakere under 18 år.
 */
export function employmentAlerts(input: {
  employmentType: EmploymentType;
  temporaryBasis?: TemporaryBasis | null;
  startedAt?: Date | null;
  endsAt?: Date | null;
  dateOfBirth?: Date | null;
  now?: Date;
}): EmploymentAlert[] {
  const now = input.now ?? new Date();
  const alerts: EmploymentAlert[] = [];

  if (input.dateOfBirth) {
    const age = ageOn(input.dateOfBirth, now);
    if (age < 15) {
      alerts.push({
        tone: "warning",
        text: "Under 15 år. Arbeid er som hovedregel ikke tillatt, med snevre unntak for lett arbeid og kulturarbeid (AML § 11-1).",
      });
    } else if (age < 18) {
      alerts.push({
        tone: "warning",
        text: "Under 18 år. Arbeidstid, nattarbeid og farlig arbeid er særskilt begrenset (AML kap. 11).",
      });
    }
  }

  if (input.employmentType === "FAST") return alerts;

  const countsTowardPermanent =
    input.employmentType === "MIDLERTIDIG" &&
    input.temporaryBasis != null &&
    THREE_YEAR_BASES.has(input.temporaryBasis);

  if (countsTowardPermanent && input.startedAt) {
    const years =
      input.temporaryBasis === "MIDLERTIDIG_KARAKTER" && input.startedAt < RULE_CHANGE ? 4 : 3;
    const limit = addYears(input.startedAt, years);
    const daysLeft = Math.ceil((limit.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft <= 90) {
      alerts.push({
        tone: "warning",
        text:
          daysLeft < 0
            ? `Grensen for fast ansettelse er passert (AML § 14-9 (7), ${years} år).`
            : `Rett til fast ansettelse om ${daysLeft} dager (AML § 14-9 (7), ${years} år).`,
      });
    }
  }

  if (
    input.endsAt &&
    input.startedAt &&
    input.temporaryBasis !== "ARBEIDSMARKEDSTILTAK" &&
    input.endsAt.getTime() - input.startedAt.getTime() > 366 * 86_400_000
  ) {
    const noticeDue = new Date(input.endsAt);
    noticeDue.setUTCMonth(noticeDue.getUTCMonth() - 1);
    const daysUntilNotice = Math.ceil((noticeDue.getTime() - now.getTime()) / 86_400_000);
    if (daysUntilNotice <= 45 && now < input.endsAt) {
      alerts.push({
        tone: "warning",
        text: "Skriftlig varsel om fratreden skal gis senest én måned før sluttdato (AML § 14-9 (5)).",
      });
    }
  }

  return alerts;
}
