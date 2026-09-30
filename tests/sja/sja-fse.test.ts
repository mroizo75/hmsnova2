import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateFseCompetence,
  getMissingChecklistItems,
  getRequiredChecklistKeys,
  getRequiredCourseKeys,
  requiresSecondPersonByFse,
} from "../../src/features/sja/lib/sja-fse";

describe("FSE-regler for SJA", () => {
  it("krever fem sikkerhetstiltak i tillegg til grunnkontroll ved frakoblet anlegg", () => {
    const keys = getRequiredChecklistKeys("DE_ENERGIZED");

    assert.equal(keys.length, 10);
    assert.ok(keys.includes("disconnected"));
    assert.ok(keys.includes("nearbyLivePartsProtected"));
    assert.equal(
      getMissingChecklistItems(
        "DE_ENERGIZED",
        Object.fromEntries(keys.map((key) => [key, true])),
      ).length,
      0,
    );
  });

  it("finner manglende sikkerhetspunkt før innsending", () => {
    const missing = getMissingChecklistItems("NEAR_LIVE", {
      riskAssessmentCompleted: true,
    });

    assert.ok(missing.includes("workMethodSelected"));
    assert.ok(missing.includes("personnelInstructed"));
  });

  it("krever FSE, førstehjelp og AUS for arbeid under spenning", () => {
    assert.deepEqual(getRequiredCourseKeys("LIVE_LOW_VOLTAGE"), [
      "elektro-fse-grunnkurs",
      "elektro-forstehjelp",
      "elektro-fse-lavspenning",
    ]);
  });

  it("krever som hovedregel person nummer to ved høyspenningsarbeid", () => {
    assert.equal(requiresSecondPersonByFse("HIGH_VOLTAGE"), true);
    assert.equal(requiresSecondPersonByFse("DE_ENERGIZED"), false);
  });
});

describe("kompetansekontroll", () => {
  it("godkjenner fullført og gyldig opplæring", () => {
    const result = evaluateFseCompetence(
      ["elektro-fse-grunnkurs", "elektro-forstehjelp"],
      [
        {
          courseKey: "elektro-fse-grunnkurs",
          completedAt: "2026-02-01",
          validUntil: "2027-02-01",
        },
        {
          courseKey: "elektro-forstehjelp",
          completedAt: "2026-02-01",
          validUntil: "2027-02-01",
        },
      ],
      new Date("2026-09-30"),
    );

    assert.equal(result.status, "VALID");
  });

  it("skiller mellom manglende og utløpt opplæring", () => {
    const result = evaluateFseCompetence(
      ["elektro-fse-grunnkurs", "elektro-forstehjelp"],
      [
        {
          courseKey: "elektro-fse-grunnkurs",
          completedAt: "2024-01-01",
          validUntil: "2025-01-01",
        },
      ],
      new Date("2026-09-30"),
    );

    assert.equal(result.status, "MISSING");
    assert.deepEqual(result.expiredCourseKeys, ["elektro-fse-grunnkurs"]);
    assert.deepEqual(result.missingCourseKeys, ["elektro-forstehjelp"]);
  });

  it("håndhever 12 måneder selv om en gammel kursrad har lengre gyldighet", () => {
    const result = evaluateFseCompetence(
      ["elektro-fse-grunnkurs"],
      [
        {
          courseKey: "elektro-fse-grunnkurs",
          completedAt: "2024-01-01",
          validUntil: "2027-01-01",
        },
      ],
      new Date("2026-09-30"),
    );

    assert.equal(result.status, "EXPIRED");
  });
});
