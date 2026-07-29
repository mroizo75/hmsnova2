import test from "node:test";
import assert from "node:assert/strict";
import {
  assertNoManagerCycle,
  resolveIncidentRecipients,
  type IncidentRoutingLookups,
} from "../src/lib/incident-notification-routing";

interface Fixture {
  projectManagers?: Record<string, string | null>;
  managers?: Record<string, string | null>;
  usersByRole?: Record<string, string[]>;
}

function createLookups(fixture: Fixture): IncidentRoutingLookups {
  return {
    async getProjectManagerId(projectId) {
      return fixture.projectManagers?.[projectId] ?? null;
    },
    async getManagerId(userId) {
      return fixture.managers?.[userId] ?? null;
    },
    async getUserIdsByRoles(roles) {
      const ids = roles.flatMap((role) => fixture.usersByRole?.[role] ?? []);
      return Array.from(new Set(ids));
    },
  };
}

const FALLBACK_ROLES = ["ADMIN", "HMS", "LEDER"] as const;

test("prosjektleder har forrang over nærmeste leder", async () => {
  const routing = await resolveIncidentRecipients(
    { reporterId: "tomrer", projectId: "prosjekt-1", fallbackRoles: FALLBACK_ROLES },
    createLookups({
      projectManagers: { "prosjekt-1": "prosjektleder" },
      managers: { tomrer: "avdelingsleder" },
      usersByRole: { HMS: ["hmsk"] },
    })
  );

  assert.equal(routing.source, "PROJECT_MANAGER");
  assert.deepEqual(routing.recipientIds, ["prosjektleder"]);
  assert.deepEqual(routing.copyRecipientIds, ["hmsk"]);
});

test("uten prosjekt går avviket til nærmeste leder", async () => {
  const routing = await resolveIncidentRecipients(
    { reporterId: "tomrer", projectId: null, fallbackRoles: FALLBACK_ROLES },
    createLookups({
      managers: { tomrer: "avdelingsleder" },
      usersByRole: { HMS: ["hmsk"] },
    })
  );

  assert.equal(routing.source, "LINE_MANAGER");
  assert.deepEqual(routing.recipientIds, ["avdelingsleder"]);
});

test("prosjekt uten prosjektleder faller ned til nærmeste leder", async () => {
  const routing = await resolveIncidentRecipients(
    { reporterId: "tomrer", projectId: "prosjekt-1", fallbackRoles: FALLBACK_ROLES },
    createLookups({
      projectManagers: { "prosjekt-1": null },
      managers: { tomrer: "avdelingsleder" },
    })
  );

  assert.equal(routing.source, "LINE_MANAGER");
  assert.deepEqual(routing.recipientIds, ["avdelingsleder"]);
});

test("uten leder i hierarkiet brukes dagens rollevarsling", async () => {
  const routing = await resolveIncidentRecipients(
    { reporterId: "tomrer", projectId: null, fallbackRoles: FALLBACK_ROLES },
    createLookups({
      usersByRole: { ADMIN: ["admin"], HMS: ["hmsk"], LEDER: ["leder"] },
    })
  );

  assert.equal(routing.source, "ROLES");
  assert.deepEqual(routing.recipientIds, ["admin", "hmsk", "leder"]);
  // HMS er allerede hovedmottaker og skal ikke dubleres på kopi
  assert.deepEqual(routing.copyRecipientIds, []);
});

test("melderen utelates både som mottaker og kopimottaker", async () => {
  const routing = await resolveIncidentRecipients(
    { reporterId: "hmsk", projectId: "prosjekt-1", fallbackRoles: FALLBACK_ROLES },
    createLookups({
      // Melderen er selv prosjektleder, så kaskaden må gå videre
      projectManagers: { "prosjekt-1": "hmsk" },
      managers: { hmsk: "regionsleder" },
      usersByRole: { HMS: ["hmsk"] },
    })
  );

  assert.equal(routing.source, "LINE_MANAGER");
  assert.deepEqual(routing.recipientIds, ["regionsleder"]);
  assert.deepEqual(routing.copyRecipientIds, []);
});

test("en ansatt som er sin egen leder faller tilbake til roller", async () => {
  const routing = await resolveIncidentRecipients(
    { reporterId: "leder", projectId: null, fallbackRoles: ["ADMIN"] },
    createLookups({
      managers: { leder: "leder" },
      usersByRole: { ADMIN: ["admin"] },
    })
  );

  assert.equal(routing.source, "ROLES");
  assert.deepEqual(routing.recipientIds, ["admin"]);
});

test("reporterId er påkrevd", async () => {
  await assert.rejects(
    resolveIncidentRecipients(
      { reporterId: "", projectId: null, fallbackRoles: FALLBACK_ROLES },
      createLookups({})
    ),
    /reporterId/
  );
});

test("syklusvakt hindrer at A er leder for B som er leder for A", async () => {
  const managers: Record<string, string | null> = { b: "a" };
  const getManagerId = async (userId: string) => managers[userId] ?? null;

  await assert.rejects(assertNoManagerCycle("a", "b", getManagerId), /ring/);
});

test("syklusvakt hindrer at man blir sin egen leder", async () => {
  await assert.rejects(
    assertNoManagerCycle("a", "a", async () => null),
    /sin egen leder/
  );
});

test("syklusvakt godtar en gyldig kjede", async () => {
  const managers: Record<string, string | null> = {
    prosjektleder: "avdelingsleder",
    avdelingsleder: "regionsleder",
    regionsleder: null,
  };

  await assertNoManagerCycle("tomrer", "prosjektleder", async (userId) => managers[userId] ?? null);
});

test("syklusvakt stopper en uendelig kjede", async () => {
  // Kjeden peker på seg selv uten å treffe utgangspunktet
  await assert.rejects(
    assertNoManagerCycle("tomrer", "leder", async () => "leder"),
    /for dyp/
  );
});
