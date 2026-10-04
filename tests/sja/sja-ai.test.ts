import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSjaAiPrompt,
  MAX_SJA_AI_IMAGES,
  normalizeSjaAiDraft,
  redactSjaBriefing,
  sjaAiInputSchema,
} from "../../src/features/sja/lib/sja-ai";
import { createSjaSchema } from "../../src/features/sja/schemas/sja.schema";
import { validateImageFile } from "../../src/lib/file-validation";

const rawDraft = {
  title: "Montere ventil",
  description: "Stenge og trykkavlaste røret før ventilen skiftes.",
  additionalConditions: "Trangt rom og andre fag i nærheten.",
  electricalWorkType: "NOT_APPLICABLE",
  workMethod: "Stans anlegget og verifiser trykkløs tilstand.",
  requiredEquipment: "Låseutstyr og egnet håndverktøy.",
  requiredPpe: "Vernebriller og hansker etter at trykket er fjernet.",
  personnelRequirements: "Arbeidsleder og utførende med dokumentert opplæring.",
  safetyConditions: "Arbeidet starter ikke før isolering er kontrollert.",
  stopCriteria: "Stans ved resttrykk, lekkasje, endrede forhold eller ukjent energikilde.",
  requiresWrittenInstruction: false,
  specialRequirementReview: ["Kontroller behov for arbeidstillatelse"],
  warnings: ["Bekreft faktisk rørinnhold"],
  hazards: [
    {
      activity: "Trykkavlaste",
      hazard: "Resttrykk i røret",
      consequence: "Treffskade eller eksponering",
      probability: 9,
      severity: 0,
      measures: "Isoler, lås og verifiser null trykk før demontering.",
      responsibleName: "AI skal ikke sette navn",
    },
  ],
  participants: ["AI skal ikke velge deltakere"],
  fseChecklist: { riskAssessmentCompleted: true },
};

test("normaliserer komplett SJA-utkast og begrenser risikoverdier", () => {
  const result = normalizeSjaAiDraft(rawDraft);

  assert.ok(result);
  assert.equal(result.hazards[0].probability, 5);
  assert.equal(result.hazards[0].severity, 1);
  assert.equal("participants" in result, false);
  assert.equal("fseChecklist" in result, false);
  assert.equal("responsibleName" in result.hazards[0], false);
});

test("avviser AI-utkast uten gyldige farer", () => {
  assert.equal(normalizeSjaAiDraft({ ...rawDraft, hazards: [] }), null);
});

test("fjerner e-post og telefon fra briefing før AI-prompt", () => {
  const redacted = redactSjaBriefing(
    "Ring +47 900 00 000 eller send til kari@example.no før arbeidet starter.",
  );

  assert.doesNotMatch(redacted, /900 00 000/);
  assert.doesNotMatch(redacted, /kari@example\.no/);
  assert.match(redacted, /\[telefonnummer fjernet\]/);
  assert.match(redacted, /\[e-post fjernet\]/);
});

test("bygger lovstyrt prompt med tiltakshierarki og uten kontaktdata", () => {
  const input = sjaAiInputSchema.parse({
    briefing: "Skift ventil. Kontakt kari@example.no eller +47 900 00 000 ved spørsmål.",
    workLocation: "Teknisk rom",
    electricalWorkType: "NOT_APPLICABLE",
  });
  const prompt = buildSjaAiPrompt({ ...input, industry: "Bygg og anlegg" });

  assert.match(prompt, /eliminering\/kollektive tiltak/);
  assert.match(prompt, /stans-kriterier/);
  assert.doesNotMatch(prompt, /kari@example\.no/);
  assert.doesNotMatch(prompt, /900 00 000/);
});

test("krever menneskelige bekreftelser når SJA bygger på AI-utkast", () => {
  const baseInput = {
    tenantId: "cm12345678901234567890123",
    title: "Montere ventil",
    workLocation: "Teknisk rom",
    plannedDate: new Date("2026-10-05T12:00:00Z"),
    responsibleName: "Arbeidsleder",
    participants: "Kari",
    electricalWorkType: "NOT_APPLICABLE",
    hazards: [
      {
        activity: "Demontere",
        hazard: "Resttrykk",
        probability: 2,
        severity: 4,
        measures: "Isoler og verifiser null trykk.",
      },
    ],
    aiGenerated: true,
  };

  assert.equal(createSjaSchema.safeParse(baseInput).success, false);
  assert.equal(
    createSjaSchema.safeParse({
      ...baseInput,
      aiVerification: {
        actualWorksiteConfirmed: true,
        workerParticipationConfirmed: true,
        barriersConfirmed: true,
        stopCriteriaConfirmed: true,
        specialRequirementsConfirmed: true,
      },
    }).success,
    true,
  );
});

test("godtar faktisk PNG og har fast bildegrense for AI", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
    "base64",
  );
  const validation = await validateImageFile(png);

  assert.equal(MAX_SJA_AI_IMAGES, 3);
  assert.equal(validation.isValid, true);
  assert.equal(validation.detectedType, "image/png");
});

test("AI-ruten og permanent opplasting har rate limit og magic-byte-kontroll", () => {
  const aiRoute = readFileSync(
    new URL("../../src/app/api/ai/sja-draft/route.ts", import.meta.url),
    "utf8",
  );
  const uploadRoute = readFileSync(
    new URL("../../src/app/api/sja/upload/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(aiRoute, /policy: "expensiveOperation"/);
  assert.match(aiRoute, /validateImageFile/);
  assert.match(uploadRoute, /policy: "upload"/);
  assert.match(uploadRoute, /validateImageFile/);
  assert.ok(uploadRoute.indexOf("validateImageFile") < uploadRoute.indexOf("storage.upload"));
});
