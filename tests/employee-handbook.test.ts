import assert from "node:assert/strict";
import { test } from "node:test";
import {
  employeeHandbookModuleLink,
  groupEmployeeHandbookSections,
  handbookSectionMatchesQuery,
  stripHandbookHtml,
} from "../src/lib/employee-handbook";

test("søk treffer tittel og HTML-innhold uten tagger", () => {
  const section = {
    title: "Avvik, hendelser og forbedring",
    content: "<p>Alle ansatte har <strong>plikt</strong> til å melde avvik.</p>",
    legalRef: "AML § 2-3",
  };
  assert.equal(stripHandbookHtml(section.content), "Alle ansatte har plikt til å melde avvik.");
  assert.equal(handbookSectionMatchesQuery(section, "avvik"), true);
  assert.equal(handbookSectionMatchesQuery(section, "plikt"), true);
  assert.equal(handbookSectionMatchesQuery(section, "ferie"), false);
});

test("ansatt-grupper følger delene kvalitet, HMS og personal", () => {
  const grouped = groupEmployeeHandbookSections([
    { sectionKey: "s4" },
    { sectionKey: "hr-ferie" },
    { sectionKey: "s99" },
  ]);
  assert.deepEqual(grouped.map((group) => group.id), ["KS", "HMS", "HR"]);
  assert.deepEqual(grouped.find((group) => group.id === "KS")?.sections.map((section) => section.sectionKey), ["s4"]);
  assert.deepEqual(grouped.find((group) => group.id === "HMS")?.sections.map((section) => section.sectionKey), ["s4", "s99"]);
  assert.deepEqual(grouped.find((group) => group.id === "HR")?.sections.map((section) => section.sectionKey), ["hr-ferie"]);
});

test("modul-lenker peker til ansatt-flaten, ikke dashboard", () => {
  assert.equal(employeeHandbookModuleLink("s4"), "/ansatt/avvik/ny");
  assert.equal(employeeHandbookModuleLink("s11b"), "/ansatt/varsling");
  assert.equal(employeeHandbookModuleLink("s9"), null);
});
