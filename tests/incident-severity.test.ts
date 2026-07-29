import test from "node:test";
import assert from "node:assert/strict";
import {
  createIncidentSchema,
  getSeverityInfo,
  updateIncidentSchema,
} from "../src/features/incidents/schemas/incident.schema";

const validIncident = {
  tenantId: "clx0000000000000000000000",
  type: "AVVIK" as const,
  title: "Løs stige i trapperom",
  description: "Stigen sto ubundet i trapperommet og kunne velte over forbipasserende.",
  occurredAt: new Date("2026-07-01T08:00:00Z"),
  reportedBy: "clx0000000000000000000001",
};

test("alvorlighetsgrad kan utelates ved registrering", () => {
  const parsed = createIncidentSchema.parse(validIncident);
  assert.equal(parsed.severity, undefined);
});

test("alvorlighetsgrad kan sendes som null når leder skal vurdere senere", () => {
  const parsed = createIncidentSchema.parse({ ...validIncident, severity: null });
  assert.equal(parsed.severity, null);
});

test("alvorlighetsgrad utenfor 1-5 avvises fortsatt", () => {
  assert.throws(() => createIncidentSchema.parse({ ...validIncident, severity: 0 }));
  assert.throws(() => createIncidentSchema.parse({ ...validIncident, severity: 6 }));
});

test("oppdatering kan nullstille alvorlighetsgrad", () => {
  const parsed = updateIncidentSchema.parse({
    id: "clx0000000000000000000002",
    severity: null,
  });
  assert.equal(parsed.severity, null);
});

test("getSeverityInfo merker null og undefined som ikke vurdert", () => {
  assert.equal(getSeverityInfo(null).label, "Ikke vurdert");
  assert.equal(getSeverityInfo(undefined).label, "Ikke vurdert");
});

test("getSeverityInfo beholder gradene 1-5", () => {
  assert.equal(getSeverityInfo(5).label, "Kritisk");
  assert.equal(getSeverityInfo(4).label, "Alvorlig");
  assert.equal(getSeverityInfo(3).label, "Moderat");
  assert.equal(getSeverityInfo(2).label, "Mindre");
  assert.equal(getSeverityInfo(1).label, "Ubetydelig");
});

test("ikke vurdert regnes ikke som kritisk", () => {
  // Speiler (severity ?? 0) >= 5 i varslingslogikken
  const isCritical = (severity: number | null) => (severity ?? 0) >= 5;
  assert.equal(isCritical(null), false);
  assert.equal(isCritical(5), true);
});
