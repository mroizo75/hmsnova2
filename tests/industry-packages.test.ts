import test from "node:test";
import assert from "node:assert/strict";
import {
  AGRICULTURE_FARM_TYPES,
  getIndustryLabel,
  getIndustryPackage,
} from "../src/lib/industry-packages";

test("getIndustryPackage returnerer landbrukspakke med mobilfokus", () => {
  const industryPackage = getIndustryPackage("agriculture");

  assert.ok(industryPackage);
  assert.equal(industryPackage?.displayName, "Landbruk");
  assert.deepEqual(industryPackage?.simpleMenuHrefs, [
    "/dashboard/incidents",
    "/dashboard/inspections",
    "/dashboard/sja",
  ]);
  assert.equal(AGRICULTURE_FARM_TYPES.length, 6);
});

test("getIndustryPackage og getIndustryLabel håndterer ukjent verdi", () => {
  assert.equal(getIndustryPackage("unknown-industry"), null);
  assert.equal(getIndustryLabel("unknown-industry"), "unknown-industry");
});
