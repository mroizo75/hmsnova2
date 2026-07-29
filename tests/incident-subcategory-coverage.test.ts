import test from "node:test";
import assert from "node:assert/strict";
import { INCIDENT_SUBCATEGORY_DEFAULTS } from "../prisma/seed-incident-subcategories";
import {
  AVVIK_ONLY_GROUPS,
  RUH_MODE_GROUPS,
} from "../src/features/incidents/schemas/incident.schema";

const selectableTypes = new Set(
  [...RUH_MODE_GROUPS, ...AVVIK_ONLY_GROUPS].flatMap((definition) => definition.types)
);

test("hver valgbar hendelsestype har underkategorier som gjelder alle bransjer", () => {
  for (const type of selectableTypes) {
    const generalOptions = INCIDENT_SUBCATEGORY_DEFAULTS.filter(
      (option) => option.incidentType === type && option.industry === "GENERELL"
    );
    assert.ok(
      generalOptions.length > 0,
      `Typen ${type} mangler underkategorier med bransje GENERELL`
    );
  }
});

test("underkategorinøkler er unike per hendelsestype", () => {
  const seen = new Set<string>();
  for (const option of INCIDENT_SUBCATEGORY_DEFAULTS) {
    const identifier = `${option.incidentType}:${option.key}`;
    assert.ok(!seen.has(identifier), `Duplikat underkategori: ${identifier}`);
    seen.add(identifier);
  }
});

test("bransjespesifikke underkategorier bruker kjente bransjekoder", () => {
  const knownScopes = new Set(["GENERELL", "BYGG", "HELSE", "TRANSPORT", "OFFSHORE", "ATEX"]);
  for (const option of INCIDENT_SUBCATEGORY_DEFAULTS) {
    assert.ok(
      knownScopes.has(option.industry),
      `Ukjent bransjekode ${option.industry} på ${option.key}`
    );
  }
});
