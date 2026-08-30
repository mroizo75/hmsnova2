import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessPersonnelFile,
  isRetainExpired,
} from "../src/features/personnel/lib/personnel-categories";
import { generatePersonnelFileKey } from "../src/lib/storage";
import { getPermissions, getVisibleNavItems } from "../src/lib/permissions";

test("ansatt ser kun egen personalmappe", () => {
  assert.equal(
    canAccessPersonnelFile({
      viewerId: "u1",
      employeeId: "u1",
      canReadOwn: true,
      canReadAll: false,
    }),
    true,
  );
  assert.equal(
    canAccessPersonnelFile({
      viewerId: "u1",
      employeeId: "u2",
      canReadOwn: true,
      canReadAll: false,
    }),
    false,
  );
});

test("HR med full lesetilgang ser alle mapper", () => {
  assert.equal(
    canAccessPersonnelFile({
      viewerId: "hr",
      employeeId: "u2",
      canReadOwn: true,
      canReadAll: true,
    }),
    true,
  );
});

test("slettefrist er utløpt etter retainUntil", () => {
  const now = new Date("2026-08-30T12:00:00.000Z");
  assert.equal(isRetainExpired("2026-08-29T00:00:00.000Z", now), true);
  assert.equal(isRetainExpired("2026-08-31T00:00:00.000Z", now), false);
  assert.equal(isRetainExpired(null, now), false);
});

test("R2-nøkkel følger tenant/personnel/user/category", () => {
  const key = generatePersonnelFileKey("tenant-a", "user-b", "CONTRACT", "avtale.pdf");
  assert.match(key, /^tenant-a\/personnel\/user-b\/contract\/\d+-.+-avtale\.pdf$/);
});

test("HR kan administrere personalarkiv, ansatt kan bare se egen mappe", () => {
  const admin = getPermissions("ADMIN");
  const leder = getPermissions("LEDER");
  const ansatt = getPermissions("ANSATT");

  assert.equal(admin.canReadAllPersonnelFiles, true);
  assert.equal(admin.canDeletePersonnelFile, true);
  assert.equal(leder.canUploadPersonnelFile, true);
  assert.equal(leder.canDeletePersonnelFile, false);
  assert.equal(ansatt.canReadOwnPersonnelFile, true);
  assert.equal(ansatt.canReadAllPersonnelFiles, false);
  assert.equal(getVisibleNavItems("ANSATT").personnelArchive, false);
  assert.equal(getVisibleNavItems("ADMIN").personnelArchive, true);
});
