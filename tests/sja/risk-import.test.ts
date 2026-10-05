import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractJsonObject,
  parseRiskImportResponse,
} from "../../src/features/risks/lib/risk-import";

describe("risikovurderingsimport", () => {
  it("parser et strukturert AI-utkast fra en kodeblokk", () => {
    const result = parseRiskImportResponse(`\`\`\`json
{
  "title": "Risikovurdering verksted",
  "assessmentYear": 2026,
  "participants": "Verneombud og arbeidsleder",
  "rows": [{
    "title": "Klemfare ved maskin",
    "context": "Arbeid ved roterende maskin",
    "description": null,
    "riskStatement": "Klemskade",
    "likelihood": 2,
    "consequence": 4,
    "category": "SAFETY",
    "existingControls": "Vernedeksel",
    "measures": ["Kontroller nødstopp"],
    "confidence": 0.9,
    "missingFields": []
  }]
}
\`\`\``);

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]?.likelihood, 2);
    assert.equal(result.rows[0]?.category, "SAFETY");
  });

  it("avviser svar uten et JSON-objekt", () => {
    assert.throws(
      () => extractJsonObject("Jeg fant ingen risikopunkter."),
      /gyldig JSON/,
    );
  });
});
