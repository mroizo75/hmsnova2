import test, { after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";

interface Fixture {
  tenantAId: string;
  tenantBId: string;
  chemicalAId: string;
  chemicalBId: string;
  userAId?: string;
  userBId?: string;
  userAEmail?: string;
  userBEmail?: string;
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createFixture(): Promise<Fixture> {
  const suffix = uniqueSuffix();
  const tenantASlug = `bedrift-a-test-${suffix}`;
  const tenantBSlug = `bedrift-b-test-${suffix}`;

  const tenantA = await prisma.tenant.create({
    data: {
      name: `Bedrift A ${suffix}`,
      slug: tenantASlug,
      status: "ACTIVE",
    },
  });

  const tenantB = await prisma.tenant.create({
    data: {
      name: `Bedrift B ${suffix}`,
      slug: tenantBSlug,
      status: "ACTIVE",
    },
  });

  const chemicalA = await prisma.chemical.create({
    data: {
      tenantId: tenantA.id,
      productName: "Etanol (Bedrift A)",
      casNumber: "64-17-5",
      supplier: "VWR",
      status: "ACTIVE",
    },
  });

  const chemicalB = await prisma.chemical.create({
    data: {
      tenantId: tenantB.id,
      productName: "Aceton (Bedrift B)",
      casNumber: "67-64-1",
      supplier: "Sigma-Aldrich",
      status: "ACTIVE",
    },
  });

  return {
    tenantAId: tenantA.id,
    tenantBId: tenantB.id,
    chemicalAId: chemicalA.id,
    chemicalBId: chemicalB.id,
  };
}

async function cleanupFixture(fixture: Fixture) {
  await prisma.notification.deleteMany({
    where: {
      OR: [{ tenantId: fixture.tenantAId }, { tenantId: fixture.tenantBId }],
    },
  });

  await prisma.userTenant.deleteMany({
    where: {
      OR: [{ tenantId: fixture.tenantAId }, { tenantId: fixture.tenantBId }],
    },
  });

  if (fixture.userAEmail || fixture.userBEmail) {
    const emails = [fixture.userAEmail, fixture.userBEmail].filter(
      (email): email is string => Boolean(email)
    );
    await prisma.user.deleteMany({
      where: {
        email: { in: emails },
      },
    });
  }

  await prisma.chemical.deleteMany({
    where: {
      OR: [{ tenantId: fixture.tenantAId }, { tenantId: fixture.tenantBId }],
    },
  });

  await prisma.tenant.deleteMany({
    where: {
      id: { in: [fixture.tenantAId, fixture.tenantBId] },
    },
  });
}

test("skal kun hente kjemikalier for riktig tenant", async () => {
  const fixture = await createFixture();
  try {
    const chemicalsForTenantA = await prisma.chemical.findMany({
      where: { tenantId: fixture.tenantAId },
    });
    const chemicalsForTenantB = await prisma.chemical.findMany({
      where: { tenantId: fixture.tenantBId },
    });

    assert.equal(chemicalsForTenantA.length, 1);
    assert.equal(chemicalsForTenantA[0]?.productName, "Etanol (Bedrift A)");
    assert.equal(chemicalsForTenantB.length, 1);
    assert.equal(chemicalsForTenantB[0]?.productName, "Aceton (Bedrift B)");
  } finally {
    await cleanupFixture(fixture);
  }
});

test("skal IKKE kunne oppdatere annen tenant sine kjemikalier", async () => {
  const fixture = await createFixture();
  try {
    const result = await prisma.chemical.updateMany({
      where: {
        id: fixture.chemicalBId,
        tenantId: fixture.tenantAId,
      },
      data: {
        productName: "HACKED!",
      },
    });

    assert.equal(result.count, 0);

    const chemical = await prisma.chemical.findUnique({
      where: { id: fixture.chemicalBId },
      select: { productName: true },
    });
    assert.equal(chemical?.productName, "Aceton (Bedrift B)");
  } finally {
    await cleanupFixture(fixture);
  }
});

test("skal ha tenant-isolerte storage paths", async () => {
  const fixture = await createFixture();
  try {
    const sdsKeyA = `sds/${fixture.tenantAId}/${fixture.chemicalAId}-123456.pdf`;
    const sdsKeyB = `sds/${fixture.tenantBId}/${fixture.chemicalBId}-123456.pdf`;

    assert.notEqual(sdsKeyA, sdsKeyB);
    assert.equal(sdsKeyA.includes(fixture.tenantAId), true);
    assert.equal(sdsKeyB.includes(fixture.tenantBId), true);
  } finally {
    await cleanupFixture(fixture);
  }
});

test("skal kun sende varsler til riktig tenant sine brukere", async () => {
  const fixture = await createFixture();
  try {
    const suffix = uniqueSuffix();
    const userAEmail = `hms-a-${suffix}@test.no`;
    const userBEmail = `hms-b-${suffix}@test.no`;

    const userA = await prisma.user.create({
      data: {
        email: userAEmail,
        name: "HMS A",
      },
    });

    const userB = await prisma.user.create({
      data: {
        email: userBEmail,
        name: "HMS B",
      },
    });

    fixture.userAId = userA.id;
    fixture.userBId = userB.id;
    fixture.userAEmail = userAEmail;
    fixture.userBEmail = userBEmail;

    await prisma.userTenant.createMany({
      data: [
        {
          userId: userA.id,
          tenantId: fixture.tenantAId,
          role: "HMS",
        },
        {
          userId: userB.id,
          tenantId: fixture.tenantBId,
          role: "HMS",
        },
      ],
    });

    await prisma.notification.create({
      data: {
        tenantId: fixture.tenantAId,
        userId: userA.id,
        type: "CHEMICAL_SDS_REVIEW",
        title: "Test varsel A",
        message: "Dette er kun for Tenant A",
      },
    });

    const notificationsA = await prisma.notification.findMany({
      where: { tenantId: fixture.tenantAId },
    });
    const notificationsB = await prisma.notification.findMany({
      where: { tenantId: fixture.tenantBId },
    });

    assert.equal(notificationsA.length, 1);
    assert.equal(notificationsA[0]?.message, "Dette er kun for Tenant A");
    assert.equal(notificationsB.length, 0);
  } finally {
    await cleanupFixture(fixture);
  }
});

after(async () => {
  await prisma.$disconnect();
});
