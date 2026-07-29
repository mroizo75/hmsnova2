import test from "node:test";
import assert from "node:assert/strict";
import {
  PROJECT_REFERENCE_MAX_LENGTH,
  matchProjectByReference,
  normalizeProjectReference,
  resolveProjectIdFromReference,
  type ProjectReferenceCandidate,
} from "../src/lib/incident-project-reference";

function lookupsFor(candidates: ProjectReferenceCandidate[]) {
  return {
    async findProjectsByReference() {
      return candidates;
    },
  };
}

test("normalisering trimmer, kollapser mellomrom og tomme verdier blir null", () => {
  assert.equal(normalizeProjectReference("  24-1187  "), "24-1187");
  assert.equal(normalizeProjectReference("Storgata   12"), "Storgata 12");
  assert.equal(normalizeProjectReference("   "), null);
  assert.equal(normalizeProjectReference(""), null);
  assert.equal(normalizeProjectReference(undefined), null);
  assert.equal(normalizeProjectReference(42), null);
});

test("normalisering kutter referanser som er for lange", () => {
  const value = "9".repeat(PROJECT_REFERENCE_MAX_LENGTH + 50);
  assert.equal(normalizeProjectReference(value)?.length, PROJECT_REFERENCE_MAX_LENGTH);
});

test("referanse kobles til prosjekt via prosjektkode", async () => {
  const projectId = await resolveProjectIdFromReference(
    "24-1187",
    lookupsFor([{ id: "prosjekt-1", code: "24-1187", orderNumber: null }])
  );
  assert.equal(projectId, "prosjekt-1");
});

test("referanse kobles til prosjekt via ordrenummer", async () => {
  const projectId = await resolveProjectIdFromReference(
    "ORD-5540",
    lookupsFor([{ id: "prosjekt-2", code: null, orderNumber: "ORD-5540" }])
  );
  assert.equal(projectId, "prosjekt-2");
});

test("matching ignorerer store bokstaver og skilletegn", () => {
  const candidates: ProjectReferenceCandidate[] = [
    { id: "prosjekt-3", code: "PRJ-001", orderNumber: null },
  ];
  assert.equal(matchProjectByReference("prj 001", candidates), "prosjekt-3");
  assert.equal(matchProjectByReference("PRJ001", candidates), "prosjekt-3");
});

test("adresse uten treff gir ingen prosjektkobling", async () => {
  const projectId = await resolveProjectIdFromReference("Storgata 12", lookupsFor([]));
  assert.equal(projectId, null);
});

test("tvetydige treff kobles ikke automatisk", () => {
  const candidates: ProjectReferenceCandidate[] = [
    { id: "prosjekt-4", code: "100", orderNumber: null },
    { id: "prosjekt-5", code: null, orderNumber: "100" },
  ];
  assert.equal(matchProjectByReference("100", candidates), null);
});

test("tom referanse slår ikke opp i det hele tatt", async () => {
  let calls = 0;
  const projectId = await resolveProjectIdFromReference("   ", {
    async findProjectsByReference() {
      calls += 1;
      return [];
    },
  });
  assert.equal(projectId, null);
  assert.equal(calls, 0);
});
