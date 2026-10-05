import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createSjaRiskSnapshot,
  mapRiskToSjaHazard,
} from "../../src/features/sja/lib/sja-risk-source";

const risk = {
  id: "risk-1",
  riskAssessmentId: "assessment-1",
  title: "Arbeid i høyden",
  context: "Fall fra stige under montering",
  description: "Montering over to meter",
  riskStatement: "Kan føre til alvorlig personskade",
  likelihood: 3,
  consequence: 4,
  score: 12,
  existingControls: "Stigen kontrolleres før bruk",
  measures: [{ title: "Bruk fallsikring", status: "PENDING" }],
};

describe("gjenbruk av risikopunkt i SJA", () => {
  it("kopierer risikoinnhold til en redigerbar SJA-fare", () => {
    const hazard = mapRiskToSjaHazard(risk);

    assert.equal(hazard.activity, risk.title);
    assert.equal(hazard.linkedRiskId, risk.id);
    assert.equal(hazard.probability, 3);
    assert.match(hazard.measures, /fallsikring/);
  });

  it("lager et stabilt snapshot med kilde og tidspunkt", () => {
    const capturedAt = new Date("2026-10-05T12:00:00.000Z");
    const snapshot = createSjaRiskSnapshot(risk, capturedAt);

    assert.equal(snapshot.assessmentId, "assessment-1");
    assert.equal(snapshot.score, 12);
    assert.equal(snapshot.capturedAt, capturedAt.toISOString());
  });
});
