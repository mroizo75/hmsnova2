/**
 * Trygg migrasjon for oversiktslisten på Digital HMS Tavle.
 *
 * Bakgrunn: Byggherreforskriften § 15 krever at oversiktslisten inneholder
 * organisasjonsnummer (bokstav d), plassens adresse (bokstav a) og byggherrens
 * navn (bokstav b), og at listen oppbevares i seks måneder etter at arbeidet er
 * avsluttet. Feltene under dekker disse kravene.
 *
 * Kun additive endringer: nye nullbare kolonner og nye indekser.
 * Ingen DROP, ingen TRUNCATE, ingen reset – eksisterende kundedata røres ikke.
 * Skriptet er idempotent og kan kjøres flere ganger.
 *
 * Kjør: npm run db:migrate:oversiktsliste
 * Tørrkjøring (viser bare hva som mangler): npm run db:migrate:oversiktsliste -- --dry-run
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const NYE_KOLONNER: ReadonlyArray<{
  tabell: string;
  navn: string;
  definisjon: string;
  hjemmel: string;
}> = [
  {
    tabell: "TavleCheckin",
    navn: "employerOrgNr",
    definisjon: "VARCHAR(191) NULL",
    hjemmel: "§ 15 bokstav d – organisasjonsnummer",
  },
  {
    tabell: "HmsTavle",
    navn: "siteAddress",
    definisjon: "VARCHAR(191) NULL",
    hjemmel: "§ 15 bokstav a – plassens adresse",
  },
  {
    tabell: "HmsTavle",
    navn: "clientName",
    definisjon: "VARCHAR(191) NULL",
    hjemmel: "§ 15 bokstav b – byggherrens navn",
  },
  {
    tabell: "HmsTavle",
    navn: "workEndedAt",
    definisjon: "DATETIME(3) NULL",
    hjemmel: "§ 15 – seks måneders oppbevaring etter avsluttet arbeid",
  },
];

const NYE_INDEKSER: ReadonlyArray<{ tabell: string; navn: string; kolonner: string }> = [
  // Brukes av historikkvisning, eksport og oppbevaringsjobben.
  {
    tabell: "TavleCheckin",
    navn: "TavleCheckin_tavleId_checkedInAt_idx",
    kolonner: "`tavleId`, `checkedInAt`",
  },
];

async function kolonneFinnes(tabell: string, kolonne: string): Promise<boolean> {
  const rader = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND COLUMN_NAME = ?`,
    tabell,
    kolonne
  );
  return Number(rader[0]?.n ?? 0) > 0;
}

async function indeksFinnes(tabell: string, indeks: string): Promise<boolean> {
  const rader = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND INDEX_NAME = ?`,
    tabell,
    indeks
  );
  return Number(rader[0]?.n ?? 0) > 0;
}

async function kjor(sql: string): Promise<void> {
  if (dryRun) {
    console.log(`   [tørrkjøring] ${sql}`);
    return;
  }
  await prisma.$executeRawUnsafe(sql);
}

async function leggTilKolonner(): Promise<void> {
  console.log("\n1) Nye kolonner");
  for (const { tabell, navn, definisjon, hjemmel } of NYE_KOLONNER) {
    if (await kolonneFinnes(tabell, navn)) {
      console.log(`   = ${tabell}.${navn} finnes allerede`);
      continue;
    }
    await kjor(`ALTER TABLE \`${tabell}\` ADD COLUMN \`${navn}\` ${definisjon}`);
    console.log(`   + ${tabell}.${navn} lagt til (${hjemmel})`);
  }
}

async function leggTilIndekser(): Promise<void> {
  console.log("\n2) Indekser");
  for (const { tabell, navn, kolonner } of NYE_INDEKSER) {
    if (await indeksFinnes(tabell, navn)) {
      console.log(`   = ${navn} finnes allerede`);
      continue;
    }
    await kjor(`CREATE INDEX \`${navn}\` ON \`${tabell}\`(${kolonner})`);
    console.log(`   + ${navn} opprettet`);
  }
}

async function main(): Promise<void> {
  console.log(
    dryRun
      ? "Tørrkjøring – ingen endringer skrives til databasen."
      : "Migrerer felter for oversiktslisten. Kun additive endringer."
  );

  const [{ n }] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    "SELECT COUNT(*) AS n FROM `TavleCheckin`"
  );
  console.log(`Eksisterende innsjekk: ${Number(n)}`);

  await leggTilKolonner();
  await leggTilIndekser();

  console.log(dryRun ? "\nTørrkjøring fullført." : "\nMigrasjon fullført uten datatap.");
}

main()
  .catch((error) => {
    console.error(
      "\nMigrasjonen stoppet:",
      error instanceof Error ? error.message : error
    );
    console.error("Ingen data er slettet. Rett årsaken og kjør skriptet på nytt.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
