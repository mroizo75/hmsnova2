import test from "node:test";
import assert from "node:assert/strict";
import {
  isRoutineRecommendedForRequirements,
  partitionRoutineTemplateIds,
  templateIdsToArchive,
} from "../src/lib/regulatory-routine-match";

test("anbefaler mal når kategorien matcher lovkravet", () => {
  const recommended = isRoutineRecommendedForRequirements(
    { category: "AVVIK", legalReference: null },
    ["AVVIK", "BRANN"],
    ["IK-HMS § 5 nr. 7"],
  );
  assert.equal(recommended, true);
});

test("anbefaler mal når lovhjemmel overlapper", () => {
  const recommended = isRoutineRecommendedForRequirements(
    { category: "HMS_STYRING", legalReference: "IK-HMS § 5, AML § 3-1" },
    ["VARSLING"],
    ["IK-HMS § 5 nr. 7", "AML § 3-1 (2) c"],
  );
  assert.equal(recommended, true);
});

test("anbefaler ikke mal uten treff", () => {
  const recommended = isRoutineRecommendedForRequirements(
    { category: "TRANSPORT", legalReference: "Yrkestransportlova" },
    ["AVVIK"],
    ["IK-HMS § 5 nr. 7"],
  );
  assert.equal(recommended, false);
});

test("skiller nye maler fra allerede publiserte", () => {
  const result = partitionRoutineTemplateIds(
    ["a", "b", "c"],
    ["b", "d"],
  );
  assert.deepEqual(result.toPublish, ["a", "c"]);
  assert.deepEqual(result.toKeep, ["b"]);
});

test("finner publiserte maler som skal tas vekk", () => {
  assert.deepEqual(templateIdsToArchive(["a", "b", "c"], ["a"]), ["b", "c"]);
});
