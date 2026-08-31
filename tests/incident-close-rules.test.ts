import test from "node:test";
import assert from "node:assert/strict";
import {
  canCloseIncident,
  getIncidentCloseBlockers,
  INCIDENT_TREATMENT_STATUSES,
} from "../src/lib/incident-close-rules";
import { getIncidentStatusLabel } from "../src/features/incidents/schemas/incident.schema";

test("behandling kan ikke sette lukket — lukking krever årsak og tiltak", () => {
  assert.deepEqual([...INCIDENT_TREATMENT_STATUSES], ["OPEN", "INVESTIGATING", "ACTION_TAKEN"]);
  assert.equal(canCloseIncident({ status: "INVESTIGATING", rootCause: null, measures: [] }), false);
});

test("lukking er blokkert uten årsaksanalyse", () => {
  const blockers = getIncidentCloseBlockers({
    status: "ACTION_TAKEN",
    rootCause: null,
    measures: [{ status: "DONE" }],
  });
  assert.equal(blockers.includes("Årsaksanalyse mangler"), true);
});

test("lukking er blokkert uten gjennomførte tiltak", () => {
  assert.equal(
    canCloseIncident({
      status: "ACTION_TAKEN",
      rootCause: "Rutine for strøing ble ikke fulgt",
      measures: [{ status: "OPEN" }],
    }),
    false
  );
});

test("avvik kan lukkes når årsak er dokumentert og alle tiltak er utført", () => {
  assert.equal(
    canCloseIncident({
      status: "ACTION_TAKEN",
      rootCause: "Rutine for strøing ble ikke fulgt",
      measures: [{ status: "DONE" }, { status: "DONE" }],
    }),
    true
  );
});

test("sluttstatus heter Lukket, ikke behandlet eller ferdig", () => {
  assert.equal(getIncidentStatusLabel("CLOSED"), "Lukket");
  assert.equal(getIncidentStatusLabel("INVESTIGATING"), "Under behandling");
});
