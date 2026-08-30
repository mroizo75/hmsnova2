import test from "node:test";
import assert from "node:assert/strict";
import {
  isTemperatureDeviation,
  shouldCreateVaremottakAvvik,
  isIkMatIncident,
  IK_MAT_SOURCE,
  IK_MAT_SUBCATEGORY,
} from "../src/lib/ik-mat-avvik";
import { hospitalityCourseKeysForTheme, HOSPITALITY_COURSE_KEYS } from "../src/lib/hospitality-courses";

test("kjølerom utenfor 8 °C er temperaturavvik", () => {
  assert.equal(isTemperatureDeviation("KJOLEROM", 9), true);
  assert.equal(isTemperatureDeviation("KJOLEROM", 4), false);
  assert.equal(isTemperatureDeviation("KJOLEROM", -3), true);
});

test("fryser over −15 °C er temperaturavvik", () => {
  assert.equal(isTemperatureDeviation("FRYSER", -10), true);
  assert.equal(isTemperatureDeviation("FRYSER", -18), false);
});

test("varmholding under 60 °C er temperaturavvik", () => {
  assert.equal(isTemperatureDeviation("VARMHOLDING", 55), true);
  assert.equal(isTemperatureDeviation("VARMHOLDING", 72), false);
});

test("ukjent enhetstype gir ikke avvik", () => {
  assert.equal(isTemperatureDeviation("UKJENT", 99), false);
});

test("varemottak oppretter avvik ved avvisning, merknad eller for høy temp", () => {
  assert.equal(shouldCreateVaremottakAvvik({ accepted: false }), true);
  assert.equal(shouldCreateVaremottakAvvik({ accepted: true, deviationNote: "Skadet emballasje" }), true);
  assert.equal(shouldCreateVaremottakAvvik({ accepted: true, temperature: 11 }), true);
  assert.equal(shouldCreateVaremottakAvvik({ accepted: true, temperature: 4, deviationNote: "" }), false);
});

test("IK-mat-avvik gjenkjennes på kilde og underkategori", () => {
  assert.equal(isIkMatIncident({ projectReference: IK_MAT_SOURCE }), true);
  assert.equal(isIkMatIncident({ subcategoryKeys: JSON.stringify([IK_MAT_SUBCATEGORY.renhold]) }), true);
  assert.equal(isIkMatIncident({ projectReference: "PROSJEKT-12", subcategoryKeys: "[]" }), false);
});

test("tema-filter skiller skjenkekurs fra IK-mat-kurs", () => {
  const skjenking = hospitalityCourseKeysForTheme("skjenking");
  const ikMat = hospitalityCourseKeysForTheme("ik-mat");
  assert.deepEqual(skjenking, [HOSPITALITY_COURSE_KEYS.alcohol]);
  assert.ok(ikMat?.includes(HOSPITALITY_COURSE_KEYS.cleaning));
  assert.ok(ikMat?.includes(HOSPITALITY_COURSE_KEYS.foodSafety));
  assert.equal(ikMat?.includes(HOSPITALITY_COURSE_KEYS.alcohol), false);
  assert.equal(hospitalityCourseKeysForTheme("annet"), null);
});
