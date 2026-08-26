import { PrismaClient } from "@prisma/client";

/**
 * Seed BCM (Business Continuity Management) document templates and form templates.
 * ISO 22301 — Beredskaps- og kontinuitetsstyring.
 */
export const BCM_DOCUMENT_TEMPLATES = [
  {
    name: "Krisehåndbok",
    category: "BCM",
    description:
      "Komplett krisehåndbok med varslingsmatrise, eskaleringsplan, roller og ansvar, samt mediehåndtering ved alvorlige hendelser.",
    defaultReviewIntervalMonths: 12,
    isGlobal: true,
  },
  {
    name: "Varslingsliste kriseteam",
    category: "BCM",
    description:
      "Kontaktliste over kriseteammedlemmer med mobilnummer, stedfortreder, rolle og tilgjengelighet (døgnvakt).",
    defaultReviewIntervalMonths: 6,
    isGlobal: true,
  },
  {
    name: "BIA — Business Impact Analysis",
    category: "BCM",
    description:
      "Analyse av kritiske prosesser med RTO (Recovery Time Objective), RPO (Recovery Point Objective) og konsekvensgradering ved driftsavbrudd.",
    defaultReviewIntervalMonths: 12,
    isGlobal: true,
  },
  {
    name: "Øvelsesrapport (BCM)",
    category: "BCM",
    description:
      "Dokumentasjonsmal for gjennomført beredskapsøvelse: mål, scenario, deltakere, observasjoner, forbedringstiltak og ansvarlig.",
    defaultReviewIntervalMonths: 12,
    isGlobal: true,
  },
  {
    name: "Gjenopprettingsplan",
    category: "BCM",
    description:
      "Plan for gjenoppretting av kritiske prosesser etter driftsavbrudd, inkludert tiltaksliste, tidsfrister og ansvarlige.",
    defaultReviewIntervalMonths: 12,
    isGlobal: true,
  },
];

export const BCM_WIZARD_FORM_TEMPLATE = {
  title: "Beredskapsplan — veiviser",
  description:
    "Steg-for-steg opprettelse av beredskapsplan for din virksomhet. Dekker kritiske prosesser, kriseteam, risikoscenarier og gjenopprettingstiltak.",
  category: "BCM",
  isGlobal: true,
  isActive: true,
  requiresSignature: false,
  requiresApproval: true,
  allowTenantDeletion: false,
  fields: [
    {
      fieldType: "SELECT",
      label: "Kritiske prosesser",
      description: "Velg prosesser som er avgjørende for virksomhetens drift (flere kan velges)",
      isRequired: true,
      order: 1,
      options: JSON.stringify([
        "Produksjon / leveranse",
        "IT-systemer og infrastruktur",
        "Kundeservice / support",
        "Forsyningskjede / logistikk",
        "Økonomi / fakturering",
        "Personalforvaltning / lønn",
        "Kommunikasjon (intern/ekstern)",
        "Salg og markedsføring",
        "Lager / varemottak",
        "Annet (spesifiser i tiltak)",
      ]),
    },
    {
      fieldType: "TEXTAREA",
      label: "Kriseteam — kontaktliste",
      description: "Legg inn nøkkelpersonell med rolle, telefon og stedfortreder (ett medlem per linje: Navn | Rolle | Mobil | E-post | Stedfortreder)",
      isRequired: true,
      order: 2,
      options: null,
    },
    {
      fieldType: "SELECT",
      label: "Risikoscenarier",
      description: "Velg trusler som er relevante for virksomheten (flere kan velges)",
      isRequired: true,
      order: 3,
      options: JSON.stringify([
        "Brann i lokaler",
        "IT-utfall / systemfeil",
        "Cyberangrep / datainnbrudd",
        "Strømbrudd (langvarig)",
        "Leverandørsvikt",
        "Pandemi / smitteutbrudd",
        "Naturkatastrofe (flom, storm)",
        "Nøkkelperson utilgjengelig",
        "Vannlekkasje / bygningsskade",
        "Transport- / logistikkbrudd",
      ]),
    },
    {
      fieldType: "TEXTAREA",
      label: "Gjenopprettingstiltak",
      description:
        "Beskriv for hvert scenario: hva gjøres, hvem er ansvarlig, maks akseptabel nedetid (RTO), og prioritet.",
      isRequired: true,
      order: 4,
      options: null,
    },
    {
      fieldType: "TEXTAREA",
      label: "Kommunikasjonsplan",
      description:
        "Hvordan informeres ansatte, kunder, leverandører og myndigheter ved en krise? Hvem uttaler seg til media?",
      isRequired: false,
      order: 5,
      options: null,
    },
    {
      fieldType: "DATE",
      label: "Neste gjennomgang",
      description: "Dato for neste planlagte gjennomgang av beredskapsplanen",
      isRequired: false,
      order: 6,
      options: null,
    },
  ],
};

export async function seedBcmTemplates(prisma: PrismaClient): Promise<void> {
  console.log("🌱 Seeder BCM-maler...");

  let docCreated = 0;
  let docSkipped = 0;

  for (const template of BCM_DOCUMENT_TEMPLATES) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { name: template.name, isGlobal: true, category: "BCM" },
    });
    if (existing) {
      docSkipped++;
      continue;
    }
    await prisma.documentTemplate.create({ data: template });
    docCreated++;
  }

  const existingForm = await prisma.formTemplate.findFirst({
    where: { title: BCM_WIZARD_FORM_TEMPLATE.title, isGlobal: true, category: "BCM" },
  });

  let formCreated = 0;
  if (!existingForm) {
    const { fields, ...formData } = BCM_WIZARD_FORM_TEMPLATE;
    const form = await prisma.formTemplate.create({
      data: { ...formData, createdBy: "system" } as any,
    });
    for (const field of fields) {
      await prisma.formField.create({
        data: { ...field, formTemplateId: form.id } as any,
      });
    }
    formCreated = 1;
  }

  console.log(
    `✅ BCM-maler: ${docCreated} dokumentmaler opprettet (${docSkipped} eksisterte), ${formCreated} skjemamal opprettet`,
  );
}
