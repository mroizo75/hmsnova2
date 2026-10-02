import {
  BCM_CONFIRMATION_KEYS,
  type BcmConfirmationKey,
  type BcmWizardDraft,
} from "@/features/bcm/lib/bcm-wizard.constants";

export interface BcmLegalModule {
  id: "general" | "fire" | "chemicals" | "dangerousSubstances" | "specialist";
  title: string;
  legalBasis: string;
  reason: string;
}

export interface BcmComplianceSummary {
  modules: BcmLegalModule[];
  blockers: string[];
  isVerified: boolean;
}

const CONFIRMATION_LABELS: Record<BcmConfirmationKey, string> = {
  factsConfirmed: "Virksomhet, lokasjoner og aktiviteter må bekreftes",
  riskBasisConfirmed: "Risiko- og kjemikaliegrunnlaget må bekreftes",
  contactsConfirmed: "Roller, fullmakter og kontaktdata må bekreftes",
  physicalControlsConfirmed: "Rømningsveier, møteplass, alarm og utstyr må være fysisk kontrollert",
  participationConfirmed: "Medvirkning fra ansatte eller verneombud må bekreftes",
  trainingPlanConfirmed: "Opplærings- og øvingsplanen må bekreftes",
  specialRequirementsConfirmed: "Aktuelle særkrav og samordningsplikter må være vurdert",
};

export function resolveBcmLegalModules(
  draft: Pick<
    BcmWizardDraft,
    "worksInBuilding" | "hasHazardousChemicals" | "handlesDangerousSubstances" | "specialConditions"
  >,
): BcmLegalModule[] {
  const modules: BcmLegalModule[] = [
    {
      id: "general",
      title: "Systematisk HMS og beredskap",
      legalBasis: "Arbeidsmiljøloven §§ 3-1 og 3-2, internkontrollforskriften § 5",
      reason: "Planen skal bygge på dokumentert risiko, ansvar, tiltak, opplæring og gjennomgang.",
    },
  ];

  if (draft.worksInBuilding) {
    modules.push({
      id: "fire",
      title: "Brann, evakuering og redning",
      legalBasis: "Forskrift om brannforebygging §§ 11–13",
      reason: "Virksomheten bruker et byggverk og må ha risikotilpassede rutiner.",
    });
  }

  if (draft.hasHazardousChemicals) {
    modules.push({
      id: "chemicals",
      title: "Kjemikalienødsituasjoner",
      legalBasis: "Forskrift om utførelse av arbeid § 3-15",
      reason: "Risikovurderingen viser at farlige kjemikalier kan gi en nødssituasjon.",
    });
  }

  if (draft.handlesDangerousSubstances) {
    modules.push({
      id: "dangerousSubstances",
      title: "Farlig stoff",
      legalBasis: "Forskrift om håndtering av farlig stoff § 19",
      reason: "Virksomheten håndterer brannfarlig, reaksjonsfarlig eller trykksatt stoff.",
    });
  }

  if (draft.specialConditions.length > 0) {
    modules.push({
      id: "specialist",
      title: "Særregulert aktivitet",
      legalBasis: "Relevant sektor- eller aktivitetsforskrift",
      reason:
        "Ett eller flere forhold krever særskilt vurdering. Veiviseren kan dokumentere vurderingen, men fastslår ikke myndighetsstatus eller terskelverdier.",
    });
  }

  return modules;
}

export function getBcmComplianceSummary(draft: BcmWizardDraft): BcmComplianceSummary {
  const blockers: string[] = [];

  if (draft.organizationScope.trim().length < 10) blockers.push("Beskriv virksomheten og planens omfang");
  if (draft.locationsAndWork.trim().length < 5) blockers.push("Beskriv lokasjoner og arbeidsformer");
  if (draft.riskAssessmentReference.trim().length < 5) blockers.push("Oppgi risikovurderingen planen bygger på");
  if (draft.employeeParticipation.trim().length < 5) blockers.push("Dokumenter medvirkning fra ansatte eller verneombud");
  if (draft.criticalProcesses.length === 0) blockers.push("Velg minst én kritisk prosess");
  if (draft.riskScenarios.length === 0) blockers.push("Velg minst ett risikoscenario");
  if (!draft.crisisTeam.some((member) => member.name && member.role && member.phone)) {
    blockers.push("Registrer ansvarlig beredskapspersonell med telefonnummer");
  }
  if (draft.alertingPlan.trim().length < 20) blockers.push("Beskriv intern og ekstern varsling");
  if (draft.emergencyActions.trim().length < 30) blockers.push("Beskriv de første handlingene ved en hendelse");
  if (draft.worksInBuilding && draft.evacuationPlan.trim().length < 20) {
    blockers.push("Beskriv evakuering og redning ved brann");
  }
  if (draft.hasHazardousChemicals && draft.chemicalEmergencyPlan.trim().length < 20) {
    blockers.push("Beskriv beredskap ved kjemikalienødsituasjoner");
  }
  if (draft.handlesDangerousSubstances && draft.dangerousSubstancePlan.trim().length < 20) {
    blockers.push("Beskriv alarmering, rømning, redning og slokking ved farlig stoff");
  }
  if (draft.specialConditions.length > 0 && draft.specialistAssessment.trim().length < 20) {
    blockers.push("Dokumenter vurderingen av særregulerte aktiviteter");
  }
  if (draft.firstAidAndResources.trim().length < 20) blockers.push("Beskriv førstehjelp og beredskapsressurser");
  if (draft.recoveryPlan.trim().length < 20) blockers.push("Beskriv gjenopprettingstiltak");
  if (draft.communicationPlan.trim().length < 20) blockers.push("Beskriv krisekommunikasjon");
  if (draft.trainingPlan.trim().length < 20) blockers.push("Beskriv nødvendig opplæring");
  if (draft.exercisePlan.trim().length < 20) blockers.push("Beskriv øvelser og oppfølging");
  if (!draft.nextReviewDate) blockers.push("Velg dato for neste gjennomgang");

  for (const key of BCM_CONFIRMATION_KEYS) {
    if (!draft.confirmations[key]) blockers.push(CONFIRMATION_LABELS[key]);
  }

  return {
    modules: resolveBcmLegalModules(draft),
    blockers,
    isVerified: blockers.length === 0,
  };
}
