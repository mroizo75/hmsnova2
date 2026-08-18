import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_SECTIONS = [
  {
    sectionKey: "s2b",
    sectionNumber: "3",
    title: "Medvirkning og HMS-organisering",
    content:
      "<p>Hvordan ansatte medvirker i HMS-arbeidet. Verneombudets rolle, arbeidsmiljøutvalg (AMU) der det er påkrevd, og prosesser for at samlet kunnskap og erfaring utnyttes i HMS-arbeidet.</p>",
    legalRef: "IK-HMS § 5 nr. 3, AML § 6-1, § 6-2, § 7-1, § 7-2",
    moduleLink: null,
  },
  {
    sectionKey: "s2c",
    sectionNumber: "4",
    title: "Gjeldende lover og forskrifter",
    content:
      "<p>Oversikt over de lover og forskrifter i HMS-lovgivningen som gjelder for virksomheten, med særlig fokus på krav som er av spesiell viktighet for bedriftens bransje og aktiviteter.</p>",
    legalRef: "IK-HMS § 5 nr. 1",
    moduleLink: null,
  },
  {
    sectionKey: "s11b",
    sectionNumber: "14",
    title: "Varsling av kritikkverdige forhold",
    content:
      "<p>Varslingsrutiner, intern varslingskanal, behandlingsprosess for varsler og vern av varslere. Alle ansatte skal ha tilgang til informasjon om hvordan varsling foregår.</p>",
    legalRef: "AML § 2 A-1 til § 2 A-7, Varslerloven",
    moduleLink: null,
  },
] as const;

const SECTION_UPDATES: Record<
  string,
  {
    sectionNumber: string;
    sortOrder: number;
    title?: string;
    content?: string;
    legalRef?: string;
  }
> = {
  s1: {
    sectionNumber: "1",
    sortOrder: 1,
    title: "HMS-policy og mål",
    content:
      "<p>Bedriftens overordnede HMS-policy, konkrete mål for helse, miljø og sikkerhet, og hvordan disse følges opp. Målene skal være målbare og gjennomgås minimum årlig.</p>",
    legalRef: "IK-HMS § 5 nr. 4, AML § 3-1",
  },
  s2: {
    sectionNumber: "2",
    sortOrder: 2,
    legalRef: "IK-HMS § 5 nr. 5, AML § 3-1, § 6-1, § 6-2",
    content:
      "<p>Daglig leder, HMS-ansvarlig, verneombud, brannvernleder og organisasjonskart. Oversikt over hvordan ansvar, oppgaver og myndighet for HMS-arbeidet er fordelt.</p>",
  },
  s2b: { sectionNumber: "3", sortOrder: 3 },
  s2c: { sectionNumber: "4", sortOrder: 4 },
  s3: { sectionNumber: "5", sortOrder: 5 },
  s4: {
    sectionNumber: "6",
    sortOrder: 6,
    content:
      "<p>Avviksprosess, alvorlige hendelser, trendanalyse og RUH-rapportering. Meldeplikt til Arbeidstilsynet og politi ved alvorlige personskader og dødsfall.</p>",
    legalRef: "AML § 5-1, § 5-2, § 5-3, IK-HMS § 5 nr. 7",
  },
  s5: {
    sectionNumber: "7",
    sortOrder: 7,
    content:
      "<p>Kompetansekartlegging, påkrevd opplæring, opplæringsplan for nyansatte og dokumentasjon av gjennomført opplæring.</p>",
    legalRef: "AML § 3-2, IK-HMS § 5 nr. 2",
  },
  s6: { sectionNumber: "8", sortOrder: 8 },
  s7: { sectionNumber: "9", sortOrder: 9 },
  s8: { sectionNumber: "10", sortOrder: 10 },
  s9: { sectionNumber: "11", sortOrder: 11 },
  s10: { sectionNumber: "12", sortOrder: 12 },
  s11: { sectionNumber: "13", sortOrder: 13 },
  s11b: { sectionNumber: "14", sortOrder: 14 },
  s12: { sectionNumber: "15", sortOrder: 15 },
  s13: { sectionNumber: "16", sortOrder: 16 },
  s14: { sectionNumber: "17", sortOrder: 17 },
  s15: { sectionNumber: "18", sortOrder: 18 },
};

async function migrateHandbookSections() {
  console.log("=== Migrering av HMS-hånbok seksjoner ===\n");

  const versions = await prisma.handbookVersion.findMany({
    include: { sections: true },
  });

  console.log(`Fant ${versions.length} versjoner å oppdatere.\n`);

  for (const version of versions) {
    console.log(
      `Versjon ${version.version} (${version.id}) – ${version.sections.length} seksjoner`,
    );

    const existingKeys = new Set(version.sections.map((s) => s.sectionKey));

    for (const newSection of NEW_SECTIONS) {
      if (existingKeys.has(newSection.sectionKey)) {
        console.log(`  ✓ ${newSection.sectionKey} finnes allerede`);
        continue;
      }

      const sortOrder =
        SECTION_UPDATES[newSection.sectionKey]?.sortOrder ?? 99;

      await prisma.handbookSection.create({
        data: {
          versionId: version.id,
          sectionKey: newSection.sectionKey,
          sectionNumber: newSection.sectionNumber,
          title: newSection.title,
          content: newSection.content,
          legalRef: newSection.legalRef,
          sortOrder,
          moduleLink: newSection.moduleLink,
        },
      });
      console.log(`  + Opprettet ${newSection.sectionKey}: ${newSection.title}`);
    }

    for (const section of version.sections) {
      const update = SECTION_UPDATES[section.sectionKey];
      if (!update) continue;

      const data: Record<string, unknown> = {
        sectionNumber: update.sectionNumber,
        sortOrder: update.sortOrder,
      };

      if (update.title && section.title !== update.title) {
        data.title = update.title;
      }
      if (update.legalRef && section.legalRef !== update.legalRef) {
        data.legalRef = update.legalRef;
      }
      const sectionContentUnchanged =
        section.content.includes("Beskriv bedriftens HMS-styringssystem") ||
        section.content === update.content;

      if (
        update.content &&
        section.content.includes("Beskriv bedriftens HMS-styringssystem")
      ) {
        data.content = update.content;
      }

      await prisma.handbookSection.update({
        where: { id: section.id },
        data,
      });
      console.log(
        `  → Oppdatert ${section.sectionKey}: nr ${section.sectionNumber} → ${update.sectionNumber}`,
      );
    }

    console.log("");
  }

  console.log("=== Migrering fullført ===");
}

migrateHandbookSections()
  .catch((e) => {
    console.error("Feil under migrering:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
