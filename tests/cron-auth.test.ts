import test from "node:test";
import assert from "node:assert/strict";
import { isCronAuthorized } from "../src/lib/cron-auth";

test("isCronAuthorized krever korrekt bearer-secret", () => {
  assert.equal(isCronAuthorized("Bearer secret123", "secret123"), true);
  assert.equal(isCronAuthorized("Bearer wrong", "secret123"), false);
  assert.equal(isCronAuthorized(null, "secret123"), false);
  assert.equal(isCronAuthorized("Bearer secret123", undefined), false);
});
