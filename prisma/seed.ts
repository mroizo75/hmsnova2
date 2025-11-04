import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Opprett superadmin bruker
  const superAdminPassword = await bcrypt.hash("superadmin123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@hmsnova.com" },
    update: {},
    create: {
      email: "superadmin@hmsnova.com",
      name: "Superadmin",
      password: superAdminPassword,
      isSuperAdmin: true,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Superadmin opprettet:", superAdmin.email);

  // Opprett support bruker
  const supportPassword = await bcrypt.hash("support123", 10);

  const supportUser = await prisma.user.upsert({
    where: { email: "support@hmsnova.com" },
    update: {},
    create: {
      email: "support@hmsnova.com",
      name: "Support Team",
      password: supportPassword,
      isSupport: true,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Support-bruker opprettet:", supportUser.email);

  // Opprett test tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "test-bedrift" },
    update: {},
    create: {
      name: "Test Bedrift AS",
      orgNumber: "123456789",
      slug: "test-bedrift",
      status: "ACTIVE",
      contactEmail: "post@testbedrift.no",
      contactPhone: "12345678",
      address: "Testveien 1",
      city: "Oslo",
      postalCode: "0123",
      subscription: {
        create: {
          plan: "PROFESSIONAL",
          price: 1990,
          billingInterval: "MONTHLY",
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  console.log("✅ Tenant opprettet:", tenant.name);

  // Opprett admin bruker for tenant
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@test.no" },
    update: {
      emailVerified: new Date(), // FIX: Ensure verification even on update
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email: "admin@test.no",
      name: "Admin Testesen",
      password: hashedPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "ADMIN",
        },
      },
    },
  });

  console.log("✅ Admin bruker opprettet:", adminUser.email);

  // Opprett HMS-ansvarlig
  const hmsPassword = await bcrypt.hash("hms123", 10);

  const hms = await prisma.user.upsert({
    where: { email: "hms@test.no" },
    update: {},
    create: {
      email: "hms@test.no",
      name: "HMS-ansvarlig Hansen",
      password: hmsPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "HMS",
        },
      },
    },
  });

  console.log("✅ HMS-bruker opprettet:", hms.email);

  // Opprett Leder
  const leaderPassword = await bcrypt.hash("leder123", 10);

  const leader = await prisma.user.upsert({
    where: { email: "leder@test.no" },
    update: {},
    create: {
      email: "leder@test.no",
      name: "Leder Larsen",
      password: leaderPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "LEDER",
        },
      },
    },
  });

  console.log("✅ Leder-bruker opprettet:", leader.email);

  // Opprett Verneombud
  const vernPassword = await bcrypt.hash("vern123", 10);

  const vern = await prisma.user.upsert({
    where: { email: "vern@test.no" },
    update: {},
    create: {
      email: "vern@test.no",
      name: "Verneombud Viken",
      password: vernPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "VERNEOMBUD",
        },
      },
    },
  });

  console.log("✅ Verneombud-bruker opprettet:", vern.email);

  // Opprett en vanlig ansatt
  const employeePassword = await bcrypt.hash("ansatt123", 10);

  const employee = await prisma.user.upsert({
    where: { email: "ansatt@test.no" },
    update: {},
    create: {
      email: "ansatt@test.no",
      name: "Ansatt Olsen",
      password: employeePassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "ANSATT",
        },
      },
    },
  });

  console.log("✅ Ansatt-bruker opprettet:", employee.email);

  // Opprett BHT bruker
  const bhtPassword = await bcrypt.hash("bht123", 10);

  const bht = await prisma.user.upsert({
    where: { email: "bht@test.no" },
    update: {},
    create: {
      email: "bht@test.no",
      name: "BHT Bruker",
      password: bhtPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "BHT",
        },
      },
    },
  });

  console.log("✅ BHT-bruker opprettet:", bht.email);

  // Opprett Revisor bruker
  const auditorPassword = await bcrypt.hash("revisor123", 10);

  const auditor = await prisma.user.upsert({
    where: { email: "revisor@test.no" },
    update: {},
    create: {
      email: "revisor@test.no",
      name: "Revisor Revidersen",
      password: auditorPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "REVISOR",
        },
      },
    },
  });

  console.log("✅ Revisor-bruker opprettet:", auditor.email);

  // Opprett eksempel mål (ISO 9001 - 6.2)
  const goal1 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      title: "Redusere arbeidsskader med 50%",
      description: "Mål om å redusere antall arbeidsskader fra 10 til 5 i løpet av året",
      category: "HMS",
      targetValue: 5,
      currentValue: 10,
      unit: "antall",
      baseline: 10,
      year: new Date().getFullYear(),
      startDate: new Date(`${new Date().getFullYear()}-01-01`),
      deadline: new Date(`${new Date().getFullYear()}-12-31`),
      ownerId: adminUser.id,
      status: "ACTIVE",
    },
  });

  console.log("✅ Mål opprettet:", goal1.title);

  // Opprett målinger for mål 1
  const measurement1 = await prisma.kpiMeasurement.create({
    data: {
      goalId: goal1.id,
      tenantId: tenant.id,
      value: 8,
      measurementDate: new Date(`${new Date().getFullYear()}-03-31`),
      measurementType: "MANUAL",
      comment: "Q1-måling: Reduksjon på 2 skader",
      measuredById: adminUser.id,
    },
  });

  const measurement2 = await prisma.kpiMeasurement.create({
    data: {
      goalId: goal1.id,
      tenantId: tenant.id,
      value: 6,
      measurementDate: new Date(`${new Date().getFullYear()}-06-30`),
      measurementType: "MANUAL",
      comment: "Q2-måling: Fortsatt fremgang",
      measuredById: adminUser.id,
    },
  });

  console.log("✅ Målinger opprettet:", measurement1.id, measurement2.id);

  // Oppdater goal1 currentValue til siste måling
  await prisma.goal.update({
    where: { id: goal1.id },
    data: { currentValue: 6 },
  });

  // Opprett flere eksempel mål
  const goal2 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      title: "Øke kundetilfredshet til 90%",
      description: "Måle kundetilfredshet gjennom NPS-score",
      category: "CUSTOMER",
      targetValue: 90,
      currentValue: 75,
      unit: "%",
      baseline: 70,
      year: new Date().getFullYear(),
      quarter: 2,
      ownerId: adminUser.id,
      status: "ACTIVE",
    },
  });

  const goal3 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      title: "Redusere avfall med 30%",
      description: "Miljømål for reduksjon av avfall",
      category: "ENVIRONMENT",
      targetValue: 70,
      currentValue: 95,
      unit: "kg",
      baseline: 100,
      year: new Date().getFullYear(),
      deadline: new Date(`${new Date().getFullYear()}-12-31`),
      ownerId: employee.id,
      status: "AT_RISK",
    },
  });

  const goal4 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      title: "Oppnå ISO 9001 sertifisering",
      description: "Fullføre alle krav for ISO 9001:2015 sertifisering",
      category: "QUALITY",
      targetValue: 100,
      currentValue: 100,
      unit: "%",
      baseline: 0,
      year: new Date().getFullYear() - 1,
      ownerId: adminUser.id,
      status: "ACHIEVED",
    },
  });

  console.log("✅ Flere mål opprettet:", goal2.title, goal3.title, goal4.title);

  // Opprett eksempel faktura
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      amount: 1990,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: "SENT",
      period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
      description: "HMS Nova Professional - Månedlig abonnement",
    },
  });

  console.log("✅ Faktura opprettet:", invoice.id);

  console.log("\n🎉 Seeding fullført!");
  console.log("\n📝 Test pålogginger:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🛡️  Superadmin:     superadmin@hmsnova.com / superadmin123");
  console.log("🎧 Support:        support@hmsnova.com / support123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 Admin:          admin@test.no / admin123");
  console.log("⚡ HMS-ansvarlig:  hms@test.no / hms123");
  console.log("👔 Leder:          leder@test.no / leder123");
  console.log("🛡️  Verneombud:    vern@test.no / vern123");
  console.log("👷 Ansatt:         ansatt@test.no / ansatt123");
  console.log("🏥 BHT:            bht@test.no / bht123");
  console.log("📋 Revisor:        revisor@test.no / revisor123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
