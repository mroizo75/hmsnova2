import test from "node:test";
import assert from "node:assert/strict";
import { getPermissions, getRoleDisplayName } from "../src/lib/permissions";
import {
  canHandleWhistleblowingCases,
  canViewWhistleblowingContent,
  canViewWhistleblowingInbox,
  toWhistleblowingInboxView,
} from "../src/lib/whistleblowing-access";

test("kun varslingsansvarlig ser og behandler innhold i varsling", () => {
  assert.equal(canViewWhistleblowingInbox("ADMIN"), true);
  assert.equal(canViewWhistleblowingInbox("HMS"), true);
  assert.equal(canViewWhistleblowingInbox("VARSLINGSANSVARLIG"), true);
  assert.equal(canViewWhistleblowingInbox("LEDER"), false);

  assert.equal(canViewWhistleblowingContent("ADMIN"), false);
  assert.equal(canViewWhistleblowingContent("HMS"), false);
  assert.equal(canViewWhistleblowingContent("LEDER"), false);
  assert.equal(canViewWhistleblowingContent("VARSLINGSANSVARLIG"), true);

  assert.equal(canHandleWhistleblowingCases("ADMIN"), false);
  assert.equal(canHandleWhistleblowingCases("HMS"), false);
  assert.equal(canHandleWhistleblowingCases("VARSLINGSANSVARLIG"), true);
});

test("varslingsansvarlig har begrenset HMS-meny utenom varsling", () => {
  const perms = getPermissions("VARSLINGSANSVARLIG");
  assert.equal(perms.canAccessDashboard, true);
  assert.equal(perms.canViewWhistleblowingContent, true);
  assert.equal(perms.canReadIncidents, false);
  assert.equal(perms.canReadDocuments, false);
  assert.equal(perms.canUpdateSettings, false);
  assert.equal(getRoleDisplayName("VARSLINGSANSVARLIG"), "Varslingsansvarlig");
});

test("innboks-visning fjerner innhold, identitet og vedlegg", () => {
  const inbox = toWhistleblowingInboxView({
    id: "wb-1",
    caseNumber: "VAR-2026-001",
    status: "RECEIVED",
    receivedAt: new Date("2026-08-30"),
    closedAt: null,
    isAnonymous: true,
    title: "Hemmelig tittel",
    description: "Full tekst",
    reporterName: "Ola Nordmann",
  } as { id: string; caseNumber: string; status: string; receivedAt: Date; closedAt: Date | null; isAnonymous: boolean; title: string; description: string; reporterName: string });

  assert.equal(inbox.caseNumber, "VAR-2026-001");
  assert.equal(inbox.status, "RECEIVED");
  assert.equal("title" in inbox, false);
  assert.equal("description" in inbox, false);
  assert.equal("reporterName" in inbox, false);
});
