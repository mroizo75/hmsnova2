export const BCM_PROCESS_OPTIONS = [
  "Produksjon / leveranse",
  "IT-systemer og infrastruktur",
  "Kundeservice / support",
  "Forsyningskjede / logistikk",
  "Økonomi / fakturering",
  "Personalforvaltning / lønn",
  "Kommunikasjon (intern/ekstern)",
  "Salg og markedsføring",
  "Lager / varemottak",
  "Annet",
] as const;

export const BCM_RISK_OPTIONS = [
  "Brann i lokaler",
  "IT-utfall / systemfeil",
  "Cyberangrep / datainnbrudd",
  "Strømbrudd (langvarig)",
  "Leverandørsvikt",
  "Pandemi / smitteutbrudd",
  "Naturhendelse (flom, storm, skred)",
  "Nøkkelperson utilgjengelig",
  "Vannlekkasje / bygningsskade",
  "Transport- / logistikkbrudd",
  "Vold eller trusler",
  "Kjemikalieutslipp / eksponering",
] as const;

export const BCM_SPECIAL_CONDITION_OPTIONS = [
  { value: "biologicalFactors", label: "Arbeid med biologiske faktorer" },
  { value: "radiation", label: "Arbeid med ioniserende eller annen regulert stråling" },
  { value: "industrialProtection", label: "Virksomheten er eller kan være industrivernpliktig" },
  { value: "acutePollution", label: "Risiko for akutt forurensning" },
  { value: "explosives", label: "Håndtering av eksplosiver" },
  { value: "majorAccident", label: "Virksomheten er eller kan være storulykkevirksomhet" },
  { value: "diving", label: "Dykkeoperasjoner" },
  { value: "mining", label: "Bergarbeid eller gruvedrift" },
  { value: "violenceThreats", label: "Risiko for vold og trusler" },
  { value: "loneWork", label: "Alenearbeid eller arbeid uten rask bistand" },
] as const;

export const BCM_CONFIRMATION_KEYS = [
  "factsConfirmed",
  "riskBasisConfirmed",
  "contactsConfirmed",
  "physicalControlsConfirmed",
  "participationConfirmed",
  "trainingPlanConfirmed",
  "specialRequirementsConfirmed",
] as const;

export type BcmProcessOption = (typeof BCM_PROCESS_OPTIONS)[number];
export type BcmRiskOption = (typeof BCM_RISK_OPTIONS)[number];
export type BcmSpecialCondition = (typeof BCM_SPECIAL_CONDITION_OPTIONS)[number]["value"];
export type BcmConfirmationKey = (typeof BCM_CONFIRMATION_KEYS)[number];

export interface BcmCrisisTeamMember {
  name: string;
  role: string;
  phone: string;
  email: string;
  substitute: string;
}

export interface BcmConfirmations {
  factsConfirmed: boolean;
  riskBasisConfirmed: boolean;
  contactsConfirmed: boolean;
  physicalControlsConfirmed: boolean;
  participationConfirmed: boolean;
  trainingPlanConfirmed: boolean;
  specialRequirementsConfirmed: boolean;
}

export interface BcmWizardDraft {
  organizationScope: string;
  locationsAndWork: string;
  worksInBuilding: boolean;
  hasHazardousChemicals: boolean;
  handlesDangerousSubstances: boolean;
  specialConditions: BcmSpecialCondition[];
  specialistAssessment: string;
  riskAssessmentReference: string;
  employeeParticipation: string;
  criticalProcesses: BcmProcessOption[];
  crisisTeam: BcmCrisisTeamMember[];
  riskScenarios: BcmRiskOption[];
  alertingPlan: string;
  emergencyActions: string;
  evacuationPlan: string;
  chemicalEmergencyPlan: string;
  dangerousSubstancePlan: string;
  firstAidAndResources: string;
  recoveryPlan: string;
  communicationPlan: string;
  trainingPlan: string;
  exercisePlan: string;
  nextReviewDate: string;
  confirmations: BcmConfirmations;
  aiSuggestedText?: string;
  aiSuggestedField?: "emergencyActions" | "trainingPlan";
}

export const EMPTY_BCM_CONFIRMATIONS: BcmConfirmations = {
  factsConfirmed: false,
  riskBasisConfirmed: false,
  contactsConfirmed: false,
  physicalControlsConfirmed: false,
  participationConfirmed: false,
  trainingPlanConfirmed: false,
  specialRequirementsConfirmed: false,
};

export const BCM_FORM_FIELD_LABELS = {
  organization: "Virksomhet og omfang",
  legalScreening: "Lovscreening",
  riskBasis: "Risiko og medvirkning",
  criticalProcesses: "Kritiske prosesser",
  crisisTeam: "Kriseteam — kontaktliste",
  riskScenarios: "Risikoscenarier",
  responsePlans: "Varsling og innsats",
  resources: "Førstehjelp og ressurser",
  recoveryPlan: "Gjenopprettingstiltak",
  communicationPlan: "Kommunikasjonsplan",
  trainingAndExercises: "Opplæring og øvelser",
  confirmations: "Verifiseringer",
  nextReview: "Neste gjennomgang",
} as const;
