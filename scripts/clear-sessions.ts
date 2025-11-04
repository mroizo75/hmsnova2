/**
 * Clear all sessions from database
 * Run this when you get JWT decryption errors
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearSessions() {
  try {
    const result = await prisma.session.deleteMany({});
    console.log(`✅ Deleted ${result.count} sessions`);
    
    console.log("\n🔐 Sessions cleared! Now:");
    console.log("1. Clear your browser cookies");
    console.log("2. Restart the dev server");
    console.log("3. Log in again");
  } catch (error) {
    console.error("❌ Error clearing sessions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearSessions();

