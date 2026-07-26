/**
 * Trygg migrasjon for gjesteservice på Digital HMS Tavle.
 *
 * Kun additive endringer: nye kolonner, nye indekser og utvidede enum-lister.
 * Ingen DROP, ingen TRUNCATE, ingen reset – eksisterende kundedata røres ikke.
 * Skriptet er idempotent og kan kjøres flere ganger.
 *
 * Kjør: npm run db:migrate:gjesteservice
 * Tørrkjøring (viser bare hva som mangler): npm run db:migrate:gjesteservice -- --dry-run
 */

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const GJEST_TABELL = "TavleGuestSubmission";

/** Nye kolonner på TavleGuestSubmission. trackingToken håndteres separat. */
const NYE_KOLONNER: ReadonlyArray<{ navn: string; definisjon: string }> = [
  { navn: "locale", definisjon: "VARCHAR(191) NOT NULL DEFAULT 'nb'" },
  { navn: "priority", definisjon: "VARCHAR(191) NOT NULL DEFAULT 'NORMAL'" },
  { navn: "attachments", definisjon: "JSON NULL" },
  { navn: "consentContact", definisjon: "BOOLEAN NOT NULL DEFAULT false" },
  { navn: "internalNotes", definisjon: "TEXT NULL" },
  { navn: "assignedToId", definisjon: "VARCHAR(191) NULL" },
  { navn: "acknowledgedAt", definisjon: "DATETIME(3) NULL" },
  { navn: "closedAt", definisjon: "DATETIME(3) NULL" },
  { navn: "slaDueAt", definisjon: "DATETIME(3) NULL" },
  { navn: "escalatedAt", definisjon: "DATETIME(3) NULL" },
];

/** Nye enum-verdier. Legges bakerst i eksisterende liste slik at lagrede verdier beholdes. */
const NYE_ENUM_VERDIER: ReadonlyArray<{
  tabell: string;
  kolonne: string;
  verdi: string;
}> = [
  { tabell: "HmsTavleSection", kolonne: "type", verdi: "GJESTESERVICE_STATUS" },
  { tabell: "Notification", kolonne: "type", verdi: "GUEST_SUBMISSION" },
];

const NYE_INDEKSER: ReadonlyArray<{ navn: string; definisjon: string }> = [
  {
    navn: "TavleGuestSubmission_tavleId_status_createdAt_idx",
    definisjon: `CREATE INDEX \`TavleGuestSubmission_tavleId_status_createdAt_idx\` ON \`${GJEST_TABELL}\`(\`tavleId\`, \`status\`, \`createdAt\`)`,
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

async function hentKolonneType(
  tabell: string,
  kolonne: string
): Promise<{ type: string; nullable: boolean } | null> {
  const rader = await prisma.$queryRawUnsafe<
    Array<{ COLUMN_TYPE: string; IS_NULLABLE: string }>
  >(
    `SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND COLUMN_NAME = ?`,
    tabell,
    kolonne
  );
  const rad = rader[0];
  if (!rad) return null;
  return { type: rad.COLUMN_TYPE, nullable: rad.IS_NULLABLE === "YES" };
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
  for (const { navn, definisjon } of NYE_KOLONNER) {
    if (await kolonneFinnes(GJEST_TABELL, navn)) {
      console.log(`   = ${navn} finnes allerede`);
      continue;
    }
    await kjor(
      `ALTER TABLE \`${GJEST_TABELL}\` ADD COLUMN \`${navn}\` ${definisjon}`
    );
    console.log(`   + ${navn} lagt til`);
  }
}

/**
 * trackingToken må være unik og NOT NULL, men eksisterende rader har ingen verdi.
 * Derfor: legg til som NULL, fyll inn unike verdier, og stram inn til NOT NULL til slutt.
 */
async function leggTilTrackingToken(): Promise<void> {
  console.log("\n2) trackingToken (unik, NOT NULL)");

  if (!(await kolonneFinnes(GJEST_TABELL, "trackingToken"))) {
    await kjor(
      `ALTER TABLE \`${GJEST_TABELL}\` ADD COLUMN \`trackingToken\` VARCHAR(191) NULL`
    );
    console.log("   + kolonnen lagt til som NULL");
    if (dryRun) {
      console.log("   [tørrkjøring] hopper over backfill og NOT NULL");
      return;
    }
  } else {
    console.log("   = kolonnen finnes");
  }

  const manglerVerdi = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM \`${GJEST_TABELL}\` WHERE trackingToken IS NULL OR trackingToken = ''`
  );

  if (manglerVerdi.length > 0) {
    console.log(`   → fyller inn token for ${manglerVerdi.length} rad(er)`);
    for (const { id } of manglerVerdi) {
      await prisma.$executeRawUnsafe(
        `UPDATE \`${GJEST_TABELL}\` SET trackingToken = ? WHERE id = ?`,
        randomUUID().replace(/-/g, ""),
        id
      );
    }
  } else {
    console.log("   = alle rader har token");
  }

  const duplikater = await prisma.$queryRawUnsafe<
    Array<{ trackingToken: string; n: bigint }>
  >(
    `SELECT trackingToken, COUNT(*) AS n FROM \`${GJEST_TABELL}\`
     GROUP BY trackingToken HAVING COUNT(*) > 1`
  );
  if (duplikater.length > 0) {
    throw new Error(
      `Fant ${duplikater.length} duplikate trackingToken. Unik indeks kan ikke opprettes før disse er ryddet.`
    );
  }

  if (!(await indeksFinnes(GJEST_TABELL, "TavleGuestSubmission_trackingToken_key"))) {
    await kjor(
      `CREATE UNIQUE INDEX \`TavleGuestSubmission_trackingToken_key\` ON \`${GJEST_TABELL}\`(\`trackingToken\`)`
    );
    console.log("   + unik indeks opprettet");
  } else {
    console.log("   = unik indeks finnes");
  }

  const kolonne = await hentKolonneType(GJEST_TABELL, "trackingToken");
  if (kolonne?.nullable) {
    await kjor(
      `ALTER TABLE \`${GJEST_TABELL}\` MODIFY COLUMN \`trackingToken\` VARCHAR(191) NOT NULL`
    );
    console.log("   + strammet inn til NOT NULL");
  } else {
    console.log("   = allerede NOT NULL");
  }
}

/**
 * Utvider enum-lister ved å lese gjeldende definisjon fra databasen og legge den
 * nye verdien bakerst. Ingen eksisterende verdi fjernes, så lagrede rader beholdes.
 */
async function utvidEnumVerdier(): Promise<void> {
  console.log("\n3) Enum-verdier");
  for (const { tabell, kolonne, verdi } of NYE_ENUM_VERDIER) {
    const gjeldende = await hentKolonneType(tabell, kolonne);
    if (!gjeldende) {
      console.log(`   ! ${tabell}.${kolonne} finnes ikke – hoppet over`);
      continue;
    }
    if (gjeldende.type.includes(`'${verdi}'`)) {
      console.log(`   = ${tabell}.${kolonne} har allerede ${verdi}`);
      continue;
    }
    const utvidet = gjeldende.type.replace(/\)$/, `,'${verdi}')`);
    const nullbarhet = gjeldende.nullable ? "NULL" : "NOT NULL";
    await kjor(
      `ALTER TABLE \`${tabell}\` MODIFY COLUMN \`${kolonne}\` ${utvidet} ${nullbarhet}`
    );
    console.log(`   + ${verdi} lagt til i ${tabell}.${kolonne}`);
  }
}

async function leggTilIndekser(): Promise<void> {
  console.log("\n4) Indekser");
  for (const { navn, definisjon } of NYE_INDEKSER) {
    if (await indeksFinnes(GJEST_TABELL, navn)) {
      console.log(`   = ${navn} finnes allerede`);
      continue;
    }
    await kjor(definisjon);
    console.log(`   + ${navn} opprettet`);
  }
}

async function main(): Promise<void> {
  console.log(
    dryRun
      ? "Tørrkjøring – ingen endringer skrives til databasen."
      : "Migrerer gjesteservice-felter. Kun additive endringer."
  );

  const [{ n }] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM \`${GJEST_TABELL}\``
  );
  console.log(`Eksisterende gjestmeldinger: ${Number(n)}`);

  await leggTilKolonner();
  await leggTilTrackingToken();
  await utvidEnumVerdier();
  await leggTilIndekser();

  console.log(
    dryRun ? "\nTørrkjøring fullført." : "\nMigrasjon fullført uten datatap."
  );
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
