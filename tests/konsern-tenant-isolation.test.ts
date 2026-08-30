import test, { after } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../src/lib/db";
import {
  assertKonsernCanAttachTenant,
  assertTenantsInGroup,
  getAccessibleTenantIds,
  requireTenantInGroup,
  resolveWritableGroupId,
} from "../src/lib/corporate-group-context";
import {
  canAccessKonsernPortal,
  canEnterKonsernFromHms,
  hasKonsernMenuInHms,
} from "../src/lib/konsern-access";

interface Fixture {
  groupAId: string;
  groupBId: string;
  tenantAId: string;
  tenantBId: string;
  outsiderTenantId: string;
  removedTenantId: string;
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createFixture(): Promise<Fixture> {
  const suffix = uniqueSuffix();

  const [groupA, groupB] = await Promise.all([
    prisma.corporateGroup.create({
      data: { name: `Konsern A ${suffix}`, slug: `konsern-a-${suffix}` },
    }),
    prisma.corporateGroup.create({
      data: { name: `Konsern B ${suffix}`, slug: `konsern-b-${suffix}` },
    }),
  ]);

  const [tenantA, tenantB, outsider, removed] = await Promise.all([
    prisma.tenant.create({
      data: { name: `Bedrift A ${suffix}`, slug: `bedrift-a-${suffix}`, status: "ACTIVE" },
    }),
    prisma.tenant.create({
      data: { name: `Bedrift B ${suffix}`, slug: `bedrift-b-${suffix}`, status: "ACTIVE" },
    }),
    prisma.tenant.create({
      data: { name: `Utenfor ${suffix}`, slug: `utenfor-${suffix}`, status: "ACTIVE" },
    }),
    prisma.tenant.create({
      data: { name: `Fjernet ${suffix}`, slug: `fjernet-${suffix}`, status: "ACTIVE" },
    }),
  ]);

  await prisma.corporateGroupTenant.createMany({
    data: [
      { groupId: groupA.id, tenantId: tenantA.id, status: "ACTIVE" },
      { groupId: groupB.id, tenantId: tenantB.id, status: "ACTIVE" },
      { groupId: groupA.id, tenantId: removed.id, status: "REMOVED" },
    ],
  });

  return {
    groupAId: groupA.id,
    groupBId: groupB.id,
    tenantAId: tenantA.id,
    tenantBId: tenantB.id,
    outsiderTenantId: outsider.id,
    removedTenantId: removed.id,
  };
}

async function cleanupFixture(fixture: Fixture) {
  await prisma.corporateGroupTenant.deleteMany({
    where: {
      OR: [{ groupId: fixture.groupAId }, { groupId: fixture.groupBId }],
    },
  });
  await prisma.corporateGroup.deleteMany({
    where: { id: { in: [fixture.groupAId, fixture.groupBId] } },
  });
  await prisma.tenant.deleteMany({
    where: {
      id: {
        in: [
          fixture.tenantAId,
          fixture.tenantBId,
          fixture.outsiderTenantId,
          fixture.removedTenantId,
        ],
      },
    },
  });
}

test("melding-meny i HMS vises kun for konsern-brukere med ADMIN eller HMS", () => {
  assert.equal(
    hasKonsernMenuInHms({ corporateGroupId: "group-1", tenantRole: "ADMIN" }),
    true
  );
  assert.equal(
    hasKonsernMenuInHms({ corporateGroupId: "group-1", tenantRole: "HMS" }),
    true
  );
  assert.equal(
    hasKonsernMenuInHms({ corporateGroupId: "group-1", tenantRole: "LEDER" }),
    false
  );
  assert.equal(
    hasKonsernMenuInHms({ corporateGroupId: null, tenantRole: "ADMIN" }),
    false
  );
});

test("kun ADMIN og HMS kan gå inn i konsern fra HMS-systemet", () => {
  assert.equal(canEnterKonsernFromHms("ADMIN"), true);
  assert.equal(canEnterKonsernFromHms("HMS"), true);
  assert.equal(canEnterKonsernFromHms("LEDER"), false);
  assert.equal(canEnterKonsernFromHms("VERNEOMBUD"), false);
  assert.equal(canEnterKonsernFromHms("ANSATT"), false);
  assert.equal(canEnterKonsernFromHms("REVISOR"), false);
  assert.equal(canEnterKonsernFromHms(null), false);
});

test("konsern-portal: HMS-roller utenom ADMIN/HMS holdes i HMS-systemet", () => {
  assert.equal(
    canAccessKonsernPortal({
      hasCorporateGroup: true,
      tenantId: "tenant-1",
      tenantRole: "ADMIN",
    }),
    true
  );
  assert.equal(
    canAccessKonsernPortal({
      hasCorporateGroup: true,
      tenantId: "tenant-1",
      tenantRole: "HMS",
    }),
    true
  );
  assert.equal(
    canAccessKonsernPortal({
      hasCorporateGroup: true,
      tenantId: "tenant-1",
      tenantRole: "LEDER",
    }),
    false
  );
  assert.equal(
    canAccessKonsernPortal({
      hasCorporateGroup: true,
      tenantId: "tenant-1",
      tenantRole: "ANSATT",
    }),
    false
  );
  assert.equal(
    canAccessKonsernPortal({
      hasCorporateGroup: true,
      tenantId: null,
      tenantRole: null,
    }),
    true
  );
  assert.equal(
    canAccessKonsernPortal({
      hasCorporateGroup: false,
      tenantId: "tenant-1",
      tenantRole: "ADMIN",
    }),
    false
  );
});

test("resolveWritableGroupId: konsern-admin kan ikke skrive til et annet konsern", () => {
  assert.equal(
    resolveWritableGroupId({
      sessionGroupId: "group-a",
      requestedGroupId: null,
      isSuperAdmin: false,
    }),
    "group-a"
  );

  assert.equal(
    resolveWritableGroupId({
      sessionGroupId: "group-a",
      requestedGroupId: "group-a",
      isSuperAdmin: false,
    }),
    "group-a"
  );

  assert.throws(
    () =>
      resolveWritableGroupId({
        sessionGroupId: "group-a",
        requestedGroupId: "group-b",
        isSuperAdmin: false,
      }),
    /annet konsern/
  );

  assert.throws(
    () =>
      resolveWritableGroupId({
        sessionGroupId: null,
        requestedGroupId: "group-b",
        isSuperAdmin: false,
      }),
    /Ikke autorisert/
  );
});

test("resolveWritableGroupId: superadmin kan velge mål-konsern", () => {
  assert.equal(
    resolveWritableGroupId({
      sessionGroupId: "group-a",
      requestedGroupId: "group-b",
      isSuperAdmin: true,
    }),
    "group-b"
  );

  assert.equal(
    resolveWritableGroupId({
      sessionGroupId: null,
      requestedGroupId: "group-b",
      isSuperAdmin: true,
    }),
    "group-b"
  );

  assert.throws(
    () =>
      resolveWritableGroupId({
        sessionGroupId: null,
        requestedGroupId: null,
        isSuperAdmin: true,
      }),
    /Mangler konsern-ID/
  );
});

test("getAccessibleTenantIds returnerer kun aktive bedrifter i eget konsern", async () => {
  const fixture = await createFixture();
  try {
    const groupATenants = await getAccessibleTenantIds(fixture.groupAId);
    const groupBTenants = await getAccessibleTenantIds(fixture.groupBId);

    assert.deepEqual(groupATenants.sort(), [fixture.tenantAId].sort());
    assert.deepEqual(groupBTenants, [fixture.tenantBId]);
    assert.equal(groupATenants.includes(fixture.tenantBId), false);
    assert.equal(groupATenants.includes(fixture.outsiderTenantId), false);
    assert.equal(groupATenants.includes(fixture.removedTenantId), false);
  } finally {
    await cleanupFixture(fixture);
  }
});

test("requireTenantInGroup avviser fremmed og fjernet tenantId", async () => {
  const fixture = await createFixture();
  try {
    await requireTenantInGroup(fixture.groupAId, fixture.tenantAId);

    await assert.rejects(
      () => requireTenantInGroup(fixture.groupAId, fixture.tenantBId),
      /tilhører ikke dette konsernet/
    );
    await assert.rejects(
      () => requireTenantInGroup(fixture.groupAId, fixture.outsiderTenantId),
      /tilhører ikke dette konsernet/
    );
    await assert.rejects(
      () => requireTenantInGroup(fixture.groupAId, fixture.removedTenantId),
      /tilhører ikke dette konsernet/
    );
    await assert.rejects(
      () => requireTenantInGroup(fixture.groupBId, fixture.tenantAId),
      /tilhører ikke dette konsernet/
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test("assertTenantsInGroup avviser liste med én fremmed tenantId", async () => {
  const fixture = await createFixture();
  try {
    await assertTenantsInGroup(fixture.groupAId, [fixture.tenantAId]);

    await assert.rejects(
      () => assertTenantsInGroup(fixture.groupAId, [fixture.tenantAId, fixture.tenantBId]),
      /tilhører ikke dette konsernet/
    );
    await assert.rejects(
      () => assertTenantsInGroup(fixture.groupAId, [fixture.outsiderTenantId]),
      /tilhører ikke dette konsernet/
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test("assertKonsernCanAttachTenant: kan ikke kople en fremmed eksisterende bedrift", async () => {
  const fixture = await createFixture();
  try {
    assert.equal(
      await assertKonsernCanAttachTenant(fixture.groupAId, fixture.tenantAId),
      "already-active"
    );
    assert.equal(
      await assertKonsernCanAttachTenant(fixture.groupAId, fixture.removedTenantId),
      "reactivate"
    );

    await assert.rejects(
      () => assertKonsernCanAttachTenant(fixture.groupAId, fixture.tenantBId),
      /HMS Nova-administrator/
    );
    await assert.rejects(
      () => assertKonsernCanAttachTenant(fixture.groupAId, fixture.outsiderTenantId),
      /HMS Nova-administrator/
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

after(async () => {
  await prisma.$disconnect();
});
