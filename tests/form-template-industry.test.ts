import test from "node:test";
import assert from "node:assert/strict";
import { tenantCanUseGlobalFormTemplate } from "../src/lib/form-template-industry";

test("tenantCanUseGlobalFormTemplate: egne skjemaer alltid synlige", () => {
  assert.equal(
    tenantCanUseGlobalFormTemplate(
      { isGlobal: false, tenantId: "t1", industryScope: ["construction"] },
      "healthcare",
      {}
    ),
    true
  );
});

test("tenantCanUseGlobalFormTemplate: global med all-templates visning", () => {
  assert.equal(
    tenantCanUseGlobalFormTemplate(
      { isGlobal: true, tenantId: null, industryScope: ["construction"] },
      "healthcare",
      { allTemplatesView: true }
    ),
    true
  );
});

test("tenantCanUseGlobalFormTemplate: global filtrert på bransje", () => {
  assert.equal(
    tenantCanUseGlobalFormTemplate(
      { isGlobal: true, tenantId: null, industryScope: ["construction"] },
      "construction",
      {}
    ),
    true
  );
  assert.equal(
    tenantCanUseGlobalFormTemplate(
      { isGlobal: true, tenantId: null, industryScope: ["construction"] },
      "healthcare",
      {}
    ),
    false
  );
});
