import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getBcmComplianceSummary, resolveBcmLegalModules } from "../../src/features/bcm/lib/bcm-compliance";
import { escapeBcmHtml, generateBcmPlanHtml } from "../../src/features/bcm/lib/bcm-plan-html";
import {
  bcmAiGuidanceInputSchema,
  normalizeBcmAiGuidance,
} from "../../src/features/bcm/lib/bcm-wizard-ai";
import type { BcmWizardDraft } from "../../src/features/bcm/lib/bcm-wizard.constants";
import { bcmWizardSubmitSchema } from "../../src/features/bcm/schemas/bcm-wizard.schema";

function validDraft(): BcmWizardDraft {
  return {
    organizationScope: "Et verksted med ti ansatte og daglig kundemottak.",
    locationsAndWork: "Verksted og kontor i samme bygg.",
    worksInBuilding: true,
    hasHazardousChemicals: false,
    handlesDangerousSubstances: false,
    specialConditions: [],
    specialistAssessment: "",
    riskAssessmentReference: "Risikovurdering 2026-01, godkjent 1. september 2026.",
    employeeParticipation: "Verneombud og to ansatte deltok 1. september 2026.",
    criticalProcesses: ["Produksjon / leveranse"],
    crisisTeam: [
      {
        name: "Kari Nordmann",
        role: "Beredskapsleder",
        phone: "+47 900 00 000",
        email: "kari@example.no",
        substitute: "Driftsleder",
      },
    ],
    riskScenarios: ["Brann i lokaler"],
    alertingPlan: "Beredskapsleder varsles først, deretter 110 og alle ansatte via SMS.",
    emergencyActions: "Stans arbeidet, varsle, evakuer og møt på avtalt møteplass utenfor bygget.",
    evacuationPlan: "Bruk nærmeste sikre rømningsvei, møt ved porten og gjennomfør navneopprop.",
    chemicalEmergencyPlan: "",
    dangerousSubstancePlan: "",
    firstAidAndResources: "Førstehjelpsskap ved garderoben kontrolleres månedlig av driftsleder.",
    recoveryPlan: "Daglig leder godkjenner sikker retur. Kritisk drift flyttes midlertidig.",
    communicationPlan: "Daglig leder informerer ansatte og kunder via SMS og nettside.",
    trainingPlan: "Alle ansatte får årlig risikobasert opplæring og nyansatte instrueres før oppstart.",
    exercisePlan: "Brannscenario øves etter risikovurdert frekvens og avvik følges opp med frist.",
    nextReviewDate: "2027-09-01",
    confirmations: {
      factsConfirmed: true,
      riskBasisConfirmed: true,
      contactsConfirmed: true,
      physicalControlsConfirmed: true,
      participationConfirmed: true,
      trainingPlanConfirmed: true,
      specialRequirementsConfirmed: true,
    },
  };
}

test("aktiverer brann, kjemikalie og farlig-stoff-moduler deterministisk", () => {
  const modules = resolveBcmLegalModules({
    worksInBuilding: true,
    hasHazardousChemicals: true,
    handlesDangerousSubstances: true,
    specialConditions: [],
  });

  assert.deepEqual(
    modules.map((module) => module.id),
    ["general", "fire", "chemicals", "dangerousSubstances"],
  );
});

test("blokkerer kjemikalieplan uten dokumentert kjemikalieberedskap", () => {
  const draft = validDraft();
  draft.hasHazardousChemicals = true;

  const parsed = bcmWizardSubmitSchema.safeParse(draft);
  assert.equal(parsed.success, false);
  assert.match(JSON.stringify(parsed.error?.issues), /Kjemikalieberedskap/);
});

test("godtar komplett og bekreftet beredskapsutkast", () => {
  const draft = validDraft();
  assert.equal(bcmWizardSubmitSchema.safeParse(draft).success, true);
  assert.equal(getBcmComplianceSummary(draft).isVerified, true);
});

test("filtrerer AI-valg til godkjente prosesser og scenarioer", () => {
  const guidance = normalizeBcmAiGuidance({
    suggestedProcesses: ["Produksjon / leveranse", "Oppdiktet prosess"],
    suggestedRisks: ["Brann i lokaler", "Meteoritt"],
    suggestedRoles: ["Beredskapsleder"],
  });

  assert.deepEqual(guidance.suggestedProcesses, ["Produksjon / leveranse"]);
  assert.deepEqual(guidance.suggestedRisks, ["Brann i lokaler"]);
});

test("fjerner kontaktdata som forsøkes sendt til BCM-AI", () => {
  const parsed = bcmAiGuidanceInputSchema.parse({
    step: "roles",
    organizationScope: "Verksted med kundemottak",
    crisisTeam: [{ name: "Kari", phone: "90000000" }],
    contactEmail: "kari@example.no",
  });

  assert.equal("crisisTeam" in parsed, false);
  assert.equal("contactEmail" in parsed, false);
});

test("escaper brukerinnhold i generert plan", () => {
  const draft = validDraft();
  draft.organizationScope = "<script>alert('x')</script> Verksted";
  const html = generateBcmPlanHtml(bcmWizardSubmitSchema.parse(draft));

  assert.equal(escapeBcmHtml("<b>test</b>"), "&lt;b&gt;test&lt;/b&gt;");
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("lagrer skjemainnsending og dokument atomisk", () => {
  const actionSource = readFileSync(
    new URL("../../src/server/actions/bcm.actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(actionSource, /prisma\.\$transaction/);
  assert.match(actionSource, /bcmWizardSubmitSchema\.parse/);
  assert.doesNotMatch(actionSource, /formTemplate\.fields\[\d+\]/);
});
