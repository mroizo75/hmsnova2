import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starter migrering for eksisterende kunder...");

  // Alle eksisterende tenants skal:
  // 1. Ikke tvinges til bransjevalg (startpakkeCompleted = true)
  // 2. Ikke se tilsynsklar-veiviseren (setupGuideHidden = true)
  const result = await prisma.tenant.updateMany({
    where: {},
    data: {
      setupGuideHidden: true,
      startpakkeCompleted: true,
    },
  });

  console.log(
    `Oppdaterte ${result.count} tenant(er) → setupGuideHidden=true, startpakkeCompleted=true`,
  );

  console.log("Migrering fullført!");
}

main()
  .catch((e) => {
    console.error("Feil under migrering:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
