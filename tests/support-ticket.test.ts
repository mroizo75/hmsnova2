import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatSupportTicketNumber } from "../src/features/support/lib/labels";

describe("formatSupportTicketNumber", () => {
  it("pads sequence to four digits", () => {
    assert.equal(formatSupportTicketNumber(2026, 1), "SUP-2026-0001");
    assert.equal(formatSupportTicketNumber(2026, 42), "SUP-2026-0042");
    assert.equal(formatSupportTicketNumber(2026, 1234), "SUP-2026-1234");
  });

  it("uses the given year", () => {
    assert.equal(formatSupportTicketNumber(2030, 7), "SUP-2030-0007");
  });
});
