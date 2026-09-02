import test from "node:test";
import assert from "node:assert/strict";
import { getPermissions, getVisibleNavItems } from "../src/lib/permissions";
import {
  canHandleWhistleblowingCases,
  canViewWhistleblowingContent,
  canViewWhistleblowingInbox,
  toWhistleblowingInboxView,
} from "../src/lib/whistleblowing-access";
import {
  resolveCaseAccess,
  toCaseViewDto,
  toMeasureRecipientDto,
  toPublicTrackView,
  isGrantActive,
  resolveBreakGlassTargetCase,
} from "../src/lib/whistleblowing-case-access";
import { evaluateImpartiality } from "../src/lib/whistleblowing-impartiality";
import { DEFAULT_ASSIST_OBJECTS, parseAccessObjects, stringifyAccessObjects } from "../src/lib/whistleblowing-objects";
import { generateTotpSecret, totpCode, verifyTotp } from "../src/lib/totp";
import { createStepUpToken, verifyStepUpToken } from "../src/lib/whistleblow-stepup";

test("kun varslingsansvarlig ser innboks og behandler innhold", () => {
  assert.equal(canViewWhistleblowingInbox("ADMIN"), false);
  assert.equal(canViewWhistleblowingInbox("HMS"), false);
  assert.equal(canViewWhistleblowingInbox("VARSLINGSANSVARLIG"), true);
  assert.equal(canViewWhistleblowingInbox("LEDER"), false);

  assert.equal(canViewWhistleblowingContent("ADMIN"), false);
  assert.equal(canViewWhistleblowingContent("VARSLINGSANSVARLIG"), true);
  assert.equal(canHandleWhistleblowingCases("ADMIN"), false);
  assert.equal(canHandleWhistleblowingCases("VARSLINGSANSVARLIG"), true);
});

test("admin ser ikke varsling i menyen", () => {
  const nav = getVisibleNavItems("ADMIN");
  assert.equal(nav.whistleblowing, false);
  assert.equal(getVisibleNavItems("VARSLINGSANSVARLIG").whistleblowing, true);
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
  assert.equal("title" in inbox, false);
  assert.equal("reporterName" in inbox, false);
});

test("grant gir kun valgte objekter og identitet er av som standard ved bistand", () => {
  const objects = parseAccessObjects(stringifyAccessObjects(DEFAULT_ASSIST_OBJECTS));
  assert.deepEqual(objects, ["ORIGINAL"]);
  assert.equal(objects.includes("IDENTITY"), false);

  const decision = resolveCaseAccess({
    actor: { userId: "u2", role: "LEDER" },
    accusedUserIds: [],
    grants: [
      {
        id: "g1",
        granteeId: "u2",
        type: "ASSIST",
        objects: stringifyAccessObjects(["ORIGINAL"]),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      },
    ],
  });
  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.objects, ["ORIGINAL"]);
});

test("omvarslet kan ikke tildeles saken som saksbehandler", () => {
  const result = evaluateImpartiality({
    candidateUserId: "accused-1",
    accusedUserIds: ["accused-1"],
  });
  assert.equal(result.blocked, true);
  assert.equal(result.warnings[0]?.code, "ACCUSED");
});

test("varslingsansvarlig som er omvarslet mister innholdstilgang", () => {
  const decision = resolveCaseAccess({
    actor: { userId: "handler", role: "VARSLINGSANSVARLIG" },
    accusedUserIds: ["handler"],
    grants: [],
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "INHABILE");
});

test("tiltak-DTO inneholder ikke whistleblowingId eller identitet", () => {
  const dto = toMeasureRecipientDto({
    id: "m1",
    title: "Gjennomfør opplæring",
    description: "Personopplysninger",
    dueAt: null,
    status: "PENDING",
    completedAt: null,
    completionNote: null,
  });
  assert.equal("whistleblowingId" in dto, false);
  assert.equal(dto.title, "Gjennomfør opplæring");
});

test("admin, konsern og superadmin uten grant får avslag", () => {
  for (const actor of [
    { userId: "a", role: "ADMIN" },
    { userId: "h", role: "HMS" },
    { userId: "s", isSuperAdmin: true },
    { userId: "p", isSupport: true },
  ]) {
    const decision = resolveCaseAccess({
      actor,
      accusedUserIds: [],
      grants: [],
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "DENIED");
  }
});

test("utløpt grant avvises", () => {
  assert.equal(
    isGrantActive({
      id: "g",
      granteeId: "u",
      type: "ASSIGN",
      objects: "[]",
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    }),
    false,
  );
});

test("stripped DTO skjuler identitet uten IDENTITY-objekt", () => {
  const view = toCaseViewDto({
    decision: { allowed: true, reason: "GRANT", objects: ["ORIGINAL"] },
    report: {
      id: "c1",
      caseNumber: "VAR-1",
      category: "ETHICS",
      title: "Tittel",
      description: "Tekst",
      occurredAt: null,
      location: null,
      involvedPersons: null,
      witnesses: null,
      isAnonymous: false,
      status: "RECEIVED",
      severity: "HIGH",
      receivedAt: new Date(),
      acknowledgedAt: null,
      investigatedAt: null,
      closedAt: null,
      investigationNotes: "hemmelig",
      outcome: null,
      closedReason: "intern",
      assignedTo: "x",
      handledBy: "y",
      attachments: "file",
    },
    identity: { reporterName: "Ola", reporterEmail: "ola@test.no", reporterPhone: "1" },
  });
  assert.equal(view.identity, null);
  assert.equal(view.notes, null);
  assert.equal(view.original?.title, "Tittel");
  assert.equal(view.closedReason, null);
});

test("TOTP-kode valideres", () => {
  const secret = generateTotpSecret();
  const code = totpCode(secret);
  assert.equal(verifyTotp(secret, code), true);
  assert.equal(verifyTotp(secret, "000000"), false);
});

test("step-up-token utløper", () => {
  const token = createStepUpToken("user-1", 1_000);
  assert.equal(verifyStepUpToken(token, "user-1", 1_000 + 16 * 60 * 1000), false);
  assert.equal(verifyStepUpToken(token, "user-1", 1_000 + 60_000), true);
  assert.equal(verifyStepUpToken(token, "other", 1_000 + 60_000), false);
});

test("break-glass uten godkjenning avvises", () => {
  const decision = resolveCaseAccess({
    actor: { userId: "support", isSupport: true },
    accusedUserIds: [],
    grants: [
      {
        id: "g",
        granteeId: "support",
        type: "BREAK_GLASS",
        objects: stringifyAccessObjects(["ORIGINAL"]),
        expiresAt: new Date(Date.now() + 10_000),
        revokedAt: new Date(),
      },
    ],
  });
  assert.equal(decision.allowed, false);
});

test("godkjent break-glass-grant gir support tidsbegrenset innsyn", () => {
  const decision = resolveCaseAccess({
    actor: { userId: "support", isSupport: true },
    accusedUserIds: [],
    grants: [
      {
        id: "g",
        granteeId: "support",
        type: "BREAK_GLASS",
        objects: stringifyAccessObjects(["ORIGINAL", "NOTES"]),
        expiresAt: new Date(Date.now() + 10_000),
        revokedAt: null,
      },
    ],
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.grantType, "BREAK_GLASS");
});

test("break-glass uten saks-ID kan ikke knyttes", () => {
  assert.equal(resolveBreakGlassTargetCase(null, null), null);
  assert.equal(resolveBreakGlassTargetCase("case-1", null), "case-1");
  assert.equal(resolveBreakGlassTargetCase(null, "case-2"), "case-2");
});

test("track-visning fjerner closedReason, notater og tiltak-JSON", () => {
  const publicData = toPublicTrackView({
    id: "c1",
    caseNumber: "VAR-1",
    status: "CLOSED",
    closedReason: "intern",
    investigationNotes: "hemmelig",
    outcome: "utfall",
    attachments: "fil",
    actions: "[{}]",
    handledBy: "x",
    assignedTo: "y",
    title: "Tittel",
  });
  assert.equal("closedReason" in publicData, false);
  assert.equal("investigationNotes" in publicData, false);
  assert.equal("actions" in publicData, false);
  assert.equal("outcome" in publicData, false);
  assert.equal(publicData.caseNumber, "VAR-1");
  assert.equal(publicData.title, "Tittel");
});

test("varslingsansvarlig har begrenset HMS-meny utenom varsling", () => {
  const perms = getPermissions("VARSLINGSANSVARLIG");
  assert.equal(perms.canAccessDashboard, true);
  assert.equal(perms.canReadIncidents, false);
  const nav = getVisibleNavItems("VARSLINGSANSVARLIG");
  assert.equal(nav.whistleblowing, true);
  assert.equal(nav.incidents, false);
});
