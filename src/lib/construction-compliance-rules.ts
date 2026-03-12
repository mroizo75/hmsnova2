interface ShaPlanData {
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | string | null;
  builderName?: string | null;
  builderRepresentativeName?: string | null;
  builderRepresentativeContact?: string | null;
  coordinatorPlanningName?: string | null;
  coordinatorExecutionName?: string | null;
  organizationChart?: string | null;
  progressPlan?: string | null;
  specificMeasures?: string | null;
  changeProcedure?: string | null;
  conflictAssessmentDocumented?: boolean | null;
  availableOnSite?: boolean | null;
}

interface PreNotificationData {
  status?: "DRAFT" | "READY_TO_SUBMIT" | "SUBMITTED" | "UPDATED_AFTER_SUBMISSION" | string | null;
  sentAt?: Date | string | null;
  submissionDate?: Date | string | null;
  projectAddress?: string | null;
  projectType?: string | null;
  builderName?: string | null;
  builderOrgNumber?: string | null;
  builderAddress?: string | null;
  builderPhone?: string | null;
  builderRepresentativeName?: string | null;
  builderRepresentativePhone?: string | null;
  coordinators?: string | null;
  designers?: string | null;
  contractors?: string | null;
  expectedStartDate?: Date | string | null;
  expectedEndDate?: Date | string | null;
  maxWorkersSimultaneous?: number | null;
  plannedBusinessesCount?: number | null;
  visibleAtSite?: boolean | null;
}

export interface PreNotificationRequirementResult {
  isRequired: boolean;
  reasons: string[];
  estimatedWorkerDays: number | null;
  workDays: number | null;
  submissionDeadline: string | null;
  isDeadlineSoon: boolean;
  isDeadlinePassed: boolean;
}

export interface ConstructionComplianceValidation {
  shaReadyForActive: boolean;
  shaMissingFieldsForActive: string[];
  preNotificationReadyForSubmission: boolean;
  preNotificationMissingFieldsForSubmission: string[];
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function countWorkdaysInclusive(start: Date, end: Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  if (endDate < startDate) return 0;

  let current = new Date(startDate);
  let count = 0;
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Byggherreforskriften § 10: forhåndsmelding ved >15 virkedager eller >250 dagsverk.
export function evaluatePreNotificationRequirement(
  preNotification: PreNotificationData | null | undefined
): PreNotificationRequirementResult {
  const startDate = asDate(preNotification?.expectedStartDate);
  const endDate = asDate(preNotification?.expectedEndDate);
  const workers = preNotification?.maxWorkersSimultaneous ?? null;

  const workDays = startDate && endDate ? countWorkdaysInclusive(startDate, endDate) : null;
  const estimatedWorkerDays =
    workDays && workers && workers > 0 ? workDays * workers : null;

  const reasons: string[] = [];
  if (workDays !== null && workDays > 15) {
    reasons.push("Planlagt varighet er over 15 virkedager");
  }
  if (estimatedWorkerDays !== null && estimatedWorkerDays > 250) {
    reasons.push("Estimert arbeidsmengde er over 250 dagsverk");
  }

  const isRequired = reasons.length > 0;
  const submissionDeadlineDate =
    isRequired && startDate ? new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000) : null;
  const now = new Date();
  const isDeadlinePassed = Boolean(submissionDeadlineDate && now > submissionDeadlineDate);
  const isDeadlineSoon = Boolean(
    submissionDeadlineDate &&
      !isDeadlinePassed &&
      submissionDeadlineDate.getTime() - now.getTime() <= 3 * 24 * 60 * 60 * 1000
  );

  return {
    isRequired,
    reasons,
    estimatedWorkerDays,
    workDays,
    submissionDeadline: submissionDeadlineDate ? submissionDeadlineDate.toISOString() : null,
    isDeadlineSoon,
    isDeadlinePassed,
  };
}

// Byggherreforskriften § 8/§9: SHA-plan må være konkret før den settes aktiv.
export function validateShaPlanForActive(
  shaPlan: ShaPlanData | null | undefined
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  if (!hasText(shaPlan?.builderName)) missingFields.push("Byggherre");
  if (!hasText(shaPlan?.coordinatorPlanningName)) missingFields.push("Koordinator prosjektering (KP)");
  if (!hasText(shaPlan?.coordinatorExecutionName)) missingFields.push("Koordinator utførelse (KU)");
  if (!hasText(shaPlan?.organizationChart)) missingFields.push("Organisasjonskart / rollefordeling");
  if (!hasText(shaPlan?.progressPlan)) missingFields.push("Fremdriftsplan");
  if (!hasText(shaPlan?.specificMeasures)) missingFields.push("Spesifikke SHA-tiltak");
  if (!hasText(shaPlan?.changeProcedure)) missingFields.push("Rutine for endring av SHA-plan");
  if (shaPlan?.conflictAssessmentDocumented !== true) {
    missingFields.push("Dokumentert rollekonflikt-vurdering");
  }
  if (shaPlan?.availableOnSite !== true) {
    missingFields.push("SHA-plan tilgjengelig på byggeplassen");
  }

  return { isValid: missingFields.length === 0, missingFields };
}

// Byggherreforskriften § 10: før innsending må kjernefeltene være på plass.
export function validatePreNotificationForSubmission(
  preNotification: PreNotificationData | null | undefined
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  if (!hasText(preNotification?.projectAddress)) missingFields.push("Adresse byggeplass");
  if (!hasText(preNotification?.projectType)) missingFields.push("Prosjektets art");
  if (!hasText(preNotification?.builderName)) missingFields.push("Byggherre navn");
  if (!hasText(preNotification?.builderRepresentativeName)) {
    missingFields.push("Byggherres representant");
  }
  if (!asDate(preNotification?.expectedStartDate)) missingFields.push("Startdato");
  if (!hasText(preNotification?.coordinators)) missingFields.push("Koordinatorer");
  if (!hasText(preNotification?.contractors)) missingFields.push("Utførende virksomheter");
  if (preNotification?.visibleAtSite !== true) {
    missingFields.push("Bekreftelse på at forhåndsmelding er synlig på byggeplass");
  }

  return { isValid: missingFields.length === 0, missingFields };
}

export function buildConstructionComplianceValidation(
  shaPlan: ShaPlanData | null | undefined,
  preNotification: PreNotificationData | null | undefined
): ConstructionComplianceValidation {
  const shaValidation = validateShaPlanForActive(shaPlan);
  const preValidation = validatePreNotificationForSubmission(preNotification);

  return {
    shaReadyForActive: shaValidation.isValid,
    shaMissingFieldsForActive: shaValidation.missingFields,
    preNotificationReadyForSubmission: preValidation.isValid,
    preNotificationMissingFieldsForSubmission: preValidation.missingFields,
  };
}

// Byggherreforskriften § 15: oversiktsliste skal oppbevares i 6 måneder etter avsluttet arbeid.
export function getRosterRetentionUntil(workFinishedAt: Date): Date {
  const retention = new Date(workFinishedAt);
  retention.setMonth(retention.getMonth() + 6);
  return retention;
}
