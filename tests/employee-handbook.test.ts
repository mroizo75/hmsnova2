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

test("ansatt-grupper følger ISO-kapitlene med felles nummer", () => {
  const grouped = groupEmployeeHandbookSections([
    { sectionKey: "s4" },
    { sectionKey: "hr-ferie" },
    { sectionKey: "s99", sectionNumber: "5.9", sortOrder: 575 },
  ]);
  assert.deepEqual(grouped.map((group) => group.id), ["5", "7", "8"]);
  assert.equal(grouped.find((group) => group.id === "7")?.sections[0]?.sectionNumber, "7.1");
  assert.deepEqual(grouped.find((group) => group.id === "5")?.sections.map((section) => section.sectionKey), ["s99"]);
  assert.deepEqual(grouped.find((group) => group.id === "8")?.sections.map((section) => section.sectionKey), ["hr-ferie"]);
});

test("modul-lenker peker til ansatt-flaten, ikke dashboard", () => {
  assert.equal(employeeHandbookModuleLink("s4"), "/ansatt/avvik/ny");
  assert.equal(employeeHandbookModuleLink("s11b"), "/ansatt/varsling");
  assert.equal(employeeHandbookModuleLink("s9"), null);
});
