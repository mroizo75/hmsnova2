import test from "node:test";
import assert from "node:assert/strict";
import { validateElectroUploadFile } from "../src/lib/electro-upload";

test("validateElectroUploadFile accepts PDF", () => {
  assert.equal(
    validateElectroUploadFile({ size: 100, type: "application/pdf", name: "a.pdf" }),
    null
  );
});

test("validateElectroUploadFile rejects oversize", () => {
  const err = validateElectroUploadFile({
    size: 26 * 1024 * 1024,
    type: "application/pdf",
    name: "big.pdf",
  });
  assert.ok(err);
  assert.equal(err?.code, "FILE_TOO_LARGE");
});

test("validateElectroUploadFile rejects bad mime", () => {
  const err = validateElectroUploadFile({
    size: 10,
    type: "application/zip",
    name: "x.zip",
  });
  assert.ok(err);
  assert.equal(err?.code, "UNSUPPORTED_TYPE");
});
