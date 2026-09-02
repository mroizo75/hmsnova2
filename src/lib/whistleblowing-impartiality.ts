/**
 * Habilitet i varslingssaker — AML kap. 2 A / Arbeidstilsynet.
 * Omvarslet kan aldri tildeles saken. Øvrige relasjoner krever bekreftet advarsel.
 */

export type ImpartialityFinding = {
  code: "ACCUSED" | "REPORTER" | "MANAGER_OF_REPORTER" | "NAMED_IN_CASE";
  blocked: boolean;
  message: string;
};

export type ImpartialityInput = {
  candidateUserId: string;
  candidateName?: string | null;
  candidateEmail?: string | null;
  accusedUserIds: string[];
  reporterUserId?: string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  reporterManagerId?: string | null;
  involvedText?: string | null;
  description?: string | null;
};

export function evaluateImpartiality(input: ImpartialityInput): {
  blocked: boolean;
  warnings: ImpartialityFinding[];
} {
  const findings: ImpartialityFinding[] = [];

  if (input.accusedUserIds.includes(input.candidateUserId)) {
    findings.push({
      code: "ACCUSED",
      blocked: true,
      message: "Mottakeren er registrert som omvarslet og kan ikke tildeles saken.",
    });
  }

  if (input.reporterUserId && input.reporterUserId === input.candidateUserId) {
    findings.push({
      code: "REPORTER",
      blocked: false,
      message: "Mottakeren er varsleren. Bekreft at tildelingen likevel er habil.",
    });
  }

  if (input.reporterManagerId && input.reporterManagerId === input.candidateUserId) {
    findings.push({
      code: "MANAGER_OF_REPORTER",
      blocked: false,
      message: "Mottakeren er nærmeste leder til varsleren og kan være inhabil.",
    });
  }

  const haystack = [input.involvedText, input.description].filter(Boolean).join(" ").toLowerCase();
  const needles = [input.candidateName, input.candidateEmail]
    .filter((value): value is string => Boolean(value && value.trim().length >= 3))
    .map((value) => value.toLowerCase());

  if (haystack && needles.some((needle) => haystack.includes(needle))) {
    findings.push({
      code: "NAMED_IN_CASE",
      blocked: false,
      message: "Mottakeren er nevnt i saken. Bekreft habilitet før tilgang gis.",
    });
  }

  return {
    blocked: findings.some((finding) => finding.blocked),
    warnings: findings,
  };
}

export function isAccusedOfCase(userId: string, accusedUserIds: string[]): boolean {
  return accusedUserIds.includes(userId);
}
