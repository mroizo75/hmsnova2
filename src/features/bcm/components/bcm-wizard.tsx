"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BCM_PROCESS_OPTIONS,
  BCM_RISK_OPTIONS,
  BCM_SPECIAL_CONDITION_OPTIONS,
  EMPTY_BCM_CONFIRMATIONS,
  type BcmConfirmationKey,
  type BcmCrisisTeamMember,
  type BcmProcessOption,
  type BcmRiskOption,
  type BcmSpecialCondition,
  type BcmWizardDraft,
} from "@/features/bcm/lib/bcm-wizard.constants";
import { getBcmComplianceSummary } from "@/features/bcm/lib/bcm-compliance";
import type { BcmAiGuidanceStep } from "@/features/bcm/lib/bcm-wizard-ai";
import { useToast } from "@/hooks/use-toast";
import { generateAiBcmGuidance } from "@/server/actions/ai-assistant.actions";
import { submitBcmWizard } from "@/server/actions/bcm.actions";

const STEPS = [
  { title: "Virksomhet og omfang", description: "Avgrens hvem og hva planen gjelder for" },
  { title: "Lovscreening", description: "Finn hvilke krav som må inngå" },
  { title: "Risiko og medvirkning", description: "Koble planen til dokumentert risiko" },
  { title: "Ansvar og varsling", description: "Avklar roller, fullmakter og varslingsrekkefølge" },
  { title: "Innsats og evakuering", description: "Beskriv de første minuttene ved en hendelse" },
  { title: "Ressurser og gjenoppretting", description: "Sikre førstehjelp, utstyr og videre drift" },
  { title: "Opplæring og øvelser", description: "Planlegg kompetanse, testing og forbedring" },
  { title: "Kontroll og bekreftelse", description: "Kontroller faktiske forhold før planen opprettes" },
] as const;

const CONFIRMATIONS: Array<{
  key: BcmConfirmationKey;
  label: string;
}> = [
  { key: "factsConfirmed", label: "Virksomhet, lokasjoner og aktiviteter er korrekt beskrevet." },
  { key: "riskBasisConfirmed", label: "Gjeldende risiko- og kjemikaliegrunnlag er inkludert." },
  { key: "contactsConfirmed", label: "Roller, fullmakter, telefonnumre og stedfortredere er kontrollert." },
  {
    key: "physicalControlsConfirmed",
    label: "Rømningsveier, møteplass, alarm, førstehjelp og beredskapsutstyr er fysisk kontrollert.",
  },
  {
    key: "participationConfirmed",
    label: "Ansatte eller verneombud har medvirket i kartleggingen og planen.",
  },
  {
    key: "trainingPlanConfirmed",
    label: "Opplærings- og øvingsplanen er realistisk og dekker relevante skift og roller.",
  },
  {
    key: "specialRequirementsConfirmed",
    label: "Aktuelle myndighets-, melde- og samordningsplikter er vurdert av ansvarlig person.",
  },
];

function createInitialDraft(): BcmWizardDraft {
  const reviewDate = new Date();
  reviewDate.setFullYear(reviewDate.getFullYear() + 1);

  return {
    organizationScope: "",
    locationsAndWork: "",
    worksInBuilding: true,
    hasHazardousChemicals: false,
    handlesDangerousSubstances: false,
    specialConditions: [],
    specialistAssessment: "",
    riskAssessmentReference: "",
    employeeParticipation: "",
    criticalProcesses: [],
    crisisTeam: [{ name: "", role: "", phone: "", email: "", substitute: "" }],
    riskScenarios: [],
    alertingPlan: "",
    emergencyActions: "",
    evacuationPlan: "",
    chemicalEmergencyPlan: "",
    dangerousSubstancePlan: "",
    firstAidAndResources: "",
    recoveryPlan: "",
    communicationPlan: "",
    trainingPlan: "",
    exercisePlan: "",
    nextReviewDate: reviewDate.toISOString().slice(0, 10),
    confirmations: { ...EMPTY_BCM_CONFIRMATIONS },
  };
}

function LegalNote({
  basis,
  children,
  required = true,
}: {
  basis: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Badge variant={required ? "default" : "secondary"}>{required ? "Påkrevd" : "Risikobasert"}</Badge>
        <span className="font-medium">{basis}</span>
      </div>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

export function BcmWizard({
  onComplete,
  aiEnabled = false,
}: {
  onComplete: () => void;
  aiEnabled?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BcmWizardDraft>(createInitialDraft);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);

  const compliance = useMemo(() => getBcmComplianceSummary(draft), [draft]);

  const updateDraft = <K extends keyof BcmWizardDraft>(key: K, value: BcmWizardDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleArrayValue = <T extends string>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

  const updateTeamMember = (index: number, field: keyof BcmCrisisTeamMember, value: string) => {
    updateDraft(
      "crisisTeam",
      draft.crisisTeam.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    );
  };

  const runAiGuidance = async (aiStep: BcmAiGuidanceStep) => {
    if (!draft.organizationScope.trim()) {
      toast({ title: "Beskriv virksomheten først", variant: "destructive" });
      return;
    }

    setAiLoading(true);
    try {
      const result = await generateAiBcmGuidance({
        step: aiStep,
        organizationScope: draft.organizationScope,
        locationsAndWork: draft.locationsAndWork,
        legalModules: compliance.modules.map((module) => `${module.title}: ${module.legalBasis}`),
        criticalProcesses: draft.criticalProcesses,
        riskScenarios: draft.riskScenarios,
        specialConditions: draft.specialConditions,
      });

      if (!result.success) {
        toast({ title: "Kunne ikke hente AI-veiledning", description: result.error, variant: "destructive" });
        return;
      }

      const guidance = result.data;
      setAiWarnings(guidance.warnings);
      if (guidance.suggestedProcesses.length > 0) updateDraft("criticalProcesses", guidance.suggestedProcesses);
      if (guidance.suggestedRisks.length > 0) updateDraft("riskScenarios", guidance.suggestedRisks);
      if (guidance.suggestedRoles.length > 0) {
        const hasOnlyEmptyMember =
          draft.crisisTeam.length === 1 &&
          Object.values(draft.crisisTeam[0]).every((value) => value.trim().length === 0);
        const existingMembers = hasOnlyEmptyMember ? [] : draft.crisisTeam;
        const existingRoles = new Set(existingMembers.map((member) => member.role.toLowerCase()));
        updateDraft(
          "crisisTeam",
          [
            ...existingMembers,
            ...guidance.suggestedRoles
              .filter((role) => !existingRoles.has(role.toLowerCase()))
              .map((role) => ({
                name: "",
                role,
                phone: "",
                email: "",
                substitute: "",
              })),
          ],
        );
      }
      if (guidance.suggestedText) {
        if (aiStep === "response") {
          updateDraft("emergencyActions", guidance.suggestedText);
          updateDraft("aiSuggestedField", "emergencyActions");
          updateDraft("aiSuggestedText", guidance.suggestedText);
        } else if (aiStep === "training") {
          updateDraft("trainingPlan", guidance.suggestedText);
          updateDraft("aiSuggestedField", "trainingPlan");
          updateDraft("aiSuggestedText", guidance.suggestedText);
        }
      }
      toast({
        title: "AI-forslag lagt inn",
        description: "Kontroller og tilpass forslaget før du går videre.",
      });
    } catch {
      toast({ title: "Kunne ikke hente AI-veiledning", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return draft.organizationScope.trim().length >= 10 && draft.locationsAndWork.trim().length >= 5;
      case 1:
        return draft.specialConditions.length === 0 || draft.specialistAssessment.trim().length >= 20;
      case 2:
        return (
          draft.riskAssessmentReference.trim().length >= 5 &&
          draft.employeeParticipation.trim().length >= 5 &&
          draft.criticalProcesses.length > 0 &&
          draft.riskScenarios.length > 0
        );
      case 3:
        return (
          draft.crisisTeam.some((member) => member.name && member.role && member.phone) &&
          draft.alertingPlan.trim().length >= 20
        );
      case 4:
        return (
          draft.emergencyActions.trim().length >= 30 &&
          (!draft.worksInBuilding || draft.evacuationPlan.trim().length >= 20) &&
          (!draft.hasHazardousChemicals || draft.chemicalEmergencyPlan.trim().length >= 20) &&
          (!draft.handlesDangerousSubstances || draft.dangerousSubstancePlan.trim().length >= 20)
        );
      case 5:
        return (
          draft.firstAidAndResources.trim().length >= 20 &&
          draft.recoveryPlan.trim().length >= 20 &&
          draft.communicationPlan.trim().length >= 20
        );
      case 6:
        return (
          draft.trainingPlan.trim().length >= 20 &&
          draft.exercisePlan.trim().length >= 20 &&
          Boolean(draft.nextReviewDate)
        );
      case 7:
        return compliance.isVerified;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitBcmWizard({
        ...draft,
        crisisTeam: draft.crisisTeam.filter((member) => member.name.trim().length > 0),
      });
      if (!result.success) {
        toast({ title: "Kunne ikke opprette planen", description: result.error, variant: "destructive" });
        return;
      }

      toast({
        title: "Beredskapsplan opprettet",
        description: "Planen er lagret som utkast og må godkjennes i dokumentflyten.",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bcm"] }),
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
      ]);
      onComplete();
    } catch {
      toast({ title: "Kunne ikke opprette planen", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{STEPS[step].title}</CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </div>
          <Badge variant="secondary">Steg {step + 1} av {STEPS.length}</Badge>
        </div>
        <div className="mt-4 flex gap-1">
          {STEPS.map((item, index) => (
            <div
              key={item.title}
              className={`h-2 flex-1 rounded-full transition-colors ${
                index <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {step === 0 && (
          <>
            <LegalNote basis="AML § 3-1 og internkontrollforskriften § 5">
              Planens omfang skal tilpasses virksomhetens art, aktiviteter, risiko og størrelse.
            </LegalNote>
            <div className="space-y-2">
              <Label htmlFor="organizationScope">Hva gjør virksomheten, og hvem gjelder planen for?</Label>
              <Textarea
                id="organizationScope"
                value={draft.organizationScope}
                onChange={(event) => updateDraft("organizationScope", event.target.value)}
                placeholder="Beskriv tjenester, bemanning, åpningstider og hvem som kan bli berørt."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationsAndWork">Lokasjoner og arbeidsformer</Label>
              <Textarea
                id="locationsAndWork"
                value={draft.locationsAndWork}
                onChange={(event) => updateDraft("locationsAndWork", event.target.value)}
                placeholder="Kontor, verksted, kundelokasjoner, skift, hjemmekontor eller mobilt arbeid."
                rows={4}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <LegalNote basis="Internkontrollforskriften § 5 nr. 1 og 6">
              Kunden må bekrefte faktiske aktiviteter. Veiviseren bruker svarene til å aktivere relevante krav.
            </LegalNote>
            <BooleanQuestion
              label="Bruker virksomheten ett eller flere byggverk?"
              checked={draft.worksInBuilding}
              onCheckedChange={(checked) => updateDraft("worksInBuilding", checked)}
            />
            <BooleanQuestion
              label="Viser risikovurderingen at farlige kjemikalier kan føre til ulykke eller nødssituasjon?"
              checked={draft.hasHazardousChemicals}
              onCheckedChange={(checked) => updateDraft("hasHazardousChemicals", checked)}
            />
            <BooleanQuestion
              label="Håndterer virksomheten brannfarlig, reaksjonsfarlig eller trykksatt stoff?"
              checked={draft.handlesDangerousSubstances}
              onCheckedChange={(checked) => updateDraft("handlesDangerousSubstances", checked)}
            />
            <div className="space-y-2">
              <Label>Andre forhold som kan ha særskilte beredskapskrav</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {BCM_SPECIAL_CONDITION_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                    <Checkbox
                      checked={draft.specialConditions.includes(option.value)}
                      onCheckedChange={() =>
                        updateDraft(
                          "specialConditions",
                          toggleArrayValue<BcmSpecialCondition>(draft.specialConditions, option.value),
                        )
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {draft.specialConditions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="specialistAssessment">Hvordan er særkravene vurdert?</Label>
                <Textarea
                  id="specialistAssessment"
                  value={draft.specialistAssessment}
                  onChange={(event) => updateDraft("specialistAssessment", event.target.value)}
                  placeholder="Oppgi ansvarlig/fagkyndig, aktuell forskrift, status og videre oppfølging. Veiviseren fastslår ikke terskelverdier eller myndighetsstatus."
                  rows={5}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Aktiverte krav</Label>
              {compliance.modules.map((module) => (
                <div key={module.id} className="rounded-lg border p-3">
                  <p className="font-medium">{module.title}</p>
                  <p className="text-xs text-muted-foreground">{module.legalBasis}</p>
                  <p className="mt-1 text-sm">{module.reason}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <LegalNote basis="AML § 3-1 andre ledd bokstav c og internkontrollforskriften § 5 nr. 3 og 6">
              Beredskapen skal bygge på skriftlig risiko og reell medvirkning fra arbeidstakerne.
            </LegalNote>
            <AiButton
              enabled={aiEnabled}
              loading={aiLoading}
              onClick={() => runAiGuidance("risks")}
              label="Foreslå prosesser og scenarioer"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="riskAssessmentReference">Hvilken risikovurdering bygger planen på?</Label>
                <Textarea
                  id="riskAssessmentReference"
                  value={draft.riskAssessmentReference}
                  onChange={(event) => updateDraft("riskAssessmentReference", event.target.value)}
                  placeholder="Tittel, dato, ansvarlig og hvor vurderingen finnes."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeParticipation">Hvordan har ansatte/verneombud medvirket?</Label>
                <Textarea
                  id="employeeParticipation"
                  value={draft.employeeParticipation}
                  onChange={(event) => updateDraft("employeeParticipation", event.target.value)}
                  placeholder="Deltakere, dato og hvordan erfaringene deres er brukt."
                />
              </div>
            </div>
            <OptionGrid
              title="Kritiske prosesser"
              options={BCM_PROCESS_OPTIONS}
              selected={draft.criticalProcesses}
              onToggle={(value) =>
                updateDraft(
                  "criticalProcesses",
                  toggleArrayValue<BcmProcessOption>(draft.criticalProcesses, value as BcmProcessOption),
                )
              }
            />
            <OptionGrid
              title="Risikoscenarier"
              options={BCM_RISK_OPTIONS}
              selected={draft.riskScenarios}
              onToggle={(value) =>
                updateDraft(
                  "riskScenarios",
                  toggleArrayValue<BcmRiskOption>(draft.riskScenarios, value as BcmRiskOption),
                )
              }
            />
          </>
        )}

        {step === 3 && (
          <>
            <LegalNote basis="Internkontrollforskriften § 5 nr. 5 og AML § 3-2">
              Ansvar, myndighet, varslingskanaler og stedfortredere må være kjent før en hendelse.
            </LegalNote>
            <AiButton
              enabled={aiEnabled}
              loading={aiLoading}
              onClick={() => runAiGuidance("roles")}
              label="Foreslå beredskapsroller"
            />
            <p className="text-xs text-muted-foreground">
              AI får bare se roller og virksomhetskontekst. Navn, telefon og e-post sendes ikke til modellen.
            </p>
            {draft.crisisTeam.map((member, index) => (
              <div key={index} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Beredskapsrolle {index + 1}</span>
                  {draft.crisisTeam.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        updateDraft(
                          "crisisTeam",
                          draft.crisisTeam.filter((_, memberIndex) => memberIndex !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(["name", "role", "phone", "email", "substitute"] as const).map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">
                        {field === "name"
                          ? "Navn"
                          : field === "role"
                            ? "Rolle og fullmakt"
                            : field === "phone"
                              ? "Telefon"
                              : field === "email"
                                ? "E-post"
                                : "Stedfortreder"}
                      </Label>
                      <Input
                        type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                        value={member[field]}
                        onChange={(event) => updateTeamMember(index, field, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={() =>
                updateDraft("crisisTeam", [
                  ...draft.crisisTeam,
                  { name: "", role: "", phone: "", email: "", substitute: "" },
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Legg til rolle
            </Button>
            <div className="space-y-2">
              <Label htmlFor="alertingPlan">Intern og ekstern varsling</Label>
              <Textarea
                id="alertingPlan"
                value={draft.alertingPlan}
                onChange={(event) => updateDraft("alertingPlan", event.target.value)}
                placeholder="Hvem varsler, i hvilken rekkefølge, via hoved- og reservekanal, og når nødetater eller myndigheter kontaktes?"
                rows={6}
              />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <LegalNote basis="Internkontrollforskriften § 5 nr. 6–7" required={false}>
              Tiltakene skal følge scenarioene og være mulige å utføre med tilgjengelige personer og ressurser.
            </LegalNote>
            <AiButton
              enabled={aiEnabled}
              loading={aiLoading}
              onClick={() => runAiGuidance("response")}
              label="Lag utkast til handlingskort"
            />
            <PlanTextarea
              id="emergencyActions"
              label="Umiddelbare handlinger per scenario"
              value={draft.emergencyActions}
              onChange={(value) => updateDraft("emergencyActions", value)}
              placeholder="For hvert scenario: aktiveringskriterium, de første handlingene, ansvarlig rolle, stans/avgrensning og eskalering."
              rows={9}
            />
            {draft.worksInBuilding && (
              <PlanTextarea
                id="evacuationPlan"
                label="Evakuering og redning ved brann"
                legalBasis="Forskrift om brannforebygging § 12"
                value={draft.evacuationPlan}
                onChange={(value) => updateDraft("evacuationPlan", value)}
                placeholder="Alarm, hoved- og alternativ rømningsvei, møteplass, opptelling, assistansebehov og kontakt med brannvesenet."
              />
            )}
            {draft.hasHazardousChemicals && (
              <PlanTextarea
                id="chemicalEmergencyPlan"
                label="Kjemikalienødsituasjoner"
                legalBasis="Forskrift om utførelse av arbeid § 3-15"
                value={draft.chemicalEmergencyPlan}
                onChange={(value) => updateDraft("chemicalEmergencyPlan", value)}
                placeholder="Driftsforstyrrelse, avsperring, verneutstyr, førstehjelp, sikkerhetsdatablad og informasjon til redningstjenesten."
              />
            )}
            {draft.handlesDangerousSubstances && (
              <PlanTextarea
                id="dangerousSubstancePlan"
                label="Farlig stoff"
                legalBasis="Forskrift om håndtering av farlig stoff § 19"
                value={draft.dangerousSubstancePlan}
                onChange={(value) => updateDraft("dangerousSubstancePlan", value)}
                placeholder="Ansvars- og ressursfordeling samt alarmerings-, rømnings-, rednings- og slokkeinstrukser."
              />
            )}
          </>
        )}

        {step === 5 && (
          <>
            <LegalNote basis="Arbeidsplassforskriften § 3-10 og internkontrollforskriften § 5" required={false}>
              Førstehjelp og øvrige ressurser skal tilpasses arbeidet, lokasjonene, antall personer og identifisert risiko.
            </LegalNote>
            <PlanTextarea
              id="firstAidAndResources"
              label="Førstehjelp og beredskapsressurser"
              value={draft.firstAidAndResources}
              onChange={(value) => updateDraft("firstAidAndResources", value)}
              placeholder="Kompetanse, plassering og kontroll av førstehjelpsutstyr, alarm, samband, verneutstyr, slokkeutstyr, nødstrøm og andre ressurser."
            />
            <PlanTextarea
              id="recoveryPlan"
              label="Gjenoppretting og sikker normalisering"
              legalBasis="Risikobasert; ISO 22301 er frivillig standard/avtalekrav"
              value={draft.recoveryPlan}
              onChange={(value) => updateDraft("recoveryPlan", value)}
              placeholder="Prioritert rekkefølge, ansvar, alternative arbeidsmåter, akseptabel nedetid og kriterier for sikker retur til normal drift."
            />
            <PlanTextarea
              id="communicationPlan"
              label="Krisekommunikasjon"
              value={draft.communicationPlan}
              onChange={(value) => updateDraft("communicationPlan", value)}
              placeholder="Målgrupper, kanal, ansvarlig talsperson, første melding og reservekanal ved nett- eller strømutfall."
            />
          </>
        )}

        {step === 6 && (
          <>
            <LegalNote basis="AML § 3-2 og internkontrollforskriften § 5 nr. 2 og 8">
              Opplæring, øvelser og gjennomgang skal tilpasses risiko. Fast frekvens brukes bare når en særregel krever det.
            </LegalNote>
            <AiButton
              enabled={aiEnabled}
              loading={aiLoading}
              onClick={() => runAiGuidance("training")}
              label="Foreslå opplæringsplan"
            />
            <PlanTextarea
              id="trainingPlan"
              label="Opplæring og informasjon"
              value={draft.trainingPlan}
              onChange={(value) => updateDraft("trainingPlan", value)}
              placeholder="Hvilke roller og skift trenger hvilken opplæring, hvordan dokumenteres den, og hvordan informeres besøkende eller kunder?"
            />
            <PlanTextarea
              id="exercisePlan"
              label="Øvelser, evaluering og forbedring"
              value={draft.exercisePlan}
              onChange={(value) => updateDraft("exercisePlan", value)}
              placeholder="Scenario, mål, deltakere, risikobasert frekvens, evaluering, tiltak, ansvarlig og frist."
            />
            <div className="space-y-2">
              <Label htmlFor="nextReviewDate">Neste systematiske gjennomgang</Label>
              <Input
                id="nextReviewDate"
                type="date"
                value={draft.nextReviewDate}
                onChange={(event) => updateDraft("nextReviewDate", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Planen må også gjennomgås ved relevante endringer eller etter hendelser og øvelser.
              </p>
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <LegalNote basis="Kundens verifisering">
              AI kan strukturere og foreslå, men ansvarlig leder må kontrollere faktiske forhold før godkjenning.
            </LegalNote>
            {aiEnabled && (
              <AiButton
                enabled
                loading={aiLoading}
                onClick={() => runAiGuidance("quality")}
                label="Kjør AI-kvalitetssjekk"
              />
            )}
            {aiWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <p className="mb-2 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" /> AI foreslår at dette kontrolleres
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {aiWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            )}
            <div className="space-y-2">
              {CONFIRMATIONS.map((confirmation) => (
                <label key={confirmation.key} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <Checkbox
                    checked={draft.confirmations[confirmation.key]}
                    onCheckedChange={(checked) =>
                      updateDraft("confirmations", {
                        ...draft.confirmations,
                        [confirmation.key]: checked === true,
                      })
                    }
                  />
                  <span>{confirmation.label}</span>
                </label>
              ))}
            </div>
            {compliance.blockers.length > 0 && (
              <div className="rounded-lg border border-destructive/40 p-4">
                <p className="font-medium text-destructive">Dette må fullføres før planen kan opprettes:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {compliance.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Planen lagres som dokument i utkast-status. Den må deretter behandles i eksisterende godkjenningsflyt.
            </p>
          </>
        )}

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => (step === 0 ? onComplete() : setStep((current) => current - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 0 ? "Avbryt" : "Tilbake"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep((current) => current + 1)} disabled={!canProceed()}>
              Neste <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting || !canProceed()}>
              <Check className="mr-2 h-4 w-4" />
              {submitting ? "Lagrer..." : "Opprett kontrollert utkast"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BooleanQuestion({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}

function OptionGrid({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function PlanTextarea({
  id,
  label,
  legalBasis,
  value,
  onChange,
  placeholder,
  rows = 6,
}: {
  id: string;
  label: string;
  legalBasis?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {legalBasis && <Badge variant="outline">{legalBasis}</Badge>}
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

function AiButton({
  enabled,
  loading,
  onClick,
  label,
}: {
  enabled: boolean;
  loading: boolean;
  onClick: () => void;
  label: string;
}) {
  if (!enabled) return null;
  return (
    <Button type="button" variant="outline" className="bg-transparent" onClick={onClick} disabled={loading}>
      <Sparkles className="mr-2 h-4 w-4" />
      {loading ? "Lager forslag..." : label}
    </Button>
  );
}
