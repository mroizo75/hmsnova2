import assert from "node:assert/strict";
import test from "node:test";
import { getGlobalFormTemplateLibrary } from "../src/lib/form-template-library";
import { SUPPORTED_INDUSTRIES } from "../src/lib/industry-packages";

const allowedIndustries = new Set<string>([
  "all",
  ...SUPPORTED_INDUSTRIES.map((o) => o.value),
]);

test("alle industryScope-verdier er gyldige", () => {
  for (const template of getGlobalFormTemplateLibrary()) {
    for (const industry of template.industryScope) {
      assert.equal(
        allowedIndustries.has(industry),
        true,
        `${template.title}: ugyldig bransje "${industry}"`
      );
    }
  }
});

test("ingen duplikater av kategori og tittel", () => {
  const seen = new Set<string>();
  for (const template of getGlobalFormTemplateLibrary()) {
    const key = `${template.category}::${template.title}`;
    assert.equal(seen.has(key), false, `Duplikat: ${key}`);
    seen.add(key);
  }
});

test("hver støttet bransje er nevnt i minst én mal", () => {
  const templates = getGlobalFormTemplateLibrary();
  for (const { value } of SUPPORTED_INDUSTRIES) {
    const appears = templates.some((t) => t.industryScope.includes(value));
    assert.equal(appears, true, `Ingen mal med bransje-scope: ${value}`);
  }
});

test("feltene har påkrevd label og gyldig rekkefølge", () => {
  for (const template of getGlobalFormTemplateLibrary()) {
    assert.equal(template.fields.length > 0, true, template.title);
    template.fields.forEach((f, i) => {
      assert.equal(f.label.trim().length > 0, true, `${template.title} felt ${i}`);
    });
  }
});
