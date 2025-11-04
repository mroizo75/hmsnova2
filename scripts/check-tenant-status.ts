/**
 * Check tenant status in database
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTenantStatus() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        invoices: {
          where: {
            OR: [
              { status: "OVERDUE" },
              { status: "PENDING" },
            ],
          },
        },
        subscription: true,
      },
    });

    console.log("\n📊 Tenant Status:\n");
    console.log("━".repeat(80));

    tenants.forEach((tenant) => {
      console.log(`\n🏢 ${tenant.name} (${tenant.slug})`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Subscription: ${tenant.subscription?.status || "NONE"}`);
      console.log(`   Pending Invoices: ${tenant.invoices.filter(i => i.status === "PENDING").length}`);
      console.log(`   Overdue Invoices: ${tenant.invoices.filter(i => i.status === "OVERDUE").length}`);
    });

    console.log("\n" + "━".repeat(80));

    // Fix if suspended
    const suspendedTenants = tenants.filter(t => t.status === "SUSPENDED");
    if (suspendedTenants.length > 0) {
      console.log("\n⚠️  Fant SUSPENDED tenants!");
      console.log("Vil du sette dem til ACTIVE? Kjør: npx tsx scripts/fix-tenant-status.ts");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenantStatus();

