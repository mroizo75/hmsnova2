import test from "node:test";
import assert from "node:assert/strict";
import { Role } from "@prisma/client";
import {
  applyModuleVisibility,
  canRoleAccessModule,
  getEffectivePermissions,
  isNavItemAllowedByModuleVisibility,
  MODULE_DEFAULTS,
  parseModuleVisibilityConfig,
  type ModuleVisibilityConfig,
} from "../src/lib/module-visibility";
import { getPermissions } from "../src/lib/permissions";

test("null-config bruker MODULE_DEFAULTS – ikke ubegrenset tilgang", () => {
  // LEDER er i defaults for incidents, ANSATT er ikke
  assert.equal(canRoleAccessModule(null, "incidents", "LEDER"), true);
  assert.equal(canRoleAccessModule(null, "incidents", "ANSATT"), false);

  const ansatt = applyModuleVisibility(getPermissions("ANSATT"), null, "ANSATT");
  assert.equal(ansatt.canReadIncidents, false);
  // Egne avvik skal fortsatt være synlige (canReadOwn* styres ikke av modul-synlighet)
  assert.equal(ansatt.canReadOwnIncidents, true);
  assert.equal(ansatt.canCreateIncidents, true);
});

test("tom config {} oppfører seg som MODULE_DEFAULTS for manglende nøkler", () => {
  const leder = getEffectivePermissions("LEDER", {});
  assert.equal(leder.canReadIncidents, true);

  const ansatt = getEffectivePermissions("ANSATT", {});
  assert.equal(ansatt.canReadIncidents, false);
  assert.equal(ansatt.canReadOwnIncidents, true);
});

test("eksplisitt restriksjon fjerner lesing av andres data men beholder innsending", () => {
  const config: ModuleVisibilityConfig = {
    incidents: [Role.ADMIN, Role.HMS],
  };
  const leder = getEffectivePermissions("LEDER", config);
  assert.equal(leder.canReadIncidents, false);
  assert.equal(leder.canInvestigateIncidents, false);
  assert.equal(leder.canCreateIncidents, true);
});

test("employeeReviews default er kun ADMIN for full oversikt", () => {
  assert.deepEqual(MODULE_DEFAULTS.employeeReviews, ["ADMIN"]);
  assert.equal(canRoleAccessModule(null, "employeeReviews", "HMS"), false);
  assert.equal(canRoleAccessModule(null, "employeeReviews", "ADMIN"), true);

  const hms = getEffectivePermissions("HMS", null);
  assert.equal(hms.canReadAllEmployeeReviews, false);
  assert.equal(hms.canReadOwnEmployeeReviews, true);
});

test("parseModuleVisibilityConfig filtrerer ugyldige nøkler og roller", () => {
  const parsed = parseModuleVisibilityConfig({
    incidents: ["ADMIN", "HMS", "FAKE_ROLE"],
    unknownModule: ["ADMIN"],
  });
  assert.ok(parsed);
  assert.deepEqual(parsed?.incidents, ["ADMIN", "HMS"]);
  assert.equal((parsed as any).unknownModule, undefined);
});

test("nav tillater innsendingsmodul selv uten lesetilgang", () => {
  const config: ModuleVisibilityConfig = {
    incidents: [Role.ADMIN, Role.HMS],
  };
  const perms = getPermissions("ANSATT");
  assert.equal(
    isNavItemAllowedByModuleVisibility("incidents", "ANSATT", config, perms),
    true
  );
  assert.equal(
    isNavItemAllowedByModuleVisibility("audits", "ANSATT", null, perms),
    false
  );
});
