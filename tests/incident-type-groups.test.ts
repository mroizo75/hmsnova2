import test from "node:test";
import assert from "node:assert/strict";
import {
  getIncidentTypeGroup,
  getIncidentTypeGroups,
  getIncidentTypeLabel,
  getIncidentTypesForGroup,
  getSingleTypeForGroup,
} from "../src/features/incidents/schemas/incident.schema";

test("RUH på gir to grupper: Avvik og RUH", () => {
  const groups = getIncidentTypeGroups(true).map((definition) => definition.group);
  assert.deepEqual(groups, ["AVVIK", "RUH"]);
});

test("RUH av gir fire grupper: HMS, Kvalitet, Miljø og Kundeklage", () => {
  const groups = getIncidentTypeGroups(false).map((definition) => definition.group);
  assert.deepEqual(groups, ["HMS", "KVALITET", "MILJO", "CUSTOMER"]);
});

test("HMS-gruppen dekker meldepliktige hendelser etter AML § 5-2", () => {
  const types = getIncidentTypesForGroup("HMS", false);
  assert.deepEqual([...types], ["HMS", "ULYKKE", "NESTEN", "FARLIG_SITUASJON", "YRKESSYKDOM"]);
});

test("Avvik-gruppen tilbyr fagområder, ikke den generelle Avvik-typen", () => {
  const types = getIncidentTypesForGroup("AVVIK", true);
  assert.deepEqual([...types], ["HMS", "KVALITET", "MILJO", "CUSTOMER"]);
});

test("grupper med bare én type hopper over typevalget", () => {
  assert.equal(getSingleTypeForGroup("KVALITET", false), "KVALITET");
  assert.equal(getSingleTypeForGroup("MILJO", false), "MILJO");
  assert.equal(getSingleTypeForGroup("CUSTOMER", false), "CUSTOMER");
  assert.equal(getSingleTypeForGroup("HMS", false), null);
});

test("gruppene i RUH-modus krever typevalg i begge grener", () => {
  assert.equal(getSingleTypeForGroup("AVVIK", true), null);
  assert.equal(getSingleTypeForGroup("RUH", true), null);
});

test("en type finner tilbake til gruppen sin i begge oppsett", () => {
  assert.equal(getIncidentTypeGroup("ULYKKE", true), "RUH");
  assert.equal(getIncidentTypeGroup("ULYKKE", false), "HMS");
  assert.equal(getIncidentTypeGroup("KVALITET", true), "AVVIK");
  assert.equal(getIncidentTypeGroup("KVALITET", false), "KVALITET");
});

test("eldre typer finner gruppen sin selv om de ikke kan velges", () => {
  assert.equal(getIncidentTypeGroup("AVVIK", true), "AVVIK");
  assert.equal(getIncidentTypeGroup("AVVIK", false), "HMS");
  assert.equal(getIncidentTypeGroup("SKADE", true), "RUH");
  assert.equal(getIncidentTypeGroup("SKADE", false), "HMS");
});

test("tom type gir ingen gruppe", () => {
  assert.equal(getIncidentTypeGroup("", true), null);
  assert.equal(getIncidentTypeGroup("", false), null);
});

test("farlig situasjon merkes også som observasjon", () => {
  assert.equal(getIncidentTypeLabel("FARLIG_SITUASJON"), "Farlig situasjon / observasjon");
});
