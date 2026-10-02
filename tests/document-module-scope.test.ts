import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  documentKindsForForm,
  filterDistributableDocumentTemplates,
  filterDistributableFormTemplates,
  isDistributableDocumentKind,
  isModuleOwnedDocumentCategory,
} from "../src/lib/document-module-scope";

describe("document module scope", () => {
  it("keeps BCM and HR out of the documents module", () => {
    assert.equal(isModuleOwnedDocumentCategory("BCM"), true);
    assert.equal(isModuleOwnedDocumentCategory("QUALITY"), false);
    assert.deepEqual(
      filterDistributableDocumentTemplates([
        { category: "BCM" },
        { category: "HR" },
        { category: null },
      ]),
      [{ category: null }],
    );
    assert.deepEqual(
      filterDistributableFormTemplates([{ category: "BCM" }, { category: "CHECKLIST" }]),
      [{ category: "CHECKLIST" }],
    );
  });

  it("limits new documents to distributable kinds", () => {
    assert.equal(isDistributableDocumentKind("PROCEDURE"), true);
    assert.equal(isDistributableDocumentKind("SDS"), false);
    assert.equal(isDistributableDocumentKind("CHECKLIST"), false);
    assert.deepEqual(documentKindsForForm(), ["LAW", "PROCEDURE", "PLAN", "OTHER"]);
    assert.deepEqual(documentKindsForForm("SDS"), ["LAW", "PROCEDURE", "PLAN", "OTHER", "SDS"]);
  });
});
