import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeRoutineContentFromForm,
  multilineToStringArray,
  toStructuredRoutineContent,
} from "../src/lib/routine-content-model";

test("toStructuredRoutineContent normaliserer lister og strenger", () => {
  const raw = {
    formaal: "A",
    ansvar: ["x", "y"],
    gjennomforing: "en\nto",
  };
  const s = toStructuredRoutineContent(raw);
  assert.equal(s.formaal, "A");
  assert.deepEqual(s.ansvar, ["x", "y"]);
  assert.deepEqual(s.gjennomforing, ["en", "to"]);
});

test("mergeRoutineContentFromForm bygger JSON uten rå JSON.parse", () => {
  const fd = new FormData();
  fd.set("content_formaal", "Mål");
  fd.set("content_ansvar", "Leder\nAnsatt");
  fd.set("content_revisjon", "Årlig");
  const existing = { customKey: 1, formaal: "gammel" };
  const out = mergeRoutineContentFromForm(fd, existing) as Record<string, unknown>;
  assert.equal(out.customKey, 1);
  assert.equal(out.formaal, "Mål");
  assert.deepEqual(out.ansvar, ["Leder", "Ansatt"]);
  assert.equal(out.revisjon, "Årlig");
});

test("multilineToStringArray ignorerer tomme linjer", () => {
  assert.deepEqual(multilineToStringArray(" a \n\n b "), ["a", "b"]);
});
