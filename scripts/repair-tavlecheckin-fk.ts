/**
 * Reparerer fremmednøkkelen på TavleCheckin etter en avbrutt `prisma db push`.
 *
 * Bakgrunn: db push ville droppe indeksen TavleCheckin_tavleId_checkedInAt_idx
 * fordi den ikke var deklarert i schema.prisma. MySQL krever at fremmednøkkelen
 * droppes først, og pushen stoppet før den ble lagt tilbake. Resultatet var en
 * TavleCheckin uten fremmednøkkel til HmsTavle.
 *
 * Skriptet er idempotent og gjør kun additive endringer.
 * Kjør: npm run db:repair:tavlecheckin
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FK_NAVN = "TavleCheckin_tavleId_fkey";
const INDEKS_NAVN = "TavleCheckin_tavleId_checkedInAt_idx";

async function fkFinnes(): Promise<boolean> {
  const rader = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    FK_NAVN
  );
  return Number(rader[0]?.n ?? 0) > 0;
}

async function indeksFinnes(): Promise<boolean> {
  const rader = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'tavlecheckin' AND INDEX_NAME = ?`,
    INDEKS_NAVN
  );
  return Number(rader[0]?.n ?? 0) > 0;
}

async function main(): Promise<void> {
  console.log("Reparerer TavleCheckin. Kun additive endringer, ingen sletting.\n");

  const foreldreloese = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM \`TavleCheckin\` c
     LEFT JOIN \`HmsTavle\` t ON t.id = c.tavleId
     WHERE t.id IS NULL`
  );
  const antallForeldreloese = Number(foreldreloese[0]?.n ?? 0);
  if (antallForeldreloese > 0) {
    throw new Error(
      `${antallForeldreloese} innsjekk peker på en tavle som ikke finnes. ` +
        "Fremmednøkkelen kan ikke legges tilbake før disse er rettet."
    );
  }
  console.log("1) Ingen foreldreløse innsjekk – trygt å legge tilbake fremmednøkkelen");

  console.log("\n2) Indeks for historikk og oppbevaringsjobb");
  if (await indeksFinnes()) {
    console.log(`   = ${INDEKS_NAVN} finnes allerede`);
  } else {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX \`${INDEKS_NAVN}\` ON \`TavleCheckin\`(\`tavleId\`, \`checkedInAt\`)`
    );
    console.log(`   + ${INDEKS_NAVN} opprettet`);
  }

  console.log("\n3) Fremmednøkkel til HmsTavle");
  if (await fkFinnes()) {
    console.log(`   = ${FK_NAVN} finnes allerede`);
  } else {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`TavleCheckin\` ADD CONSTRAINT \`${FK_NAVN}\`
       FOREIGN KEY (\`tavleId\`) REFERENCES \`HmsTavle\`(\`id\`)
       ON DELETE CASCADE ON UPDATE CASCADE`
    );
    console.log(`   + ${FK_NAVN} lagt tilbake`);
  }

  const antall = await prisma.tavleCheckin.count();
  console.log(`\nFerdig. Innsjekk i tabellen: ${antall}`);
}

main()
  .catch((error) => {
    console.error("\nReparasjonen stoppet:", error instanceof Error ? error.message : error);
    console.error("Ingen data er slettet.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
