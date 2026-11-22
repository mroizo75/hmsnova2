/** ISO 9001:2015 pkt. 8.4: kriterier, styring, kommunikasjon, overvåking og re-evaluering. */

export const SUPPLIER_STATUSES = ["PENDING", "APPROVED", "CONDITIONAL", "REJECTED", "SUSPENDED"] as const;
export type SupplierStatusValue = (typeof SUPPLIER_STATUSES)[number];

export const SUPPLIER_CRITICALITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type SupplierCriticalityValue = (typeof SUPPLIER_CRITICALITIES)[number];

export const SUPPLIER_EVALUATION_METHODS = ["SELF_ASSESSMENT", "AUDIT", "PERFORMANCE", "DOCUMENT_REVIEW"] as const;
export type SupplierEvaluationMethodValue = (typeof SUPPLIER_EVALUATION_METHODS)[number];

export const SUPPLIER_EVALUATION_OUTCOMES = ["APPROVED", "CONDITIONAL", "REJECTED", "SUSPENDED"] as const;
export type SupplierEvaluationOutcomeValue = (typeof SUPPLIER_EVALUATION_OUTCOMES)[number];

export const SUPPLIER_DOCUMENT_KINDS = ["CERTIFICATE", "INSURANCE", "APPROVAL", "COMPETENCE", "OTHER"] as const;
export type SupplierDocumentKindValue = (typeof SUPPLIER_DOCUMENT_KINDS)[number];

export const SUPPLIER_ASSESSMENT_STATUSES = ["SENT", "ANSWERED", "ACCEPTED", "REJECTED", "CANCELLED"] as const;
export type SupplierAssessmentStatusValue = (typeof SUPPLIER_ASSESSMENT_STATUSES)[number];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatusValue, string> = {
  PENDING: "Til vurdering",
  APPROVED: "Godkjent",
  CONDITIONAL: "Betinget godkjent",
  REJECTED: "Avvist",
  SUSPENDED: "Suspendert",
};

export const SUPPLIER_CRITICALITY_LABELS: Record<SupplierCriticalityValue, string> = {
  LOW: "Lav",
  MEDIUM: "Middels",
  HIGH: "Høy",
};

export const SUPPLIER_EVALUATION_METHOD_LABELS: Record<SupplierEvaluationMethodValue, string> = {
  SELF_ASSESSMENT: "Selvevaluering",
  AUDIT: "Leverandørrevisjon",
  PERFORMANCE: "Erfaring fra leveranser",
  DOCUMENT_REVIEW: "Dokumentgjennomgang",
};

export const SUPPLIER_EVALUATION_OUTCOME_LABELS: Record<SupplierEvaluationOutcomeValue, string> = {
  APPROVED: "Godkjent",
  CONDITIONAL: "Betinget godkjent",
  REJECTED: "Avvist",
  SUSPENDED: "Suspendert",
};

export const SUPPLIER_DOCUMENT_KIND_LABELS: Record<SupplierDocumentKindValue, string> = {
  CERTIFICATE: "Sertifikat",
  INSURANCE: "Forsikring",
  APPROVAL: "Godkjenning",
  COMPETENCE: "Kompetanse",
  OTHER: "Annet",
};

export const SUPPLIER_ASSESSMENT_STATUS_LABELS: Record<SupplierAssessmentStatusValue, string> = {
  SENT: "Sendt",
  ANSWERED: "Besvart",
  ACCEPTED: "Godkjent",
  REJECTED: "Avvist",
  CANCELLED: "Kansellert",
};

const MANUAL_METHODS = ["AUDIT", "PERFORMANCE", "DOCUMENT_REVIEW"] as const;
export type SupplierManualMethodValue = (typeof MANUAL_METHODS)[number];
export const SUPPLIER_MANUAL_METHODS = MANUAL_METHODS;

export function approvalRequiresCriteria(status: string): boolean {
  return status === "APPROVED" || status === "CONDITIONAL";
}

export function statusFromOutcome(outcome: SupplierEvaluationOutcomeValue): SupplierStatusValue {
  return outcome;
}

export function startOfLocalDay(now: Date): Date {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isReviewOverdue(nextReviewAt: Date | null, now: Date): boolean {
  if (!nextReviewAt || Number.isNaN(nextReviewAt.getTime())) return false;
  return nextReviewAt < startOfLocalDay(now);
}

export function isDocumentExpired(expiresAt: Date | null, now: Date): boolean {
  return isReviewOverdue(expiresAt, now);
}

export function isAssessmentOverdue(dueAt: Date | null, status: string, now: Date): boolean {
  if (status !== "SENT" || !dueAt) return false;
  return dueAt < startOfLocalDay(now);
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateSupplierApproval(input: {
  status: string;
  criteria: string;
  controls: string;
  requirements: string;
  contactEmail: string;
  nextReviewAt: Date | null;
  now: Date;
}): { ok: true } | { ok: false; message: string } {
  if (!approvalRequiresCriteria(input.status)) {
    return { ok: true };
  }
  if (input.criteria.trim().length < 10) {
    return { ok: false, message: "Godkjenning krever kriterier for vurdering og valg (ISO 9001 pkt. 8.4.1)." };
  }
  if (input.controls.trim().length < 10) {
    return { ok: false, message: "Godkjenning krever type og omfang av styring (ISO 9001 pkt. 8.4.2)." };
  }
  if (input.requirements.trim().length < 10) {
    return { ok: false, message: "Godkjenning krever kravene som er kommunisert til leverandøren (ISO 9001 pkt. 8.4.3)." };
  }
  if (!validEmail(input.contactEmail.trim())) {
    return { ok: false, message: "Godkjenning krever e-post til den som skal motta kravene (ISO 9001 pkt. 8.4.3)." };
  }
  if (!input.nextReviewAt || Number.isNaN(input.nextReviewAt.getTime())) {
    return { ok: false, message: "Godkjenning krever dato for re-evaluering (ISO 9001 pkt. 8.4.1)." };
  }
  if (input.nextReviewAt < startOfLocalDay(input.now)) {
    return { ok: false, message: "Dato for re-evaluering må være i dag eller senere." };
  }
  return { ok: true };
}

export function validateEvaluationRecord(input: {
  outcome: string;
  summary: string;
  nextReviewAt: Date | null;
  now: Date;
}): { ok: true } | { ok: false; message: string } {
  if (!SUPPLIER_EVALUATION_OUTCOMES.includes(input.outcome as SupplierEvaluationOutcomeValue)) {
    return { ok: false, message: "Velg et resultat av vurderingen." };
  }
  if (input.summary.trim().length < 10) {
    return { ok: false, message: "Vurderingen må beskrive hva som er gjennomgått (ISO 9001 pkt. 8.4.1)." };
  }
  if (approvalRequiresCriteria(input.outcome)) {
    if (!input.nextReviewAt || Number.isNaN(input.nextReviewAt.getTime())) {
      return { ok: false, message: "Godkjenning krever dato for re-evaluering (ISO 9001 pkt. 8.4.1)." };
    }
    if (input.nextReviewAt < startOfLocalDay(input.now)) {
      return { ok: false, message: "Dato for re-evaluering må være i dag eller senere." };
    }
  }
  return { ok: true };
}

export interface SupplierAssessmentAnswers {
  respondentName: string;
  respondentEmail: string;
  confirmsRequirements: boolean;
  competence: string;
  ownControls: string;
  subcontracting: string;
  certifications: string;
  recentDeviations: string;
  acceptsMonitoring: boolean;
  coordinationContact: string;
  hmsSystem: string;
}

export function validateAssessmentAnswers(
  input: SupplierAssessmentAnswers & { worksOnSite: boolean },
): { ok: true } | { ok: false; message: string } {
  if (input.respondentName.trim().length < 2) {
    return { ok: false, message: "Skriv navnet på den som svarer." };
  }
  if (!validEmail(input.respondentEmail.trim())) {
    return { ok: false, message: "Skriv en gyldig e-postadresse." };
  }
  if (input.competence.trim().length < 10) {
    return { ok: false, message: "Beskriv kompetansen hos dem som utfører leveransen (ISO 9001 pkt. 8.4.3)." };
  }
  if (input.ownControls.trim().length < 10) {
    return { ok: false, message: "Beskriv hvordan dere styrer egen leveranse (ISO 9001 pkt. 8.4.2)." };
  }
  if (input.subcontracting.trim().length < 2) {
    return { ok: false, message: "Oppgi om deler av leveransen settes bort. Skriv Ingen hvis det ikke skjer." };
  }
  if (input.certifications.trim().length < 2) {
    return { ok: false, message: "Oppgi relevante sertifikater og godkjenninger, eller skriv Ingen." };
  }
  if (input.recentDeviations.trim().length < 2) {
    return { ok: false, message: "Oppgi avvik fra tilsvarende leveranser, eller skriv Ingen." };
  }
  if (input.worksOnSite) {
    if (input.coordinationContact.trim().length < 2) {
      return { ok: false, message: "Oppgi kontakt for samordning når arbeidet skjer hos kunden (AML § 2-2)." };
    }
    if (input.hmsSystem.trim().length < 10) {
      return { ok: false, message: "Beskriv internkontrollen for helse, miljø og sikkerhet (IK-HMS § 5)." };
    }
  }
  return { ok: true };
}

export function assessmentSummary(input: SupplierAssessmentAnswers & { worksOnSite: boolean }): string {
  return summaryFromLines(input.respondentName, input.respondentEmail, legacyAssessmentLines(input));
}

export const SUPPLIER_QUESTION_TYPES = ["TEXT", "TEXTAREA", "YES_NO"] as const;
export type SupplierQuestionTypeValue = (typeof SUPPLIER_QUESTION_TYPES)[number];

export const SUPPLIER_QUESTION_TYPE_LABELS: Record<SupplierQuestionTypeValue, string> = {
  TEXT: "Kort tekst",
  TEXTAREA: "Lang tekst",
  YES_NO: "Ja / nei",
};

export const SUPPLIER_QUESTION_LIMIT = 40;

export interface SupplierQuestionDraft {
  label: string;
  helpText: string;
  fieldType: SupplierQuestionTypeValue;
  required: boolean;
}

export interface SupplierQuestion extends SupplierQuestionDraft {
  id: string;
}

export interface SupplierAnswerLine {
  questionId: string;
  label: string;
  value: string;
}

/** Standardspørsmål som brukes for alle leverandører til bedriften lagrer sitt eget skjema. */
export function standardSupplierQuestions(): SupplierQuestion[] {
  return defaultSupplierQuestions().map((question, index) => ({
    id: `standard-${index + 1}`,
    ...question,
  }));
}

export function defaultSupplierQuestions(): SupplierQuestionDraft[] {
  return [
    {
      label: "Kan dere oppfylle kravene som er beskrevet?",
      helpText: "",
      fieldType: "YES_NO",
      required: true,
    },
    {
      label: "Hvilken kompetanse har de som utfører leveransen?",
      helpText: "ISO 9001 pkt. 8.4.3",
      fieldType: "TEXTAREA",
      required: true,
    },
    {
      label: "Hvordan styrer dere egen leveranse?",
      helpText: "ISO 9001 pkt. 8.4.2",
      fieldType: "TEXTAREA",
      required: true,
    },
    {
      label: "Settes deler av leveransen bort?",
      helpText: "Skriv Ingen hvis det ikke skjer.",
      fieldType: "TEXTAREA",
      required: true,
    },
    {
      label: "Hvilke sertifikater og godkjenninger er relevante?",
      helpText: "Skriv Ingen hvis dere ikke har noen.",
      fieldType: "TEXTAREA",
      required: true,
    },
    {
      label: "Har dere hatt avvik på tilsvarende leveranser?",
      helpText: "Skriv Ingen hvis det ikke er noen.",
      fieldType: "TEXTAREA",
      required: true,
    },
    {
      label: "Aksepterer dere oppfølging og eventuell verifikasjon av leveransen?",
      helpText: "ISO 9001 pkt. 8.4.3",
      fieldType: "YES_NO",
      required: true,
    },
  ];
}

export function validateSupplierQuestions(
  questions: SupplierQuestionDraft[],
): { ok: true } | { ok: false; message: string } {
  if (questions.length < 1) {
    return { ok: false, message: "Skjemaet må ha minst ett spørsmål." };
  }
  if (questions.length > SUPPLIER_QUESTION_LIMIT) {
    return { ok: false, message: `Skjemaet kan ha maks ${SUPPLIER_QUESTION_LIMIT} spørsmål.` };
  }
  const labels = new Set<string>();
  for (const question of questions) {
    const label = question.label.trim();
    if (label.length < 2 || label.length > 300) {
      return { ok: false, message: "Hvert spørsmål må ha en tekst på 2–300 tegn." };
    }
    if (!SUPPLIER_QUESTION_TYPES.includes(question.fieldType)) {
      return { ok: false, message: "Velg en gyldig svartype." };
    }
    const key = label.toLowerCase();
    if (labels.has(key)) {
      return { ok: false, message: "To spørsmål kan ikke ha samme tekst." };
    }
    labels.add(key);
    if (question.helpText.trim().length > 1000) {
      return { ok: false, message: "Hjelpeteksten er for lang." };
    }
  }
  return { ok: true };
}

export function serializeSupplierQuestions(questions: SupplierQuestion[]): string {
  return JSON.stringify(questions);
}

export function parseSupplierQuestions(value: string | null | undefined): SupplierQuestion[] | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;
    const questions: SupplierQuestion[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<SupplierQuestion>;
      if (typeof row.id !== "string" || typeof row.label !== "string") return null;
      if (!SUPPLIER_QUESTION_TYPES.includes(row.fieldType as SupplierQuestionTypeValue)) return null;
      questions.push({
        id: row.id,
        label: row.label,
        helpText: typeof row.helpText === "string" ? row.helpText : "",
        fieldType: row.fieldType as SupplierQuestionTypeValue,
        required: row.required !== false,
      });
    }
    return questions;
  } catch {
    return null;
  }
}

export function parseSupplierAnswers(value: string | null | undefined): SupplierAnswerLine[] | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;
    const lines: SupplierAnswerLine[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<SupplierAnswerLine>;
      if (typeof row.questionId !== "string" || typeof row.label !== "string" || typeof row.value !== "string") {
        return null;
      }
      lines.push({ questionId: row.questionId, label: row.label, value: row.value });
    }
    return lines;
  } catch {
    return null;
  }
}

export function validateSupplierResponse(input: {
  respondentName: string;
  respondentEmail: string;
  questions: SupplierQuestion[];
  answers: { questionId: string; value: string }[];
}): { ok: true; lines: SupplierAnswerLine[] } | { ok: false; message: string } {
  if (input.respondentName.trim().length < 2) {
    return { ok: false, message: "Skriv navnet på den som svarer." };
  }
  if (!validEmail(input.respondentEmail.trim())) {
    return { ok: false, message: "Skriv en gyldig e-postadresse." };
  }
  const byId = new Map(input.answers.map((answer) => [answer.questionId, answer.value]));
  const lines: SupplierAnswerLine[] = [];
  for (const question of input.questions) {
    const value = (byId.get(question.id) ?? "").trim();
    if (question.required && value.length === 0) {
      return { ok: false, message: `Svar på: ${question.label}` };
    }
    if (question.fieldType === "YES_NO" && value && value !== "Ja" && value !== "Nei") {
      return { ok: false, message: `Svar ja eller nei på: ${question.label}` };
    }
    if (value.length > 8000) {
      return { ok: false, message: `Svaret er for langt: ${question.label}` };
    }
    lines.push({ questionId: question.id, label: question.label, value });
  }
  return { ok: true, lines };
}

export function summaryFromLines(name: string, email: string, lines: SupplierAnswerLine[]): string {
  return [`Besvart av ${name.trim()} (${email.trim()}).`, ...lines.map((line) => `${line.label}: ${line.value || "–"}`)].join("\n");
}

export function legacyAssessmentLines(input: SupplierAssessmentAnswers & { worksOnSite: boolean }): SupplierAnswerLine[] {
  const lines: SupplierAnswerLine[] = [
    {
      questionId: "legacy-requirements",
      label: "Kan dere oppfylle kravene?",
      value: input.confirmsRequirements ? "Ja" : "Nei",
    },
    { questionId: "legacy-competence", label: "Kompetanse", value: input.competence.trim() },
    { questionId: "legacy-controls", label: "Egen styring", value: input.ownControls.trim() },
    { questionId: "legacy-subcontracting", label: "Underleverandører", value: input.subcontracting.trim() },
    { questionId: "legacy-certifications", label: "Dokumentasjon", value: input.certifications.trim() },
    { questionId: "legacy-deviations", label: "Avvik", value: input.recentDeviations.trim() },
    {
      questionId: "legacy-monitoring",
      label: "Oppfølging og verifikasjon",
      value: input.acceptsMonitoring ? "Ja" : "Nei",
    },
  ];
  if (input.worksOnSite) {
    lines.push({ questionId: "legacy-coordination", label: "Samordning", value: input.coordinationContact.trim() });
    lines.push({ questionId: "legacy-hms", label: "Internkontroll", value: input.hmsSystem.trim() });
  }
  return lines;
}

export function legacySupplierQuestions(worksOnSite: boolean): SupplierQuestion[] {
  const questions: SupplierQuestion[] = [
    { id: "legacy-requirements", label: "Kan dere oppfylle kravene som er beskrevet?", helpText: "", fieldType: "YES_NO", required: true },
    { id: "legacy-competence", label: "Hvilken kompetanse har de som utfører leveransen?", helpText: "", fieldType: "TEXTAREA", required: true },
    { id: "legacy-controls", label: "Hvordan styrer dere egen leveranse?", helpText: "", fieldType: "TEXTAREA", required: true },
    { id: "legacy-subcontracting", label: "Settes deler av leveransen bort?", helpText: "Skriv Ingen hvis det ikke skjer.", fieldType: "TEXTAREA", required: true },
    { id: "legacy-certifications", label: "Hvilke sertifikater og godkjenninger er relevante?", helpText: "", fieldType: "TEXTAREA", required: true },
    { id: "legacy-deviations", label: "Har dere hatt avvik på tilsvarende leveranser?", helpText: "", fieldType: "TEXTAREA", required: true },
    { id: "legacy-monitoring", label: "Aksepterer dere oppfølging og eventuell verifikasjon av leveransen?", helpText: "", fieldType: "YES_NO", required: true },
  ];
  if (worksOnSite) {
    questions.push(
      { id: "legacy-coordination", label: "Hvem er kontakt for samordning på arbeidsplassen?", helpText: "AML § 2-2", fieldType: "TEXT", required: true },
      { id: "legacy-hms", label: "Beskriv internkontrollen for helse, miljø og sikkerhet.", helpText: "IK-HMS § 5", fieldType: "TEXTAREA", required: true },
    );
  }
  return questions;
}

export function normalizeOrgNumber(value: string): string | null {
  const digits = value.replace(/\s/g, "");
  if (!digits) return null;
  if (!/^\d{9}$/.test(digits)) {
    throw new Error("Organisasjonsnummer må være 9 siffer");
  }
  return digits;
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!email) return null;
  if (!validEmail(email)) {
    throw new Error("E-postadressen er ikke gyldig");
  }
  return email;
}

export function supplierPerformance(input: {
  openDeviations: number;
  hasEvaluation: boolean;
  reviewOverdue: boolean;
  expiredDocuments: number;
  overdueAssessments: number;
  openAuditFindings: number;
}): { score: number | null; label: string } {
  const deductions =
    input.openDeviations * 15 +
    input.expiredDocuments * 10 +
    input.openAuditFindings * 10 +
    (input.reviewOverdue ? 20 : 0) +
    (input.overdueAssessments ? 20 : 0);
  if (!input.hasEvaluation && deductions === 0) {
    return { score: null, label: "Ikke evaluert" };
  }
  const score = Math.max(0, 100 - deductions);
  if (score >= 80) return { score, label: "God" };
  if (score >= 50) return { score, label: "Følges opp" };
  return { score, label: "Svak" };
}

export function supplierFollowUp(input: {
  reviewOverdue: boolean;
  expiredDocuments: number;
  overdueAssessments: number;
  answersToReview: number;
}): string | null {
  if (input.answersToReview > 0) return "Svar til behandling";
  if (input.overdueAssessments > 0) return "Selvevaluering forfalt";
  if (input.reviewOverdue) return "Re-evaluering forfalt";
  if (input.expiredDocuments > 0) return "Dokumentasjon utløpt";
  return null;
}

export function publicAppOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://www.hmsnova.no";
  const url = new URL(raw);
  if (url.hostname === "hmsnova.no" || url.hostname === "www.hmsnova.no") {
    return "https://www.hmsnova.no";
  }
  return url.origin;
}

export function supplierAssessmentUrl(token: string): string {
  return new URL(`/leverandor-vurdering/${token}`, publicAppOrigin()).toString();
}

export function supplierAssessmentEmail(input: {
  tenantName: string;
  supplierName: string;
  dueAt: Date;
  url: string;
  reminder: boolean;
}): { subject: string; html: string } {
  const due = input.dueAt.toLocaleDateString("nb-NO");
  const subject = input.reminder
    ? `Påminnelse: selvevaluering til ${input.tenantName}`
    : `Selvevaluering til ${input.tenantName}`;
  const html = `
    <p>Hei,</p>
    <p>${input.tenantName} ber ${input.supplierName} bekrefte at kravene til leveransen kan oppfylles.</p>
    <p>Svarfristen er ${due}.</p>
    <p><a href="${input.url}">Åpne selvevalueringen</a></p>
    <p>Lenken er personlig for denne forespørselen.</p>
  `;
  return { subject, html };
}

export const SUPPLIER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const SUPPLIER_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
