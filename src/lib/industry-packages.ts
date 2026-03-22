export interface SupportedIndustryOption {
  value: string;
  label: string;
  templates: number;
}

export interface IndustryRiskSeed {
  title: string;
  context: string;
  category: "SAFETY" | "HEALTH" | "ENVIRONMENTAL" | "OPERATIONAL";
  likelihood: number;
  consequence: number;
  controls: string;
}

export interface IndustrySjaHazardSeed {
  activity: string;
  hazard: string;
  consequence: string;
  probability: number;
  severity: number;
  measures: string;
}

export interface IndustrySjaTemplateSeed {
  name: string;
  description: string;
  workLocation: string;
  hazards: IndustrySjaHazardSeed[];
}

export interface IndustryInspectionTemplateSeed {
  name: string;
  description: string;
  category: string;
  riskCategory: "SAFETY" | "HEALTH" | "ENVIRONMENTAL" | "OPERATIONAL";
  checklist: {
    items: Array<{ type: "heading" | "item"; title: string; checked?: boolean }>;
  };
}

export interface IndustryCourseTemplateSeed {
  courseKey: string;
  title: string;
  description: string;
  isRequired: boolean;
  validityYears: number | null;
}

export interface IndustryLegalReferenceSeed {
  title: string;
  paragraphRef: string;
  description: string;
  sourceUrl: string;
}

export interface IndustryPackage {
  industry: string;
  displayName: string;
  farmTypes: ReadonlyArray<{ value: string; label: string }>;
  simpleMenuHrefs: ReadonlyArray<string>;
  risks: ReadonlyArray<IndustryRiskSeed>;
  sjaTemplates: ReadonlyArray<IndustrySjaTemplateSeed>;
  inspectionTemplates: ReadonlyArray<IndustryInspectionTemplateSeed>;
  courseTemplates: ReadonlyArray<IndustryCourseTemplateSeed>;
  legalReferences: ReadonlyArray<IndustryLegalReferenceSeed>;
}

export const SUPPORTED_INDUSTRIES: ReadonlyArray<SupportedIndustryOption> = [
  { value: "construction", label: "Bygg og anlegg", templates: 25 },
  { value: "healthcare", label: "Helsevesen", templates: 20 },
  { value: "manufacturing", label: "Industri og produksjon", templates: 30 },
  { value: "retail", label: "Handel og service", templates: 15 },
  { value: "transport", label: "Transport og logistikk", templates: 22 },
  { value: "hospitality", label: "Hotell og restaurant", templates: 18 },
  { value: "education", label: "Utdanning", templates: 12 },
  { value: "technology", label: "Teknologi og IT", templates: 10 },
  { value: "agriculture", label: "Landbruk", templates: 16 },
  { value: "other", label: "Annet", templates: 8 },
];

const INDUSTRY_ALIASES: Readonly<Record<string, string>> = {
  bygg: "construction",
  "bygg og anlegg": "construction",
  helse: "healthcare",
  helsevesen: "healthcare",
  health: "healthcare",
  "transport og logistikk": "transport",
  "industri og produksjon": "manufacturing",
  "handel og service": "retail",
  "hotell og restaurant": "hospitality",
  utdanning: "education",
  "teknologi og it": "technology",
  landbruk: "agriculture",
  annet: "other",
};

export const AGRICULTURE_FARM_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "milk_production", label: "Melkeproduksjon" },
  { value: "cattle_meat", label: "Storfe / kjøttproduksjon" },
  { value: "sheep_goat", label: "Sau / geit" },
  { value: "grain_crop", label: "Korn / planteproduksjon" },
  { value: "vegetables_fruit_berries", label: "Grønnsaker / frukt / bær" },
  { value: "mixed_farm", label: "Kombinasjonsgård" },
];

const agriculturePackage: IndustryPackage = {
  industry: "agriculture",
  displayName: "Landbruk",
  farmTypes: AGRICULTURE_FARM_TYPES,
  simpleMenuHrefs: ["/dashboard/incidents", "/dashboard/inspections", "/dashboard/sja"],
  risks: [
    {
      title: "Arbeid med traktor",
      context: "Risiko for velt, klemskade og påkjørsel ved arbeid med traktor og redskap.",
      category: "SAFETY",
      likelihood: 3,
      consequence: 4,
      controls: "Daglig kontroll av traktor, beltebruk og tydelige kjøreruter.",
    },
    {
      title: "Arbeid med dyr",
      context: "Risiko for spark, bitt og klemskader ved håndtering av storfe, sau eller geit.",
      category: "SAFETY",
      likelihood: 3,
      consequence: 3,
      controls: "Sikre drivganger, rolig håndtering og to-personers rutine ved behov.",
    },
    {
      title: "Håndtering av rundballer",
      context: "Risiko for fallende last, klemskader og feil lagring av rundballer.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 4,
      controls: "Stabil lagring, godkjent løfteutstyr og avsperret område ved flytting.",
    },
    {
      title: "Alenearbeid",
      context: "Risiko ved arbeid alene i fjøs, verksted eller ute på jordet uten rask assistanse.",
      category: "HEALTH",
      likelihood: 3,
      consequence: 4,
      controls: "Sjekk-inn rutine, nødkommunikasjon og avklart responstid ved manglende kontakt.",
    },
    {
      title: "Kjemikalier og plantevernmidler",
      context: "Risiko for eksponering ved lagring, blanding og bruk av kjemikalier.",
      category: "ENVIRONMENTAL",
      likelihood: 2,
      consequence: 4,
      controls: "Oppdatert stoffkartotek, SDS tilgjengelig, riktig PPE og låst kjemikalielager.",
    },
    {
      title: "Støv og gasser i fjøs",
      context: "Risiko for luftveisplager, forgiftning eller oksygenmangel i fjøs og gjødsellager.",
      category: "HEALTH",
      likelihood: 3,
      consequence: 5,
      controls: "Ventilasjon, gassmåling ved behov og forbud mot arbeid alene i risikosoner.",
    },
    {
      title: "Arbeid i høyden",
      context: "Risiko ved arbeid på tak, stige eller høyloft med fare for fallulykker.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "Fallsikring, stige-kontroll og krav om SJA før arbeid på tak/høyde.",
    },
  ],
  sjaTemplates: [
    {
      name: "Vedlikehold av maskiner",
      description: "SJA-mal for sikkert vedlikehold av traktor og maskiner.",
      workLocation: "Verksted / maskinhall",
      hazards: [
        {
          activity: "Service på maskin",
          hazard: "Utilsiktet oppstart",
          consequence: "Klemskade eller amputasjon",
          probability: 2,
          severity: 5,
          measures: "Stopp, frakoble energi og bruk lås/merking før arbeid.",
        },
      ],
    },
    {
      name: "Arbeid i silo",
      description: "SJA-mal for arbeid i og rundt silo.",
      workLocation: "Silo / fôrlager",
      hazards: [
        {
          activity: "Inspeksjon i silo",
          hazard: "Gass og oksygenmangel",
          consequence: "Bevisstløshet eller alvorlig personskade",
          probability: 2,
          severity: 5,
          measures: "Mål luftkvalitet, bruk sikring og aldri arbeid alene i silo.",
        },
      ],
    },
    {
      name: "Håndtering av dyr",
      description: "SJA-mal ved flytting og behandling av dyr.",
      workLocation: "Fjøs",
      hazards: [
        {
          activity: "Flytte dyr mellom binger",
          hazard: "Spark og klem",
          consequence: "Skade på armer, ben eller rygg",
          probability: 3,
          severity: 3,
          measures: "Bruk sikre drivganger, riktig plassering og rolig tempo.",
        },
      ],
    },
    {
      name: "Arbeid på tak",
      description: "SJA-mal før reparasjon av tak på låve/fjøs.",
      workLocation: "Tak / høyde",
      hazards: [
        {
          activity: "Takreparasjon",
          hazard: "Fall fra høyde",
          consequence: "Alvorlig personskade eller død",
          probability: 2,
          severity: 5,
          measures: "Bruk fallsikring, sperr område under og jobb minst to personer.",
        },
      ],
    },
    {
      name: "Alenearbeid ute på gården",
      description: "SJA-mal for oppgaver som utføres alene.",
      workLocation: "Gård / jordet",
      hazards: [
        {
          activity: "Arbeid alene",
          hazard: "Ingen rask hjelp ved ulykke",
          consequence: "Forsinket hjelp og forverret skade",
          probability: 3,
          severity: 4,
          measures: "Definer sjekk-inn tider, bruk telefon/radio og avtal nødprosedyre.",
        },
      ],
    },
  ],
  inspectionTemplates: [
    {
      name: "Vernerunde – Fjøs",
      description: "Rutinekontroll av sikkerhet, orden og ventilasjon i fjøs.",
      category: "FJOS",
      riskCategory: "HEALTH",
      checklist: {
        items: [
          { type: "heading", title: "Fjøs og dyreområde" },
          { type: "item", title: "Rømningsveier er frie og merket", checked: false },
          { type: "item", title: "Ventilasjon fungerer tilfredsstillende", checked: false },
          { type: "item", title: "Gangareal er ryddet for snublefare", checked: false },
        ],
      },
    },
    {
      name: "Vernerunde – Verksted",
      description: "Kontroll av maskinsikkerhet og orden i verksted.",
      category: "VERKSTED",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Verksted" },
          { type: "item", title: "Maskinvern og nødstopp fungerer", checked: false },
          { type: "item", title: "Løfteutstyr er kontrollert", checked: false },
          { type: "item", title: "Brannslukker er tilgjengelig og kontrollert", checked: false },
        ],
      },
    },
    {
      name: "Vernerunde – Maskiner",
      description: "Kontroll av traktor og gårdsmaskiner.",
      category: "MASKINER",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Maskiner" },
          { type: "item", title: "Daglig sjekk av traktor er utført", checked: false },
          { type: "item", title: "PTO-vern og skjerming er på plass", checked: false },
          { type: "item", title: "Bremser og lys fungerer", checked: false },
        ],
      },
    },
    {
      name: "Vernerunde – Kjemikalielager",
      description: "Kontroll av lagring og merking av kjemikalier.",
      category: "KJEMIKALIER",
      riskCategory: "ENVIRONMENTAL",
      checklist: {
        items: [
          { type: "heading", title: "Kjemikalier" },
          { type: "item", title: "Alle beholdere er korrekt merket", checked: false },
          { type: "item", title: "Sikkerhetsdatablad er tilgjengelige", checked: false },
          { type: "item", title: "Spillvern og absorpsjonsmiddel er tilgjengelig", checked: false },
        ],
      },
    },
    {
      name: "Vernerunde – Brannvern",
      description: "Kontroll av brannforebygging på gården.",
      category: "BRANN",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Brannvern" },
          { type: "item", title: "Brannslukkere er kontrollert og plombert", checked: false },
          { type: "item", title: "El-tavler er frie for støv og brennbart materiale", checked: false },
          { type: "item", title: "Evakueringsrutiner er kjent", checked: false },
        ],
      },
    },
  ],
  courseTemplates: [
    {
      courseKey: "agri-tractor-safety",
      title: "Sikker bruk av traktor og redskap",
      description: "Praktisk sikkerhet ved kjøring og bruk av redskap på gården.",
      isRequired: true,
      validityYears: 3,
    },
    {
      courseKey: "agri-animal-handling",
      title: "Sikker håndtering av dyr",
      description: "Forebygging av personskade ved arbeid med dyr i fjøs og beite.",
      isRequired: true,
      validityYears: 2,
    },
    {
      courseKey: "agri-working-alone",
      title: "Alenearbeid og beredskap",
      description: "Rutiner for kommunikasjon, risikovurdering og respons ved alenearbeid.",
      isRequired: true,
      validityYears: 2,
    },
  ],
  legalReferences: [
    {
      title: "Arbeidsmiljøloven",
      paragraphRef: "§ 2-3",
      description: "Arbeidstaker skal medvirke i HMS-arbeidet og melde fra om feil og farer.",
      sourceUrl: "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
    },
    {
      title: "Arbeidsmiljøloven",
      paragraphRef: "§ 3-1",
      description: "Arbeidsgiver skal sikre systematisk HMS-arbeid og risikovurdering.",
      sourceUrl: "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
    },
    {
      title: "Arbeidsmiljøloven",
      paragraphRef: "§ 5-2",
      description: "Alvorlige arbeidsulykker skal varsles umiddelbart og meldes skriftlig.",
      sourceUrl: "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
    },
    {
      title: "Internkontrollforskriften",
      paragraphRef: "§ 5",
      description: "Virksomheten skal kartlegge farer, vurdere risiko og lage tilhørende tiltak.",
      sourceUrl: "https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127",
    },
    {
      title: "Forskrift om utførelse av arbeid",
      paragraphRef: "Kapittel 3",
      description: "Krav ved arbeid med kjemiske og biologiske risikofaktorer.",
      sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1357/KAPITTEL_3",
    },
  ],
};

export const INDUSTRY_PACKAGES: Readonly<Record<string, IndustryPackage>> = {
  agriculture: agriculturePackage,
};

export function getIndustryPackage(industry: string | null | undefined): IndustryPackage | null {
  if (!industry) {
    return null;
  }

  const normalizedIndustry = normalizeIndustryValue(industry);
  return INDUSTRY_PACKAGES[normalizedIndustry] ?? null;
}

export function getIndustryLabel(industry: string): string {
  const normalizedIndustry = normalizeIndustryValue(industry);
  const option = SUPPORTED_INDUSTRIES.find((item) => item.value === normalizedIndustry);
  return option?.label ?? industry;
}

export function isSupportedIndustry(industry: string | null | undefined): boolean {
  if (!industry) {
    return false;
  }
  const normalizedIndustry = normalizeIndustryValue(industry);
  return SUPPORTED_INDUSTRIES.some((item) => item.value === normalizedIndustry);
}

export function normalizeIndustryValue(industry: string | null | undefined): string {
  if (!industry) {
    return "";
  }

  const normalized = industry.trim().toLowerCase();
  return INDUSTRY_ALIASES[normalized] ?? normalized;
}
