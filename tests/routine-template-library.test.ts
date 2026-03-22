import assert from "node:assert/strict";
import test from "node:test";
import {
  getGlobalRoutineTemplateLibrary,
} from "../src/lib/routine-template-library";

test("globalt rutinebibliotek dekker alle støttede bransjer", () => {
  const templates = getGlobalRoutineTemplateLibrary();
  const coveredIndustries = new Set<string>();

  for (const template of templates) {
    for (const industry of template.industryScope) {
      coveredIndustries.add(industry);
    }
  }

  const expectedIndustries = [
    "all",
    "construction",
    "healthcare",
    "transport",
    "manufacturing",
    "retail",
    "hospitality",
    "education",
    "technology",
    "agriculture",
    "other",
  ];

  for (const industry of expectedIndustries) {
    assert.equal(
      coveredIndustries.has(industry),
      true,
      `Mangler rutinemaler for bransje: ${industry}`
    );
  }
});

test("alle rutinemaler har lovreferanse og gjennomforingspunkter", () => {
  const templates = getGlobalRoutineTemplateLibrary();
  assert.equal(templates.length > 0, true);

  for (const template of templates) {
    assert.equal(template.legalReference.trim().length > 0, true);
    assert.equal(template.content.gjennomforing.length > 0, true);
    assert.equal(template.content.ansvar.length > 0, true);
  }
});
