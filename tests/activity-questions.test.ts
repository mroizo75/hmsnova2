import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVITY_QUESTIONS,
  deriveActiveActivities,
  getDefaultAnswers,
} from "../src/lib/activity-questions";
import {
  ACTIVATION_TOKEN_EXPIRY_HOURS,
  TOKEN_EXPIRY_HOURS,
} from "../src/lib/password-reset";
import { getActivationEmail } from "../src/lib/email-templates";

test("kontrollspørsmål-katalogen har NACE-defaults og aktivitetsmapping", () => {
  assert.ok(ACTIVITY_QUESTIONS.length >= 20);
  for (const question of ACTIVITY_QUESTIONS) {
    assert.ok(question.key.length > 0);
    assert.ok(question.drivesActivities.length > 0);
  }
  assert.ok(ACTIVITY_QUESTIONS.some((q) => q.key === "has_chemicals"));
  assert.ok(ACTIVITY_QUESTIONS.some((q) => q.drivesActivities.includes("night_shift")));
});

test("NACE 41 forhåndskrysser bygg- og maskinspørsmål", () => {
  const answers = getDefaultAnswers("41.200");
  assert.equal(answers.has_machinery, true);
  assert.equal(answers.has_construction, true);
  assert.equal(answers.has_chemicals, false);
  const activities = deriveActiveActivities(answers, "41.200");
  assert.ok(activities.includes("construction"));
  assert.ok(activities.includes("machinery"));
});

test("aktiveringstoken varer 24 timer, passord-reset 1 time", () => {
  assert.equal(ACTIVATION_TOKEN_EXPIRY_HOURS, 24);
  assert.equal(TOKEN_EXPIRY_HOURS, 1);
});

test("aktiverings-e-post inneholder lenke og utløpsinfo", () => {
  const html = getActivationEmail({
    contactPerson: "Kari Nordmann",
    companyName: "Test AS",
    activationUrl: "https://hmsnova.no/aktiver-konto?token=abc123",
  });
  assert.ok(html.includes("Aktiver din HMS Nova-konto"));
  assert.ok(html.includes("https://hmsnova.no/aktiver-konto?token=abc123"));
  assert.ok(html.includes("24 timer"));
  assert.ok(html.includes("Kari Nordmann"));
  assert.ok(html.includes("Test AS"));
});
