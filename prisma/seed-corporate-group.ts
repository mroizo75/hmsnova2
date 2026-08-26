/**
 * Seed: Nordfjord Hotellkjede AS – Konsern med 5 hoteller
 * Alle hoteller har ferdig onboarding med bransje "hospitality", ellers tomme.
 * Kjør: tsx prisma/seed-corporate-group.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Demo2026!";
const GROUP_SLUG = "nordfjord-hotellkjede";

const hotels = [
  {
    slug: "nordfjord-fjordhotell",
    name: "Nordfjord Fjordhotell",
    orgNumber: "912345001",
    city: "Nordfjordeid",
    postalCode: "6770",
    address: "Fjordgata 12",
    employeeCount: 28,
    contactPerson: "Lars Fjord",
    adminEmail: "admin@fjordhotellet.no",
    adminName: "Lars Fjord",
  },
  {
    slug: "nordfjord-strandhotell",
    name: "Nordfjord Strandhotell",
    orgNumber: "912345002",
    city: "Måløy",
    postalCode: "6718",
    address: "Strandveien 5",
    employeeCount: 22,
    contactPerson: "Hilde Strand",
    adminEmail: "admin@strandhotellet.no",
    adminName: "Hilde Strand",
  },
  {
    slug: "nordfjord-fjellhotell",
    name: "Nordfjord Fjellhotell",
    orgNumber: "912345003",
    city: "Stryn",
    postalCode: "6783",
    address: "Fjellvegen 8",
    employeeCount: 18,
    contactPerson: "Geir Fjell",
    adminEmail: "admin@fjellhotellet.no",
    adminName: "Geir Fjell",
  },
  {
    slug: "nordfjord-havhotell",
    name: "Nordfjord Havhotell",
    orgNumber: "912345004",
    city: "Florø",
    postalCode: "6900",
    address: "Havnepromenaden 3",
    employeeCount: 32,
    contactPerson: "Silje Hav",
    adminEmail: "admin@havhotellet.no",
    adminName: "Silje Hav",
  },
  {
    slug: "nordfjord-byhotell",
    name: "Nordfjord Byhotell",
    orgNumber: "912345005",
    city: "Førde",
    postalCode: "6800",
    address: "Sentrumsgate 15",
    employeeCount: 24,
    contactPerson: "Erik By",
    adminEmail: "admin@byhotellet.no",
    adminName: "Erik By",
  },
];

async function main() {
  console.log("Nordfjord Hotellkjede – Konsern seed\n");

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // 1. Opprett konsernet
  const group = await prisma.corporateGroup.upsert({
    where: { slug: GROUP_SLUG },
    update: {},
    create: {
      name: "Nordfjord Hotellkjede AS",
      slug: GROUP_SLUG,
      orgNumber: "912345678",
      contactEmail: "post@nordfjord-hotellkjede.no",
      contactPhone: "+47 57 86 00 00",
    },
  });
  console.log(`Konsern: ${group.name} (${group.id})\n`);

  // 2. Opprett konsern-admin bruker
  const konsernAdminUser = await prisma.user.upsert({
    where: { email: "konsern@nordfjord.no" },
    update: {},
    create: {
      name: "Konsern Administrator",
      email: "konsern@nordfjord.no",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  await prisma.corporateGroupUser.upsert({
    where: {
      groupId_userId: { groupId: group.id, userId: konsernAdminUser.id },
    },
    update: { role: "GROUP_ADMIN" },
    create: {
      groupId: group.id,
      userId: konsernAdminUser.id,
      role: "GROUP_ADMIN",
    },
  });
  console.log(`Konsern-admin: ${konsernAdminUser.email}\n`);

  // 3. Opprett 5 hotell-tenants
  for (const hotel of hotels) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: hotel.slug },
      update: {},
      create: {
        name: hotel.name,
        slug: hotel.slug,
        orgNumber: hotel.orgNumber,
        industry: "hospitality",
        status: "ACTIVE",
        contactEmail: hotel.adminEmail,
        contactPhone: "+47 57 86 00 01",
        address: hotel.address,
        city: hotel.city,
        postalCode: hotel.postalCode,
        employeeCount: hotel.employeeCount,
        contactPerson: hotel.contactPerson,
        onboardingStatus: "COMPLETED",
        onboardingCompletedAt: new Date("2026-01-15"),
        startpakkeCompleted: true,
        setupGuideHidden: true,
        tavleBannerDismissed: true,
        pricingTier: "SMALL",
        termsAcceptedAt: new Date("2026-01-10"),
      },
    });

    // Koble tenant til konsern
    await prisma.corporateGroupTenant.upsert({
      where: {
        groupId_tenantId: { groupId: group.id, tenantId: tenant.id },
      },
      update: { status: "ACTIVE" },
      create: {
        groupId: group.id,
        tenantId: tenant.id,
        status: "ACTIVE",
      },
    });

    // Opprett ADMIN-bruker for hotellet
    const adminUser = await prisma.user.upsert({
      where: { email: hotel.adminEmail },
      update: {},
      create: {
        name: hotel.adminName,
        email: hotel.adminEmail,
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });

    await prisma.userTenant.upsert({
      where: {
        userId_tenantId: { userId: adminUser.id, tenantId: tenant.id },
      },
      update: { role: "ADMIN" },
      create: {
        userId: adminUser.id,
        tenantId: tenant.id,
        role: "ADMIN",
        department: "Ledelse",
        position: "Daglig leder",
      },
    });

    console.log(`  Hotell: ${hotel.name} (${tenant.id}) – admin: ${hotel.adminEmail}`);
  }

  console.log("\nSeed fullfort!");
  console.log("\nInnloggingsdetaljer:");
  console.log("  Konsern-admin: konsern@nordfjord.no / Demo2026!");
  console.log("  Hotell-admin:  admin@fjordhotellet.no / Demo2026!");
  console.log("  (og tilsvarende for de andre hotellene)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
