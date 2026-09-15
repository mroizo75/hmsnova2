import type { MocChangeType, MocClassification, MocDuration, MocSource, MocStatus } from "@prisma/client";

export const MOC_STATUS_LABELS: Record<MocStatus, string> = {
  DRAFT: "Utkast",
  IMPACT_ASSESSMENT: "Konsekvensvurdering",
  PENDING_APPROVAL: "Til godkjenning",
  APPROVED: "Godkjent",
  IMPLEMENTING: "Iverksetting",
  VERIFYING: "Verifikasjon",
  CLOSED: "Lukket",
  REJECTED: "Avvist",
  CANCELLED: "Kansellert",
};

export const MOC_TYPE_LABELS: Record<MocChangeType, string> = {
  PROCESS: "Prosess, produkt eller tjeneste",
  WORKPLACE: "Arbeidssted og omgivelser",
  ORGANIZATION: "Arbeidsorganisering",
  CONDITIONS: "Arbeidsforhold",
  EQUIPMENT: "Utstyr",
  WORKFORCE: "Bemanning",
  LEGAL: "Lov- og andre krav",
  KNOWLEDGE: "Ny kunnskap om farer og risiko",
  TECHNOLOGY: "Teknologi og kunnskap",
};

export const MOC_CLASSIFICATION_LABELS: Record<MocClassification, string> = {
  MINOR: "Mindre",
  SIGNIFICANT: "Vesentlig",
  MAJOR: "Alvorlig",
};

export const MOC_DURATION_LABELS: Record<MocDuration, string> = {
  TEMPORARY: "Midlertidig",
  PERMANENT: "Permanent",
};

export const MOC_SOURCE_LABELS: Record<MocSource, string> = {
  PLANNED: "Planlagt",
  UNINTENDED: "Utilsiktet",
};
