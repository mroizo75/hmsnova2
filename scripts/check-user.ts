/**
 * Check specific user details
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUser(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenants: {
          include: {
            tenant: {
              include: {
                invoices: {
                  where: {
                    status: "OVERDUE",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.log(`❌ Bruker med email ${email} ikke funnet!`);
      return;
    }

    console.log("\n👤 Bruker Info:\n");
    console.log("━".repeat(80));
    console.log(`Email:              ${user.email}`);
    console.log(`Navn:               ${user.name}`);
    console.log(`Password set:       ${!!user.password ? "✅" : "❌"}`);
    console.log(`Email Verified:     ${user.emailVerified ? `✅ ${user.emailVerified}` : "❌ NOT VERIFIED"}`);
    console.log(`Is SuperAdmin:      ${user.isSuperAdmin ? "✅" : "❌"}`);
    console.log(`Is Support:         ${user.isSupport ? "✅" : "❌"}`);
    console.log(`Failed Attempts:    ${user.failedLoginAttempts}`);
    console.log(`Locked Until:       ${user.lockedUntil || "Not locked"}`);
    console.log(`Tenants:            ${user.tenants.length}`);

    user.tenants.forEach((ut, i) => {
      console.log(`\n   Tenant ${i + 1}:`);
      console.log(`   - Name:   ${ut.tenant.name}`);
      console.log(`   - Role:   ${ut.role}`);
      console.log(`   - Status: ${ut.tenant.status}`);
      console.log(`   - Overdue Invoices: ${ut.tenant.invoices.length}`);
    });

    console.log("\n" + "━".repeat(80));

    // Check what would happen in authorize()
    console.log("\n🔍 Auth Check:\n");
    
    if (!user.password) {
      console.log("❌ BLOKKERT: Ingen password satt");
      return;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      console.log(`❌ BLOKKERT: Konto låst til ${user.lockedUntil}`);
      return;
    }

    if (!user.emailVerified && !user.isSuperAdmin && !user.isSupport) {
      console.log("❌ BLOKKERT: Email ikke verifisert (og ikke admin/support)");
      return;
    }

    if (!user.isSuperAdmin && !user.isSupport && user.tenants.length > 0) {
      const tenant = user.tenants[0].tenant;
      if (tenant.status === "SUSPENDED") {
        console.log(`❌ BLOKKERT: Tenant '${tenant.name}' er SUSPENDED`);
        return;
      }
    }

    console.log("✅ Brukeren skal kunne logge inn!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || "admin@test.no";
checkUser(email);

