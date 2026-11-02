/**
 * Offentlig funksjonsliste for forsiden.
 * Skal speile dashboard-menyen (DASHBOARD_NAV_CONFIG), unntatt oversikt,
 * innstillinger og hjelp. Testen i tests/public-feature-catalog.test.ts
 * feiler hvis en ny modul ikke er med her.
 *
 * Lovgrunnlag der funksjonen er pliktig: AML, IK-HMS § 5, ISO 9001/14001/45001.
 */

export type PublicFeature = {
  name: string;
  description: string;
  /** Offentlig artikkelside, når den finnes. */
  href?: string;
  /** Dashboard-rute funksjonen tilsvarer. */
  moduleHref?: string;
};

export type PublicFeatureGroup = {
  id: string;
  title: string;
  features: PublicFeature[];
};

export const PUBLIC_FEATURE_GROUPS: PublicFeatureGroup[] = [
  {
    id: "avvik",
    title: "Avvik og tiltak",
    features: [
      {
        name: "Avvik og hendelser",
        description:
          "Ulykke, nestenulykke, farlig situasjon og yrkessykdom. Rotårsak med 5 Whys, og melding til NAV ved yrkesskade. AML § 5-1 og § 5-2.",
        href: "/hms-system/avvikshandtering",
        moduleHref: "/dashboard/incidents",
      },
      {
        name: "Tiltak",
        description: "Korrigerende tiltak med frist, ansvarlig og status til saken er lukket. IK-HMS § 5 punkt 7.",
        moduleHref: "/dashboard/actions",
      },
      {
        name: "HSE-statistikk",
        description: "TRIR, skader og sykefravær samlet for rapportering. AML § 5-1 (4).",
        moduleHref: "/dashboard/incidents/statistics",
      },
      {
        name: "Kundeklager",
        description: "Reklamasjoner registreres, følges opp og lukkes med sporbarhet.",
        moduleHref: "/dashboard/complaints",
      },
      {
        name: "Tilbakemeldinger",
        description: "Kundetilfredshet med egen lenke ut til kunden. ISO 9001 kap. 9.1.2.",
        moduleHref: "/dashboard/feedback",
      },
      {
        name: "Varsling",
        description: "Anonym kanal for kritikkverdige forhold, med sporbar dialog. AML kap. 2A.",
        href: "/hms-system/varsling",
        moduleHref: "/dashboard/whistleblowing",
      },
      {
        name: "Konfidensielle oppgaver",
        description: "Saker som bare utvalgte roller ser.",
        moduleHref: "/konfidensielt",
      },
    ],
  },
  {
    id: "dokumentasjon",
    title: "Dokumentasjon",
    features: [
      {
        name: "HMS-håndbok",
        description: "Levende håndbok med versjon, signering og bransjetilpasning. IK-HMS § 5.",
        href: "/hms-handbok",
        moduleHref: "/dashboard/hms-handbok",
      },
      {
        name: "Dokumentstyring",
        description: "Versjon, godkjenning og lesebekreftelse. Påminnelse når dokumentet skal gjennomgås.",
        href: "/hms-system/dokumenter",
        moduleHref: "/dashboard/documents",
      },
      {
        name: "Rutiner og prosedyrer",
        description: "Versjonerte rutiner med lesebekreftelse og gjennomgang.",
        moduleHref: "/dashboard/rutiner",
      },
      {
        name: "Malbibliotek",
        description: "Ferdige maler dere kan ta i bruk og tilpasse.",
        moduleHref: "/dashboard/maler",
      },
      {
        name: "Juridisk register",
        description: "Lover og forskrifter som gjelder bedriften, med kobling til eget HMS-arbeid.",
        moduleHref: "/dashboard/juridisk-register",
      },
      {
        name: "Årlig HMS-plan",
        description: "Årshjul med aktiviteter, frister og ansvarlige.",
        moduleHref: "/dashboard/annual-hms-plan",
      },
      {
        name: "Leverandører",
        description: "Vurdering og oppfølging av leverandører. ISO 9001 kap. 8.4.",
        moduleHref: "/dashboard/leverandorer",
      },
      {
        name: "Digital signatur",
        description: "Ansatte signerer dokumenter, rutiner og sjekklister. Tidsstempel inkludert i prisen.",
        href: "/hms-system/digital-signatur",
      },
    ],
  },
  {
    id: "risiko",
    title: "Risiko og arbeidsmiljø",
    features: [
      {
        name: "Risikovurdering",
        description: "5×5-matrise, bransjemaler og tiltak. IK-HMS § 5 punkt 6 og ISO 9001 kap. 6.1.",
        href: "/hms-system/risikovurdering",
        moduleHref: "/dashboard/risks",
      },
      {
        name: "Risikoregister",
        description: "Samlet oversikt over vurderte risikoer og status på tiltak.",
        moduleHref: "/dashboard/risk-register",
      },
      {
        name: "SJA",
        description: "Sikker jobb-analyse før oppgaven starter, med signering fra de som er med.",
        href: "/hms-system/sja",
        moduleHref: "/dashboard/sja",
      },
      {
        name: "Endringsledelse (MOC)",
        description: "Risiko vurderes før endring i utstyr, prosess eller organisasjon.",
        moduleHref: "/dashboard/moc",
      },
      {
        name: "Stoffkartotek",
        description: "Kjemikalier med sikkerhetsdatablad. Forskrift om utførelse av arbeid.",
        href: "/hms-system/stoffkartotek",
        moduleHref: "/dashboard/chemicals",
      },
      {
        name: "Eksponeringsregister",
        description: "Hvem som er eksponert, for hva, hvor lenge, og målt verdi mot grenseverdi. 60 års lagring.",
        moduleHref: "/dashboard/exposure-register",
      },
      {
        name: "Vernerunder",
        description: "Sjekkliste og bilder fra mobil. Funn blir tiltak. AML § 6-2.",
        href: "/hms-system/vernerunde",
        moduleHref: "/dashboard/inspections",
      },
      {
        name: "Sjekklister",
        description: "Egne lister som ansatte og ledere fyller ut, med historikk på innsendinger.",
        moduleHref: "/dashboard/sjekklister",
      },
      {
        name: "Brannøvelser",
        description: "Plan, gjennomføring og dokumentasjon av øvelser.",
        moduleHref: "/dashboard/fire-drills",
      },
      {
        name: "Psykososial puls",
        description: "Anonyme undersøkelser av trivsel og arbeidsmiljø. AML § 4-3.",
        href: "/hms-system/psykososialt-arbeidsmiljo",
        moduleHref: "/dashboard/wellbeing",
      },
      {
        name: "Miljø",
        description: "Miljøaspekter og oppfølging, i tråd med ISO 14001.",
        moduleHref: "/dashboard/environment",
      },
      {
        name: "Beredskap",
        description: "Beredskapsplaner, varslingslister, øvelser og krisehendelser.",
        moduleHref: "/dashboard/bcm",
      },
      {
        name: "Revisjoner",
        description: "Internrevisjon med sjekklister, også for ISO 9001.",
        href: "/hms-system/iso-9001",
        moduleHref: "/dashboard/audits",
      },
    ],
  },
  {
    id: "bransje",
    title: "Bransjemoduler",
    features: [
      {
        name: "Bygg og anlegg",
        description: "Byggherrens SHA-plan på prosjektet, og entreprenørens egen HMS-plan. Byggherreforskriften § 5 og § 7–9.",
        moduleHref: "/dashboard/construction-compliance",
      },
      {
        name: "Utstyr med godkjenning",
        description: "Sakkyndig kontroll, attest og utstyr som tas ut av bruk. Forskrift om utførelse av arbeid kap. 12 og 13.",
        moduleHref: "/dashboard/utstyr",
      },
      {
        name: "Samsvarserklæringer",
        description: "Elektronisk samsvar for elektro, etter NEK 400 og FEL.",
        moduleHref: "/dashboard/samsvarserklaringer",
      },
      {
        name: "IK-mat",
        description: "Temperatur, varemottak, renhold, allergener, sporbarhet og HACCP.",
        moduleHref: "/dashboard/ik-mat",
      },
      {
        name: "Skjenking",
        description: "Alderskontroll, beruselse, bortvisning og internkontroll for skjenkebevilling.",
        moduleHref: "/dashboard/skjenking",
      },
      {
        name: "Aktivitetssikkerhet",
        description: "Risikovurdering av opplevelser, aktiviteter og guidede turer.",
        moduleHref: "/dashboard/aktivitetssikkerhet",
      },
      {
        name: "Transport",
        description: "Kjøretøykontroll, sjåførkompetanse og transportdokumentasjon.",
        moduleHref: "/dashboard/transport",
      },
      {
        name: "BHT og nattarbeid",
        description: "Oppfølging av nattarbeidere og kobling mot bedriftshelsetjeneste.",
        moduleHref: "/dashboard/bht-nattarbeid",
      },
    ],
  },
  {
    id: "organisasjon",
    title: "Organisasjon og personal",
    features: [
      {
        name: "Prosjekter",
        description: "Prosjekt med HMS, timer og overføring til Tripletex.",
        moduleHref: "/dashboard/projects",
      },
      {
        name: "Timeregistrering",
        description: "Ordinær tid og overtid, med godkjenning. Arbeidstidsloven kap. 10.",
        moduleHref: "/dashboard/time-registration",
      },
      {
        name: "Kompetanse",
        description: "Kompetansematrise, kurs og varsel før sertifikat utløper.",
        moduleHref: "/dashboard/training",
      },
      {
        name: "Møter",
        description: "AMU og verneombud, med innkalling, referat og oppfølging.",
        moduleHref: "/dashboard/meetings",
      },
      {
        name: "Ledelsens gjennomgang",
        description: "Fast gjennomgang av HMS- og kvalitetsarbeidet. ISO 9001 kap. 9.3.",
        moduleHref: "/dashboard/management-reviews",
      },
      {
        name: "Organisasjonskart",
        description: "Roller, linje og stedfortreder, synlig for ansatte.",
        moduleHref: "/dashboard/organisasjonskart",
      },
      {
        name: "Brukere og roller",
        description: "Ubegrenset antall brukere, med tilgang etter rolle.",
        moduleHref: "/dashboard/brukere",
      },
      {
        name: "Aktivitetslogg",
        description: "Hvem som endret hva, og når.",
        moduleHref: "/dashboard/aktivitetslogg",
      },
      {
        name: "HR",
        description: "Samlet inngang til personal, fravær og oppfølging.",
        moduleHref: "/dashboard/hr",
      },
      {
        name: "Personalarkiv",
        description: "Ansattdokumenter samlet per person. GDPR art. 5.",
        moduleHref: "/dashboard/personalarkiv",
      },
      {
        name: "Fravær og ferie",
        description: "Registrering og oversikt, grunnlag for fraværsstatistikk. AML § 5-1.",
        moduleHref: "/dashboard/fravaer",
      },
      {
        name: "Onboarding og offboarding",
        description: "Sjekklister når noen starter, og når arbeidsforholdet avsluttes.",
        moduleHref: "/dashboard/onboarding",
      },
      {
        name: "Medarbeidersamtaler",
        description: "Samtale, referat og oppfølging.",
        moduleHref: "/dashboard/medarbeidersamtale",
      },
      {
        name: "Avdelinger",
        description: "Organisering og tilgang per avdeling.",
        moduleHref: "/dashboard/avdelinger",
      },
    ],
  },
  {
    id: "oversikt",
    title: "Oversikt og konsern",
    features: [
      {
        name: "HMS Cockpit",
        description: "Status på avvik, risiko, frister og det som haster.",
        moduleHref: "/dashboard/hms-cockpit",
      },
      {
        name: "Digital HMS-tavle",
        description: "Tavle på byggeplass, i resepsjon eller på pausearealet. Innsjekk og rapportering for underentreprenører.",
        href: "/digital-hms-tavle",
        moduleHref: "/dashboard/hms-tavle",
      },
      {
        name: "Mål og KPI",
        description: "Mål, status og oppfølging gjennom året.",
        moduleHref: "/dashboard/goals",
      },
      {
        name: "Bransje-benchmark",
        description: "Sammenlign egne nøkkeltall med andre i samme bransje.",
        moduleHref: "/dashboard/benchmark",
      },
      {
        name: "Konsernportal",
        description: "Flere selskaper, felles rutiner og samlet rapportering.",
        href: "/hms-system/konsern",
      },
      {
        name: "Konsernmeldinger",
        description: "Meldinger fra konsernet til selskapene.",
        moduleHref: "/dashboard/meldinger",
      },
    ],
  },
  {
    id: "plattform",
    title: "Med i plattformen",
    features: [
      {
        name: "Mobilapp",
        description: "iOS og Android. Avvik, vernerunde og SJA virker offline og synkroniseres når nettet er tilbake.",
      },
      {
        name: "Tripletex",
        description: "Godkjente timer, prosjekt og varer blir grunnlag i Tripletex.",
        href: "/tripletex-integrasjon",
      },
      {
        name: "Automatiske varsler",
        description: "Påminnelse om frist, sertifikat, dokumentgjennomgang og åpen sak.",
      },
      {
        name: "Tale-til-tekst",
        description: "Diktering i mobilappen, så avvik og notater skrives uten tastatur.",
      },
      {
        name: "AI-assistent",
        description: "Utkast og forslag til avvik, SJA, vernerunde, brannøvelse og beredskap.",
      },
      {
        name: "API",
        description: "Tilgang for integrasjon mot andre systemer.",
      },
    ],
  },
];

export const PUBLIC_FEATURE_COUNT = PUBLIC_FEATURE_GROUPS.reduce(
  (sum, group) => sum + group.features.length,
  0
);

export const PUBLIC_FEATURE_NAMES = PUBLIC_FEATURE_GROUPS.flatMap((group) =>
  group.features.map((feature) => feature.name)
);
