/**
 * Fix tenant status - set all SUSPENDED tenants to ACTIVE
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixTenantStatus() {
  try {
    const result = await prisma.tenant.updateMany({
      where: { status: "SUSPENDED" },
      data: { status: "ACTIVE" },
    });

    console.log(`✅ Updated ${result.count} tenants from SUSPENDED to ACTIVE`);

    // Also set all OVERDUE invoices to PAID (for testing)
    const invoiceResult = await prisma.invoice.updateMany({
      where: { status: "OVERDUE" },
      data: { status: "PAID", paidDate: new Date() },
    });

    console.log(`✅ Marked ${invoiceResult.count} OVERDUE invoices as PAID`);
    console.log("\n🎉 Du kan nå logge inn som admin@test.no!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTenantStatus();

