/**
 * Port før en medarbeider kan settes utplassert hos innleier.
 * AML § 3-2 (opplæring) og innføring på det nye arbeidsstedet.
 */

export const INDUCTION_KEYS = [
  "clientRules",
  "emergencyExits",
  "ppe",
  "reportsTo",
  "employeeConfirmed",
] as const;

export type InductionKey = (typeof INDUCTION_KEYS)[number];

export type InductionChecklist = Record<InductionKey, boolean>;

export const INDUCTION_LABELS: Record<InductionKey, string> = {
  clientRules: "Kundens regler er gjennomgått",
  emergencyExits: "Nødutganger og beredskap er vist",
  ppe: "Verneutstyr er avklart",
  reportsTo: "Det er avklart hvem man rapporterer til",
  employeeConfirmed: "Medarbeideren har bekreftet innføringen",
};

export const EMPTY_INDUCTION: InductionChecklist = {
  clientRules: false,
  emergencyExits: false,
  ppe: false,
  reportsTo: false,
  employeeConfirmed: false,
};

export type CompetenceStatus = "FULFILLED" | "EXPIRED" | "MISSING";

export type CompetenceItem = {
  courseKey: string;
  requiredLevel: string;
  status: CompetenceStatus;
};

export type TrainingRecord = {
  courseKey: string;
  completedAt: Date | null;
  validUntil: Date | null;
};

export type RequirementRecord = {
  courseKey: string;
  requiredLevel: string;
};

export type DeploymentBlock = {
  code: "COMPETENCE_GAP" | "INDUCTION_INCOMPLETE";
  message: string;
};

export function parseInduction(value: unknown): InductionChecklist {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_INDUCTION };
  }
  const record = value as Record<string, unknown>;
  return {
    clientRules: record.clientRules === true,
    emergencyExits: record.emergencyExits === true,
    ppe: record.ppe === true,
    reportsTo: record.reportsTo === true,
    employeeConfirmed: record.employeeConfirmed === true,
  };
}

export function inductionIsComplete(checklist: InductionChecklist | null | undefined): boolean {
  if (!checklist) return false;
  return INDUCTION_KEYS.every((key) => checklist[key] === true);
}

export function competenceStatusForCourse(
  trainings: TrainingRecord[],
  courseKey: string,
  now: Date,
): CompetenceStatus {
  const completed = trainings.filter((item) => item.courseKey === courseKey && item.completedAt);
  if (completed.length === 0) return "MISSING";
  const valid = completed.some((item) => !item.validUntil || item.validUntil >= now);
  return valid ? "FULFILLED" : "EXPIRED";
}

export function competenceItemsFromRecords(
  requirements: RequirementRecord[],
  trainings: TrainingRecord[],
  now: Date,
): CompetenceItem[] {
  return requirements.map((requirement) => ({
    courseKey: requirement.courseKey,
    requiredLevel: requirement.requiredLevel,
    status: competenceStatusForCourse(trainings, requirement.courseKey, now),
  }));
}

export function missingRequiredCompetence(items: CompetenceItem[]): CompetenceItem[] {
  return items.filter((item) => item.requiredLevel === "REQUIRED" && item.status !== "FULFILLED");
}

export function deploymentBlocks(input: {
  status: string;
  competenceItems: CompetenceItem[];
  induction: InductionChecklist | null | undefined;
}): DeploymentBlock[] {
  if (input.status !== "UTPLASSERT") return [];
  const blocks: DeploymentBlock[] = [];
  if (missingRequiredCompetence(input.competenceItems).length > 0) {
    blocks.push({
      code: "COMPETENCE_GAP",
      message: "Påkrevd kompetanse mangler eller er utløpt. Personen kan ikke utplasseres.",
    });
  }
  if (!inductionIsComplete(input.induction)) {
    blocks.push({
      code: "INDUCTION_INCOMPLETE",
      message: "Innføring på arbeidsstedet er ikke bekreftet.",
    });
  }
  return blocks;
}

/** Kobler et avvik til oppdraget det skjedde på. Tom verdi fjerner koblingen. */
export function incidentAssignmentLink(assignmentId: string | null | undefined): {
  assignmentId: string | null;
} {
  const value = assignmentId?.trim();
  return { assignmentId: value ? value : null };
}
