import test from "node:test";
import assert from "node:assert/strict";
import {
  matchesIndustryScope,
  normalizeIndustry,
  parseIndustryScope,
  toIndustryScopeJson,
} from "../src/lib/industry-scope";

test("matchesIndustryScope returnerer true for all", () => {
  assert.equal(matchesIndustryScope(["all"], "construction"), true);
  assert.equal(matchesIndustryScope(null, "healthcare"), true);
});

test("matchesIndustryScope filtrerer pa tenant-bransje", () => {
  assert.equal(matchesIndustryScope(["construction", "transport"], "construction"), true);
  assert.equal(matchesIndustryScope(["construction", "transport"], "healthcare"), false);
});

test("toIndustryScopeJson normaliserer og dedupliserer", () => {
  assert.deepEqual(toIndustryScopeJson([" Construction ", "construction", "HEALTHCARE"]), [
    "construction",
    "healthcare",
  ]);
});

test("normalizeIndustry og parseIndustryScope handterer tom input", () => {
  assert.equal(normalizeIndustry(" "), null);
  assert.deepEqual(parseIndustryScope(""), ["all"]);
});
