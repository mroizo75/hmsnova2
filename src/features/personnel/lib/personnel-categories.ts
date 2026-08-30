/**
 * Personalarkiv – kategorier og tilgang.
 * Hjemmel: GDPR art. 5, 6, 15 og 17. AML § 14-5/14-6 (arbeidsavtale).
 * Helse/diagnose hører ikke hjemme her.
 */

export const PERSONNEL_CATEGORIES = [
  "CONTRACT",
  "AMENDMENT",
  "CERTIFICATE",
  "WARNING",
  "TAX",
  "CORRESPONDENCE",
  "OTHER",
] as const;

export type PersonnelCategory = (typeof PERSONNEL_CATEGORIES)[number];

export const PERSONNEL_CATEGORY_LABELS: Record<PersonnelCategory, string> = {
  CONTRACT: "Arbeidsavtale",
  AMENDMENT: "Tillegg/endring",
  CERTIFICATE: "Attest/sertifikat",
  WARNING: "Advarsel",
  TAX: "Skatt/lønn",
  CORRESPONDENCE: "Korrespondanse",
  OTHER: "Annet",
};

export const PERSONNEL_CATEGORY_LEGAL: Record<PersonnelCategory, string> = {
  CONTRACT: "AML § 14-5/14-6",
  AMENDMENT: "AML § 14-8",
  CERTIFICATE: "AML § 15-15",
  WARNING: "GDPR art. 6",
  TAX: "GDPR art. 6 (rettslig plikt)",
  CORRESPONDENCE: "GDPR art. 6",
  OTHER: "GDPR art. 6",
};

export function canAccessPersonnelFile(opts: {
  viewerId: string;
  employeeId: string;
  canReadOwn: boolean;
  canReadAll: boolean;
}): boolean {
  if (opts.canReadAll) return true;
  return opts.canReadOwn && opts.viewerId === opts.employeeId;
}

export function isRetainExpired(
  retainUntil: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!retainUntil) return false;
  const date = retainUntil instanceof Date ? retainUntil : new Date(retainUntil);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < now.getTime();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
