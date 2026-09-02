import assert from "node:assert/strict";
import test from "node:test";
import {
  BINDING_MONTHS,
  CONTRACT_BINDING_LABEL,
  CONTRACT_DOCUMENT_VERSION,
  CONTRACT_TERMS_LABEL,
  CONTRACT_WITHDRAWAL_LABEL,
  NOTICE_MONTHS,
  WITHDRAWAL_DAYS,
  getBindingStart,
  getWithdrawalDeadline,
} from "../src/lib/contract-terms";

test("angrefrist er 14 kalenderdager og binding starter dagen etter", () => {
  const acceptedAt = new Date(2026, 8, 1, 10, 0, 0);
  const deadline = getWithdrawalDeadline(acceptedAt);
  const bindingStart = getBindingStart(acceptedAt);

  assert.equal(WITHDRAWAL_DAYS, 14);
  assert.equal(BINDING_MONTHS, 12);
  assert.equal(NOTICE_MONTHS, 3);
  assert.equal(deadline.getFullYear(), 2026);
  assert.equal(deadline.getMonth(), 8);
  assert.equal(deadline.getDate(), 15);
  assert.equal(bindingStart.getFullYear(), 2026);
  assert.equal(bindingStart.getMonth(), 8);
  assert.equal(bindingStart.getDate(), 16);
  assert.ok(bindingStart.getTime() > deadline.getTime());
});

test("avhukingstekster er eksplisitte om binding og at det ikke er prøveperiode", () => {
  assert.ok(CONTRACT_WITHDRAWAL_LABEL.includes("ikke en gratis prøveperiode"));
  assert.ok(CONTRACT_WITHDRAWAL_LABEL.includes("14 kalenderdager"));
  assert.ok(CONTRACT_BINDING_LABEL.includes("12 måneder"));
  assert.ok(CONTRACT_BINDING_LABEL.includes("3 måneders"));
  assert.ok(CONTRACT_BINDING_LABEL.includes("ikke kjente til"));
  assert.ok(CONTRACT_TERMS_LABEL.includes("avtaleloven § 1"));
  assert.ok(CONTRACT_DOCUMENT_VERSION.length > 0);
});
