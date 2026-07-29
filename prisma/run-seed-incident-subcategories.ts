/**
 * Trygg produksjonsseed: kun systemstandard underkategorier for avvik.
 * Idempotent – hopper over rader som allerede finnes.
 *
 * Bruk: npm run db:seed:subcategories
 */
import { PrismaClient } from "@prisma/client";
import { seedIncidentSubcategories } from "./seed-incident-subcategories";

const prisma = new PrismaClient();

async function main() {
  await seedIncidentSubcategories(prisma);
}

main()
  .catch((error) => {
    console.error("❌ Seed av underkategorier feilet:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
