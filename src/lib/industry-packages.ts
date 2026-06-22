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
  { value: "elektro", label: "Elektro og energi", templates: 28 },
  { value: "offshore", label: "Offshore og petroleum", templates: 32 },
  { value: "marine", label: "Maritime og sjøfart", templates: 26 },
  { value: "oil_gas", label: "Olje og gass", templates: 30 },
  { value: "fiskeri", label: "Fiskeri og havbruk", templates: 22 },
  { value: "bergverk", label: "Bergverk og gruvedrift", templates: 24 },
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
  "elektro og energi": "elektro",
  energi: "elektro",
  electrical: "elektro",
  "offshore og petroleum": "offshore",
  petroleum: "offshore",
  "oil and gas": "oil_gas",
  "olje og gass": "oil_gas",
  olje_gass: "oil_gas",
  "maritime og sjøfart": "marine",
  maritime: "marine",
  sjøfart: "marine",
  shipping: "marine",
  fiskeoppdrett: "fiskeri",
  havbruk: "fiskeri",
  "fiskeri og havbruk": "fiskeri",
  bergverk: "bergverk",
  gruvedrift: "bergverk",
  "bergverk og gruvedrift": "bergverk",
  mining: "bergverk",
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

// ─── ELEKTRO OG ENERGI ───────────────────────────────────────────────────────

const elektroPackage: IndustryPackage = {
  industry: "elektro",
  displayName: "Elektro og energi",
  farmTypes: [],
  simpleMenuHrefs: [
    "/dashboard/incidents",
    "/dashboard/sja",
    "/dashboard/inspections",
    "/dashboard/documents",
    "/dashboard/rutiner",
  ],
  risks: [
    {
      title: "Arbeid på eller nær spenningssatte anlegg",
      context: "Risiko for elektrisk støt, lysbue og brann ved arbeid på lavspennings- og høyspenningsanlegg.",
      category: "SAFETY",
      likelihood: 3,
      consequence: 5,
      controls: "FSE-opplæring, bruk av godkjent verneutstyr, spenningssetting og FU-prosedyrer.",
    },
    {
      title: "Lysbueulykker (arc flash)",
      context: "Kortslutning i tavler og koblingsutstyr kan gi alvorlige brannskader og eksplosjon.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "Energiisolasjon, lysbueberegning (Joule), godkjent lysbueverndrakt og hjelm.",
    },
    {
      title: "Arbeid i koblingsrom og tavlerom",
      context: "Fare for inntrengning i høyspenningsanlegg og utilsiktet betjening av utstyr.",
      category: "SAFETY",
      likelihood: 3,
      consequence: 4,
      controls: "Adgangskontroll, nøkkelstyrte låser, tydelig merking og prosedyre for inngang.",
    },
    {
      title: "Elektromagnetiske felt (EMF)",
      context: "Eksponering over tid nær høyspenningsledninger og kraftstasjoner.",
      category: "HEALTH",
      likelihood: 2,
      consequence: 3,
      controls: "Kartlegging, grenseverdier etter FHI-veiledning, arbeidsrotasjon.",
    },
    {
      title: "Brann ved svak elektro",
      context: "Defekte kabler, overbelastede kurs og feil ved installasjoner kan gi brann.",
      category: "SAFETY",
      likelihood: 3,
      consequence: 4,
      controls: "Periodisk el-kontroll, termografering og utskifting av aldret utstyr.",
    },
    {
      title: "Alenearbeid ved serviceoppdrag",
      context: "Tekniker alene på anlegg uten rask tilgang til hjelp ved ulykke.",
      category: "HEALTH",
      likelihood: 3,
      consequence: 4,
      controls: "Sjekk-inn rutine, mann-ned-alarm, forhåndsgodkjent prosedyre for alenearbeid.",
    },
  ],
  sjaTemplates: [
    {
      name: "Arbeid på eller nær spenningssatte anlegg",
      description: "SJA-mal for arbeid i spenningssatte lavspennings- og høyspenningsanlegg.",
      workLocation: "Tavlerom / koplingsanlegg / mast",
      hazards: [
        {
          activity: "Åpning av tavle og koblingsutstyr",
          hazard: "Direkte kontakt med spenningssatte deler",
          consequence: "Elektrisk støt, lysbue, død",
          probability: 2,
          severity: 5,
          measures: "Spenningssetting, UT-prosedyre (5 trinn), bruk av godkjent verneutstyr (FSE).",
        },
        {
          activity: "Kabling i grøft nær eksisterende kabler",
          hazard: "Kutting av strømkabel",
          consequence: "Elektrisk støt eller brann",
          probability: 2,
          severity: 5,
          measures: "Kabelsøk, ledningskart og varsomhet ved graving.",
        },
      ],
    },
    {
      name: "Arbeid i høyden – elektromontasje",
      description: "SJA-mal for arbeid i høyden på master, tak og trafokiosker.",
      workLocation: "Mast / tak / stolpe",
      hazards: [
        {
          activity: "Klatring i mast",
          hazard: "Fall fra høyde",
          consequence: "Alvorlig personskade eller død",
          probability: 2,
          severity: 5,
          measures: "Godkjent fallsikring, sele og koblingspunkt på mast, to-mann-regelen.",
        },
      ],
    },
    {
      name: "Vedlikehold av nødstrømsaggregat",
      description: "SJA-mal for service og vedlikehold av diesel-/gassgeneratorer.",
      workLocation: "Aggregatrom / teknisk rom",
      hazards: [
        {
          activity: "Start og test av aggregat",
          hazard: "Eksos, brann, lydbølger",
          consequence: "Forgiftning, brannskade, hørselsskade",
          probability: 2,
          severity: 4,
          measures: "Ventilasjon, hørselsvern, brann slukker tilgjengelig og varmespenning av.",
        },
      ],
    },
  ],
  inspectionTemplates: [
    {
      name: "Periodisk el-kontroll – lavspenning",
      description: "Sjekkliste for periodisk kontroll av lavspenningsanlegg iht. NEK 400.",
      category: "ELEKTRO",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Tavler og fordelingsutstyr" },
          { type: "item", title: "Tavlen er ryddig og fri for fremmedlegemer", checked: false },
          { type: "item", title: "Kursfortegnelse er oppdatert og lesbar", checked: false },
          { type: "item", title: "Jordfeilbrytere testes og fungerer (T-knapp)", checked: false },
          { type: "heading", title: "Kabler og ledninger" },
          { type: "item", title: "Ingen synlige skader på kabler", checked: false },
          { type: "item", title: "Kabler er riktig sikret og støttet", checked: false },
          { type: "heading", title: "Vern og dokumentasjon" },
          { type: "item", title: "Siste periodiske kontrollrapport er tilgjengelig", checked: false },
          { type: "item", title: "Termografering er utført siste 3 år", checked: false },
        ],
      },
    },
    {
      name: "FSE-utstyr – månedlig kontroll",
      description: "Kontroll av personlig verneutstyr for arbeid på elektriske anlegg.",
      category: "VERNEUTSTYR",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Isolerende håndverktøy" },
          { type: "item", title: "Ingen synlige sprekker eller skader på isolasjon", checked: false },
          { type: "item", title: "Gyldig sertifiseringsmerke (1000V)", checked: false },
          { type: "heading", title: "Vernehansker og dielektrisk utstyr" },
          { type: "item", title: "Hansker er testet og godkjent", checked: false },
          { type: "item", title: "Vernehjelm med visir er i orden", checked: false },
        ],
      },
    },
    {
      name: "Vernerunde – verksted og lager",
      description: "Generell sikkerhetskontroll for elektro-verksted og utstyrslager.",
      category: "VERNERUNDE",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Orden og ryddighet" },
          { type: "item", title: "Rømningsveier er fri og merket", checked: false },
          { type: "item", title: "Farlig avfall er korrekt merket og oppbevart", checked: false },
          { type: "heading", title: "Brannvern" },
          { type: "item", title: "Brannslukker er synlig og kontrollert", checked: false },
          { type: "item", title: "El-tavle i rom er fri for brennbart materiale", checked: false },
        ],
      },
    },
  ],
  courseTemplates: [
    {
      courseKey: "elektro-fse-grunnkurs",
      title: "FSE-kurs – Sikkerhet ved arbeid på elektriske anlegg",
      description: "Grunnleggende opplæring i FSE (Forskrift om sikkerhet ved arbeid i og drift av elektriske anlegg).",
      isRequired: true,
      validityYears: 3,
    },
    {
      courseKey: "elektro-fse-lavspenning",
      title: "Arbeid under spenning – lavspenning (AUS)",
      description: "Praktisk sertifisering for arbeid under spenning på lavspenningsanlegg.",
      isRequired: true,
      validityYears: 3,
    },
    {
      courseKey: "elektro-lysbue",
      title: "Lysbuerisiko og personsikkerhet",
      description: "Kurs om lysbueenergi, verneklær og prosedyrer for å unngå arc flash-ulykker.",
      isRequired: true,
      validityYears: 3,
    },
    {
      courseKey: "elektro-forstehjelp",
      title: "Førstehjelp ved elektrisk ulykke og brann",
      description: "Tilpasset førstehjelpskurs for el-bransjen inkl. hjerte-lunge-redning og brannslukking.",
      isRequired: true,
      validityYears: 2,
    },
  ],
  legalReferences: [
    {
      title: "Forskrift om sikkerhet ved arbeid i og drift av elektriske anlegg (FSE)",
      paragraphRef: "§ 5 og § 10",
      description: "Krav til kvalifikasjoner, risikovurdering og verneutstyr ved arbeid på elektriske anlegg.",
      sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2006-04-28-458",
    },
    {
      title: "Forskrift om elektriske lavspenningsanlegg (FEL)",
      paragraphRef: "§ 7 og § 10",
      description: "Krav til utførelse, kontroll og dokumentasjon av elektriske installasjoner.",
      sourceUrl: "https://lovdata.no/dokument/SF/forskrift/1998-11-06-1060",
    },
    {
      title: "Arbeidsmiljøloven",
      paragraphRef: "§ 3-1 og § 3-2",
      description: "Arbeidsgiver skal sørge for opplæring og tilpasse arbeidet til arbeidstakers kvalifikasjoner.",
      sourceUrl: "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
    },
    {
      title: "Internkontrollforskriften",
      paragraphRef: "§ 5",
      description: "Virksomheten skal kartlegge farer og vurdere risiko, samt iverksette tiltak.",
      sourceUrl: "https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127",
    },
    {
      title: "NEK 400 – Elektriske lavspenningsinstallasjoner",
      paragraphRef: "Del 6",
      description: "Norsk standard for periodisk kontroll og verifikasjon av elektriske anlegg.",
      sourceUrl: "https://www.standard.no/fagomrader/el-ikt-og-telekommunikasjon/elektriske-anlegg/",
    },
  ],
};

// ─── OFFSHORE OG PETROLEUM ───────────────────────────────────────────────────

const offshorePackage: IndustryPackage = {
  industry: "offshore",
  displayName: "Offshore og petroleum",
  farmTypes: [],
  simpleMenuHrefs: [
    "/dashboard/incidents",
    "/dashboard/sja",
    "/dashboard/inspections",
    "/dashboard/documents",
    "/dashboard/rutiner",
    "/dashboard/chemicals",
  ],
  risks: [
    {
      title: "Brann og eksplosjon på innretning",
      context: "Lekkasje av hydrokarboner fra brønner, rørledninger eller prosessanlegg kan gi storulykke.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "Barrierebasert risikostyring (bow-tie), gassdeteksjon, automatisk brannslukking og nødstenging.",
    },
    {
      title: "Mann-over-bord (MOB)",
      context: "Fare for fall i sjøen fra innretning, fartøy eller ved forflytning.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "Reling og fallsikring, MOB-alarm og -bøye, prosedyre for rask redning og helikopterberedskap.",
    },
    {
      title: "Boring – ukontrollert brønnstrøm (blowout)",
      context: "Ukontrollert utstrømning fra brønn under boring eller brønnoperasjoner.",
      category: "SAFETY",
      likelihood: 1,
      consequence: 5,
      controls: "BOP-system, brønnsperring, kill-prosedyre og brønnbarrieredokument (WBD).",
    },
    {
      title: "H2S-eksponering",
      context: "Hydrogensulfid i petroleumsressurser kan gi hurtig bevisstløshet og død.",
      category: "HEALTH",
      likelihood: 2,
      consequence: 5,
      controls: "H2S-detektor, SCBA-trening, H2S-grenseverdier (1 ppm TWA), evakueringsprosedyre.",
    },
    {
      title: "Løftoperasjoner og kran",
      context: "Løft av tungt utstyr med kran i variabelt vær kan gi fallende last eller personskade.",
      category: "SAFETY",
      likelihood: 3,
      consequence: 4,
      controls: "Sertifisert kranfører, riggertillatelse, sikker sone og SJA ved komplekse løft.",
    },
    {
      title: "Helikoptertransport",
      context: "Uhell ved landing, takeoff eller i flyvning under dårlig vær.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "HUET-kurs, vekt- og lastemanifest, helideckprosedyrer og nødradio.",
    },
    {
      title: "Arbeid i innestengte rom",
      context: "Oksygenmangel og giftige gasser i tanker, rørledninger og andre begrensede rom.",
      category: "HEALTH",
      likelihood: 2,
      consequence: 5,
      controls: "Tillatelse til innstigning (PTW), atmosfæremåling, standby-mann og SCBA.",
    },
  ],
  sjaTemplates: [
    {
      name: "Brønnoperasjon – brønnintervensjons-SJA",
      description: "SJA-mal for brønnoperasjoner og intervensjon.",
      workLocation: "Boreplattform / brønndekkutrustning",
      hazards: [
        {
          activity: "Plugging og gjenåpning av brønn",
          hazard: "Ukontrollert brønnstrøm (kick/blowout)",
          consequence: "Eksplosjon og storulykke",
          probability: 1,
          severity: 5,
          measures: "BOP-sjekk, brønnbarriere dokumentert, beredskapsplan aktiv.",
        },
        {
          activity: "Håndtering av BOP-utstyr",
          hazard: "Trykkutslipp",
          consequence: "Alvorlig personskade",
          probability: 2,
          severity: 4,
          measures: "Trykketesting, sertifisert personell og prosedyre for trykkreduksjon.",
        },
      ],
    },
    {
      name: "Løfteoperasjon med kran – offshore",
      description: "SJA-mal for løft av dekklaster og utstyr med kran.",
      workLocation: "Dekk / krankabine",
      hazards: [
        {
          activity: "Løft av tungt utstyr",
          hazard: "Fallende last",
          consequence: "Alvorlig personskade eller materialskade",
          probability: 2,
          severity: 5,
          measures: "Sikker sone merket, sertifisert rigg, kranlogg og værgodkjenning.",
        },
      ],
    },
    {
      name: "Arbeid i begrensede rom – offshore",
      description: "SJA-mal for innstigning og arbeid i tanker og rørledninger.",
      workLocation: "Tank / kum / rørledning",
      hazards: [
        {
          activity: "Innstigning i tank",
          hazard: "Oksygenmangel og giftige gasser",
          consequence: "Bevisstløshet og død",
          probability: 2,
          severity: 5,
          measures: "PTW, atmosfæremåling, standby-mann, SCBA og redningsutstyr klart.",
        },
      ],
    },
    {
      name: "Varmarbeider – offshore",
      description: "SJA-mal for sveising, skjæring og varmarbeider på innretning.",
      workLocation: "Prosessanlegg / dekk",
      hazards: [
        {
          activity: "Sveising nær prosessrør",
          hazard: "Brann og eksplosjon",
          consequence: "Storulykke",
          probability: 2,
          severity: 5,
          measures: "Varmarbeider-tillatelse (PTW), gasstesting, brannvakt og slukketilgang.",
        },
      ],
    },
  ],
  inspectionTemplates: [
    {
      name: "Vernerunde – boredekkutrustning",
      description: "Sjekkliste for sikkerhetskontroll av boreutstyr og dekkutrustning.",
      category: "BOREDEKKUTRUSTNING",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "BOP og brønnkontrollutstyr" },
          { type: "item", title: "BOP er testet og loggfort denne uke", checked: false },
          { type: "item", title: "Brønnbarriere-dokument (WBD) er oppdatert", checked: false },
          { type: "heading", title: "Kran og løfteutstyr" },
          { type: "item", title: "Kranlogg er fort og siste service dokumentert", checked: false },
          { type: "item", title: "Laster og stroppar er kontrollert og sertifisert", checked: false },
          { type: "heading", title: "MOB og redningsutstyr" },
          { type: "item", title: "MOB-bøyer er på plass og synlige", checked: false },
          { type: "item", title: "Livbåter er inspisert iht. årsplan", checked: false },
        ],
      },
    },
    {
      name: "Gasstesting – innestengede rom og prosess",
      description: "Sjekkliste for gasstesting før arbeid i begrensede rom og prosessanlegg.",
      category: "GASSIKKERHET",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Gassdeteksjon" },
          { type: "item", title: "Gasdetektor er kalibrert og innen dato", checked: false },
          { type: "item", title: "Atmosfæremåling er dokumentert og akseptabel", checked: false },
          { type: "heading", title: "PTW og dokumentasjon" },
          { type: "item", title: "Tillatelse til arbeid (PTW) er utstedt og signert", checked: false },
          { type: "item", title: "Standby-mann er utpekt og briefet", checked: false },
        ],
      },
    },
    {
      name: "Beredskapsøvelse – evakuering og MOB",
      description: "Kontroll av beredskapsøvelser iht. Ptil-krav og Aktivitetsforskriften.",
      category: "BEREDSKAP",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Øvelser" },
          { type: "item", title: "Evakueringsøvelse er gjennomfort siste 30 dager", checked: false },
          { type: "item", title: "MOB-øvelse er dokumentert", checked: false },
          { type: "item", title: "Alle ansatte har HUET-sertifikat (gyldig)", checked: false },
        ],
      },
    },
  ],
  courseTemplates: [
    {
      courseKey: "offshore-basic-safety",
      title: "Basic Offshore Safety Induction and Emergency Training (BOSIET)",
      description: "Grunnleggende sikkerhetsopplæring for offshore-arbeidere inkl. HUET, brannslukking og førstehjelp.",
      isRequired: true,
      validityYears: 4,
    },
    {
      courseKey: "offshore-h2s",
      title: "H2S-sikkerhet – offshore",
      description: "Kurs om H2S-gjenkjenning, eksponering og bruk av SCBA ved gassutsett.",
      isRequired: true,
      validityYears: 2,
    },
    {
      courseKey: "offshore-well-control",
      title: "Brønnkontroll (Well Control – IWCF/IADC)",
      description: "Internasjonal sertifisering for brønnkontroll og blowout-forebygging.",
      isRequired: true,
      validityYears: 2,
    },
    {
      courseKey: "offshore-ptw",
      title: "Tillatelse til arbeid (PTW) – offshore",
      description: "Opplæring i utstedelse og bruk av arbeidstillatelsessystem på offshore-innretning.",
      isRequired: true,
      validityYears: 3,
    },
  ],
  legalReferences: [
    {
      title: "Rammeforskriften (petroleumsvirksomhet)",
      paragraphRef: "§ 9 – Styringssystem",
      description: "Krav til operatørens styringssystem for HMS i petroleumsvirksomheten.",
      sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2010-04-29-611",
    },
    {
      title: "Aktivitetsforskriften",
      paragraphRef: "§ 23 – Risikovurdering",
      description: "Krav til risikovurdering av arbeidsprosesser og operasjoner offshore.",
      sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2010-04-29-613",
    },
    {
      title: "Aktivitetsforskriften",
      paragraphRef: "§ 99 – Beredskap",
      description: "Krav til beredskapsanalyse og beredskapsplanlegging.",
      sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2010-04-29-613",
    },
    {
      title: "Innretningsforskriften",
      paragraphRef: "§ 65 – Brannbeskyttelse",
      description: "Krav til brannsikkerhet og passive og aktive brannsystemer.",
      sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2010-04-29-612",
    },
    {
      title: "Arbeidsmiljøloven",
      paragraphRef: "§ 3-1 og § 5-2",
      description: "Systematisk HMS og plikt til å melde alvorlige ulykker.",
      sourceUrl: "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
    },
  ],
};

// ─── MARITIME OG SJØFART ─────────────────────────────────────────────────────

const marinePackage: IndustryPackage = {
  industry: "marine",
  displayName: "Maritime og sjøfart",
  farmTypes: [],
  simpleMenuHrefs: [
    "/dashboard/incidents",
    "/dashboard/sja",
    "/dashboard/inspections",
    "/dashboard/documents",
    "/dashboard/rutiner",
  ],
  risks: [
    {
      title: "Kollisjon og grunnstøting",
      context: "Fartøy kan kollidere med andre skip, kajer eller grunner, særlig i dårlig sikt og tett trafikk.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "Godt vakthold, ARPA-bruk, bro-prosedyrer og to-offisersregelen i risikofarvann.",
    },
    {
      title: "Mann-over-bord fra fartøy",
      context: "Besetningsmedlem kan falle i sjøen ved dårlig vær, glatt dekk eller under mooring.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "Reling, MOB-alarm, pelican hook, trening i MOB-redning og GMDSS-kommunikasjon.",
    },
    {
      title: "Maskinhavareri og brann i maskinrom",
      context: "Brann eller havari i maskinrom kan gjøre fartøyet udyktig og skape livsfarer.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "CO2-anlegg i maskinrom, brannøvelser, regelmessig vedlikehold og ISO-kompetanse.",
    },
    {
      title: "Mooring og fortøyningsoperasjoner",
      context: "Høyspente fortøyningsline kan ryke og gi alvorlig skade på besetningen.",
      category: "SAFETY",
      likelihood: 3,
      consequence: 4,
      controls: "Sikkerhetsavstand, godkjent line, inspeksjon før operasjon og verneutstyr.",
    },
    {
      title: "Kumulativ eksponering for støy og vibrasjoner",
      context: "Maskinrom og dekksarbeid gir langvarig eksponering over grenseverdier.",
      category: "HEALTH",
      likelihood: 3,
      consequence: 3,
      controls: "Hørselsvern, stillerom, rotasjon av arbeidsoppgaver og audiometrimåling.",
    },
  ],
  sjaTemplates: [
    {
      name: "Mooring og fortøyning – SJA",
      description: "SJA-mal for fortøyningsoperasjoner i havn og ved kai.",
      workLocation: "Fordekk / akterdekk",
      hazards: [
        {
          activity: "Utlevering av fortøyningsliner",
          hazard: "Line ryker – piskeeffekt",
          consequence: "Alvorlig personskade",
          probability: 2,
          severity: 5,
          measures: "Sikkerhetsavstand, kontroll av liner, verneutstyr og klart signal.",
        },
      ],
    },
    {
      name: "Bunkring – drivstoffpåfylling",
      description: "SJA-mal for bunkringsoperasjoner.",
      workLocation: "Bunkerstasjon",
      hazards: [
        {
          activity: "Kobling av bunkersslange",
          hazard: "Lekkasje av drivstoff og brann",
          consequence: "Brann, miljøskade",
          probability: 2,
          severity: 4,
          measures: "Drip-tray, ingen gnistkilder, brannslukker tilgjengelig og oljeutslippsplan klar.",
        },
      ],
    },
    {
      name: "Arbeid i tankrom og begrensede rom – maritim",
      description: "SJA-mal for innstigning og arbeid i lasteluker, tanker og begrensede rom.",
      workLocation: "Tank / lasterom",
      hazards: [
        {
          activity: "Innstigning i lastetank",
          hazard: "Oksygenmangel og giftige gasser",
          consequence: "Bevisstløshet og død",
          probability: 2,
          severity: 5,
          measures: "Atmosfæremåling, PTW, SCBA og standby-mann på toppen.",
        },
      ],
    },
  ],
  inspectionTemplates: [
    {
      name: "Sikkerhetsrunde – fartøy (dekk og maskin)",
      description: "Periodisk sikkerhetsrunde for sjøgående fartøy iht. ISM-koden.",
      category: "SIKKERHETSINSPEKSJON",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Dekk og utstyr" },
          { type: "item", title: "Reling og gelendre er i god stand", checked: false },
          { type: "item", title: "Redningsutstyr (redningsvester/drakter) er tilgjengelig og kontrollert", checked: false },
          { type: "item", title: "Brannslukkingsutstyr er kontrollert og plombert", checked: false },
          { type: "heading", title: "Maskinrom" },
          { type: "item", title: "Ingen synlige lekkasjer fra maskineri", checked: false },
          { type: "item", title: "Brannmelderanlegg fungerer", checked: false },
          { type: "heading", title: "Bro og navigasjon" },
          { type: "item", title: "GMDSS-utstyr er operativt", checked: false },
          { type: "item", title: "AIS og ARPA er kalibrert og operativt", checked: false },
        ],
      },
    },
    {
      name: "ISM-intern revisjon – årsrevisjon",
      description: "Intern revisjon av ISM-systemet iht. ISM-koden kapittel 12.",
      category: "ISM_REVISJON",
      riskCategory: "OPERATIONAL",
      checklist: {
        items: [
          { type: "heading", title: "Dokumentasjon" },
          { type: "item", title: "SMS-manualen er oppdatert og gjeldende versjon", checked: false },
          { type: "item", title: "Øvelseslogg er fort siste 12 måneder", checked: false },
          { type: "heading", title: "Kompetanse" },
          { type: "item", title: "Alle mannskap har gyldig STCW-sertifikater", checked: false },
          { type: "item", title: "Nytt personell har fått opplæring iht. SMS", checked: false },
        ],
      },
    },
  ],
  courseTemplates: [
    {
      courseKey: "marine-stcw-basic",
      title: "STCW Basic Safety Training (BST)",
      description: "Obligatorisk grunnleggende sikkerhetstrening for sjøfolk iht. STCW-konvensjonen.",
      isRequired: true,
      validityYears: 5,
    },
    {
      courseKey: "marine-advanced-firefighting",
      title: "Avansert brannbekjempelse",
      description: "STCW-sertifisering i avansert brannslokking og røykdykking.",
      isRequired: true,
      validityYears: 5,
    },
    {
      courseKey: "marine-medical-care",
      title: "Medisinsk behandling og omsorg",
      description: "STCW-kurs i medisinsk førstehjelp for sjøfolk.",
      isRequired: true,
      validityYears: 5,
    },
    {
      courseKey: "marine-ism-awareness",
      title: "ISM-koden – bevissthet og opplæring",
      description: "Opplæring i ISM-kodens krav og praktisk bruk av SMS ombord.",
      isRequired: true,
      validityYears: 3,
    },
  ],
  legalReferences: [
    {
      title: "ISM-koden (International Safety Management Code)",
      paragraphRef: "Kapittel 12",
      description: "Krav til intern revisjon og avvikshåndtering i ISM-systemet.",
      sourceUrl: "https://www.sdir.no/regelverk/internasjonale-regler/ism-koden/",
    },
    {
      title: "STCW-konvensjonen",
      paragraphRef: "Kapittel VI – Nødsituasjoner",
      description: "Krav til opplæring og sertifisering av sjøfolk.",
      sourceUrl: "https://www.sdir.no/sjofart/opplaring-og-sertifikater/stcw-regelverk/",
    },
    {
      title: "Sjødyktighetsloven",
      paragraphRef: "§ 2 – Sjødyktighet",
      description: "Krav til skipets tilstand og utstyr for sjøsikkerhet.",
      sourceUrl: "https://lovdata.no/dokument/NL/lov/1903-06-09-7",
    },
    {
      title: "Arbeidsmiljøloven",
      paragraphRef: "§ 3-1 og § 5-2",
      description: "Krav til HMS og varsling av ulykker.",
      sourceUrl: "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
    },
  ],
};

export const INDUSTRY_PACKAGES: Readonly<Record<string, IndustryPackage>> = {
  agriculture: agriculturePackage,
  elektro: elektroPackage,
  offshore: offshorePackage,
  marine: marinePackage,
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
