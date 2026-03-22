import test from "node:test";
import assert from "node:assert/strict";
import { getPermissions, getVisibleNavItems } from "../src/lib/permissions";

test("leder kan lese og administrere rutiner", () => {
  const permissions = getPermissions("LEDER");
  assert.equal(permissions.canReadRoutines, true);
  assert.equal(permissions.canCreateRoutines, true);
  assert.equal(permissions.canManageRoutines, true);
});

test("ansatt ser rutiner i navigasjon men kan ikke administrere", () => {
  const permissions = getPermissions("ANSATT");
  const visible = getVisibleNavItems("ANSATT");

  assert.equal(permissions.canReadRoutines, true);
  assert.equal(permissions.canCreateRoutines, false);
  assert.equal(visible.routines, true);
});
