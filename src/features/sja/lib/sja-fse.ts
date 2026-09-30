export const electricalWorkTypes = [
  "NOT_APPLICABLE",
  "DE_ENERGIZED",
  "NEAR_LIVE",
  "LIVE_LOW_VOLTAGE",
  "HIGH_VOLTAGE",
] as const;

export type ElectricalWorkType = (typeof electricalWorkTypes)[number];

export const fseChecklistItems = {
  riskAssessmentCompleted: "Risikovurdering for det konkrete arbeidet er gjennomgått",
  workMethodSelected: "Arbeidsmetode er valgt på bakgrunn av risikovurderingen",
  equipmentAvailable: "Nødvendig og kontrollert utstyr er tilgjengelig",
  ppeSelected: "Nødvendig personlig verneutstyr er valgt og kontrollert",
  personnelInstructed: "Personellet er vurdert og instruert",
  disconnected: "Anlegget er frakoblet",
  securedAgainstReconnection: "Anlegget er sikret mot innkobling",
  voltageAbsenceVerified: "Det er kontrollert at anlegget er spenningsløst",
  earthingAssessed: "Behov for jord- og kortslutning er vurdert og gjennomført ved behov",
  nearbyLivePartsProtected: "Beskyttelse mot nærliggende spenningssatte deler er etablert ved behov",
} as const;

export type FseChecklistKey = keyof typeof fseChecklistItems;
export type FseChecklist = Partial<Record<FseChecklistKey, boolean>>;

const baseChecklistKeys: FseChecklistKey[] = [
  "riskAssessmentCompleted",
  "workMethodSelected",
  "equipmentAvailable",
  "ppeSelected",
  "personnelInstructed",
];

const deEnergizedChecklistKeys: FseChecklistKey[] = [
  "disconnected",
  "securedAgainstReconnection",
  "voltageAbsenceVerified",
  "earthingAssessed",
  "nearbyLivePartsProtected",
];

export function getRequiredChecklistKeys(workType: ElectricalWorkType): FseChecklistKey[] {
  if (workType === "NOT_APPLICABLE") return [];
  if (workType === "DE_ENERGIZED") return [...baseChecklistKeys, ...deEnergizedChecklistKeys];
  return baseChecklistKeys;
}

export function getRequiredCourseKeys(workType: ElectricalWorkType): string[] {
  if (workType === "NOT_APPLICABLE") return [];

  const keys = ["elektro-fse-grunnkurs", "elektro-forstehjelp"];
  if (workType === "LIVE_LOW_VOLTAGE") keys.push("elektro-fse-lavspenning");
  return keys;
}

export function requiresSecondPersonByFse(workType: ElectricalWorkType): boolean {
  return workType === "HIGH_VOLTAGE";
}

export function getMissingChecklistItems(
  workType: ElectricalWorkType,
  checklist: FseChecklist,
): FseChecklistKey[] {
  return getRequiredChecklistKeys(workType).filter((key) => checklist[key] !== true);
}

interface TrainingRecord {
  courseKey: string;
  completedAt: Date | string | null;
  validUntil: Date | string | null;
}

export type CompetenceStatus = "NOT_REQUIRED" | "VALID" | "MISSING" | "EXPIRED";

export interface CompetenceEvaluation {
  status: CompetenceStatus;
  missingCourseKeys: string[];
  expiredCourseKeys: string[];
}

export function evaluateFseCompetence(
  requiredCourseKeys: string[],
  training: TrainingRecord[],
  now = new Date(),
): CompetenceEvaluation {
  if (requiredCourseKeys.length === 0) {
    return { status: "NOT_REQUIRED", missingCourseKeys: [], expiredCourseKeys: [] };
  }

  const missingCourseKeys: string[] = [];
  const expiredCourseKeys: string[] = [];
  const annualCourseKeys = new Set(["elektro-fse-grunnkurs", "elektro-forstehjelp"]);

  for (const courseKey of requiredCourseKeys) {
    const completedRecords = training.filter(
      (record) => record.courseKey === courseKey && record.completedAt,
    );
    if (completedRecords.length === 0) {
      missingCourseKeys.push(courseKey);
      continue;
    }

    const hasValidRecord = completedRecords.some((record) => {
      const completedAt = new Date(record.completedAt as Date | string);
      const legalAnnualExpiry = new Date(completedAt);
      legalAnnualExpiry.setFullYear(legalAnnualExpiry.getFullYear() + 1);
      const explicitExpiry = record.validUntil ? new Date(record.validUntil) : null;
      const effectiveExpiry = annualCourseKeys.has(courseKey)
        ? explicitExpiry && explicitExpiry < legalAnnualExpiry
          ? explicitExpiry
          : legalAnnualExpiry
        : explicitExpiry;
      return !effectiveExpiry || effectiveExpiry >= now;
    });
    if (!hasValidRecord) {
      expiredCourseKeys.push(courseKey);
    }
  }

  if (missingCourseKeys.length > 0) {
    return { status: "MISSING", missingCourseKeys, expiredCourseKeys };
  }
  if (expiredCourseKeys.length > 0) {
    return { status: "EXPIRED", missingCourseKeys, expiredCourseKeys };
  }
  return { status: "VALID", missingCourseKeys, expiredCourseKeys };
}
