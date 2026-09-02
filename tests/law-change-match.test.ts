import assert from "node:assert/strict";
import test from "node:test";
import {
  extractLovtidendAnnouncements,
  matchAnnouncement,
  tenantIsAffected,
  type TrackedLegalItem,
} from "../src/lib/law-change-match";

const tracked = {
  references: [
    {
      id: "ref-aml",
      title: "Arbeidsmiljøloven",
      industries: ["all"],
    },
  ] satisfies TrackedLegalItem[],
  requirements: [
    {
      id: "req-ik",
      title: "Systematisk HMS-arbeid (internkontroll)",
      legalBasis: "Internkontrollforskriften § 5",
      industries: ["all"],
    },
  ] satisfies TrackedLegalItem[],
};

test("parser henter kunngjøringer fra Lovtidend-HTML", () => {
  const html = `
    <a href="/dokument/LTI/forskrift/2026-09-01-1715">Forskrift om endring i arbeidsmiljøforskriftene</a>
    FOR-2026-09-01-1715 Arbeids- og inkluderingsdepartementet
  `;
  const items = extractLovtidendAnnouncements(html);
  assert.equal(items.length, 1);
  assert.equal(items[0].externalId, "FOR-2026-09-01-1715");
  assert.equal(items[0].source, "LOVTIDEND");
});

test("matcher HMS-relevante kunngjøringer og ignorerer irrelevante", () => {
  const relevant = matchAnnouncement(
    {
      source: "LOVTIDEND",
      externalId: "FOR-1",
      title: "Forskrift om endring i internkontrollforskriften",
      sourceUrl: "https://lovdata.no/x",
    },
    tracked
  );
  assert.ok(relevant);
  assert.equal(relevant.matchedKeywords.includes("internkontroll"), true);

  const ignored = matchAnnouncement(
    {
      source: "LOVTIDEND",
      externalId: "FOR-2",
      title: "Forskrift om endring i forskrift om kvoteplikt for torsk",
      sourceUrl: "https://lovdata.no/y",
    },
    tracked
  );
  assert.equal(ignored, null);
});

test("tenantIsAffected respekterer all og bransje", () => {
  assert.equal(tenantIsAffected("office", ["all"]), true);
  assert.equal(tenantIsAffected("construction", ["construction"]), true);
  assert.equal(tenantIsAffected("office", ["construction"]), false);
  assert.equal(tenantIsAffected(null, ["construction"]), false);
});
