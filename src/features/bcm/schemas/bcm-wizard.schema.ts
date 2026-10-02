import { z } from "zod";

import {
  BCM_PROCESS_OPTIONS,
  BCM_RISK_OPTIONS,
  BCM_SPECIAL_CONDITION_OPTIONS,
} from "@/features/bcm/lib/bcm-wizard.constants";

const requiredText = (label: string, min = 10, max = 8_000) =>
  z.string().trim().min(min, `${label} må beskrives`).max(max, `${label} er for lang`);

const optionalPlanText = z.string().trim().max(8_000);
const phoneSchema = z
  .string()
  .trim()
  .min(5, "Telefonnummer mangler")
  .max(30, "Telefonnummer er for langt")
  .regex(/^[+\d][\d\s()-]+$/, "Ugyldig telefonnummer");

export const bcmCrisisTeamMemberSchema = z.object({
  name: z.string().trim().min(2, "Navn mangler").max(120),
  role: z.string().trim().min(2, "Rolle mangler").max(120),
  phone: phoneSchema,
  email: z.union([z.literal(""), z.email("Ugyldig e-postadresse")]),
  substitute: z.string().trim().max(120),
});

export const bcmWizardSubmitSchema = z
  .object({
    organizationScope: requiredText("Virksomhetens omfang"),
    locationsAndWork: requiredText("Lokasjoner og arbeidsformer", 5),
    worksInBuilding: z.boolean(),
    hasHazardousChemicals: z.boolean(),
    handlesDangerousSubstances: z.boolean(),
    specialConditions: z
      .array(z.enum(BCM_SPECIAL_CONDITION_OPTIONS.map((option) => option.value)))
      .max(BCM_SPECIAL_CONDITION_OPTIONS.length),
    specialistAssessment: optionalPlanText,
    riskAssessmentReference: requiredText("Risikogrunnlaget", 5, 1_000),
    employeeParticipation: requiredText("Medvirkning", 5, 1_000),
    criticalProcesses: z.array(z.enum(BCM_PROCESS_OPTIONS)).min(1, "Velg minst én kritisk prosess"),
    crisisTeam: z.array(bcmCrisisTeamMemberSchema).min(1, "Registrer minst én ansvarlig person").max(30),
    riskScenarios: z.array(z.enum(BCM_RISK_OPTIONS)).min(1, "Velg minst ett risikoscenario"),
    alertingPlan: requiredText("Varslingsplanen", 20),
    emergencyActions: requiredText("Umiddelbare handlinger", 30),
    evacuationPlan: optionalPlanText,
    chemicalEmergencyPlan: optionalPlanText,
    dangerousSubstancePlan: optionalPlanText,
    firstAidAndResources: requiredText("Førstehjelp og ressurser", 20),
    recoveryPlan: requiredText("Gjenopprettingstiltak", 20),
    communicationPlan: requiredText("Kommunikasjonsplanen", 20),
    trainingPlan: requiredText("Opplæringsplanen", 20),
    exercisePlan: requiredText("Øvingsplanen", 20),
    nextReviewDate: z.iso.date("Velg en gyldig dato for neste gjennomgang"),
    confirmations: z.object({
      factsConfirmed: z.boolean(),
      riskBasisConfirmed: z.boolean(),
      contactsConfirmed: z.boolean(),
      physicalControlsConfirmed: z.boolean(),
      participationConfirmed: z.boolean(),
      trainingPlanConfirmed: z.boolean(),
      specialRequirementsConfirmed: z.boolean(),
    }),
    aiSuggestedText: z.string().trim().max(8_000).optional(),
    aiSuggestedField: z.enum(["emergencyActions", "trainingPlan"]).optional(),
  })
  .superRefine((data, context) => {
    const addIssue = (path: Array<string | number>, message: string) => {
      context.addIssue({ code: "custom", path, message });
    };

    // Forskrift om brannforebygging § 12: bruker av byggverk skal ha rutiner
    // for evakuering og redning, tilpasset byggverkets bruk og risiko.
    if (data.worksInBuilding && data.evacuationPlan.length < 20) {
      addIssue(["evacuationPlan"], "Evakuerings- og redningsrutiner må beskrives for byggverket");
    }

    // Forskrift om utførelse av arbeid § 3-15: beredskapsplan kreves når
    // risikovurderingen viser fare for kjemikalieulykke eller nødssituasjon.
    if (data.hasHazardousChemicals && data.chemicalEmergencyPlan.length < 20) {
      addIssue(["chemicalEmergencyPlan"], "Kjemikalieberedskap må beskrives");
    }

    // Forskrift om håndtering av farlig stoff § 19.
    if (data.handlesDangerousSubstances && data.dangerousSubstancePlan.length < 20) {
      addIssue(["dangerousSubstancePlan"], "Beredskap for farlig stoff må beskrives");
    }

    if (data.specialConditions.length > 0 && data.specialistAssessment.length < 20) {
      addIssue(
        ["specialistAssessment"],
        "Beskriv hvordan særregulerte aktiviteter er vurdert av ansvarlig eller fagkyndig",
      );
    }

    for (const [key, confirmed] of Object.entries(data.confirmations)) {
      if (!confirmed) {
        addIssue(["confirmations", key], "Må bekreftes før planen kan opprettes");
      }
    }
  });

export type BcmWizardSubmitInput = z.input<typeof bcmWizardSubmitSchema>;
export type ValidatedBcmWizardDraft = z.output<typeof bcmWizardSubmitSchema>;
