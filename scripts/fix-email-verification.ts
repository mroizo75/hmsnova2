/**
 * Fix email verification for all test users
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixEmailVerification() {
  try {
    // Update all users without emailVerified
    const result = await prisma.user.updateMany({
      where: {
        emailVerified: null,
      },
      data: {
        emailVerified: new Date(),
      },
    });

    console.log(`✅ Updated ${result.count} users - satt emailVerified`);

    // Reset failed login attempts
    const resetResult = await prisma.user.updateMany({
      where: {
        failedLoginAttempts: { gt: 0 },
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    console.log(`✅ Reset ${resetResult.count} brukere - tilbakestilt failed attempts`);
    console.log("\n🎉 Alle brukere er nå klare for innlogging!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmailVerification();

