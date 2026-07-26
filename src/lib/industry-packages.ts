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

// ─── Hospitality-pakke (Hotell og restaurant) ────────────────────────────────
// Hjemmel: AML, IK-HMS, IK-mat, næringsmiddelhygieneforskriften,
// BHT-forskriften kode 55.1/56.11/56.3
const hospitalityPackage: IndustryPackage = {
  industry: "hospitality",
  displayName: "Hotell og restaurant",
  farmTypes: [],
  simpleMenuHrefs: ["/dashboard/incidents", "/dashboard/inspections", "/dashboard/chemicals"],
  risks: [
    {
      title: "Ergonomi – stående og gående arbeid",
      context: "Ansatte i servering, housekeeping og resepsjon står/går store deler av arbeidsdagen. STAMI bekrefter at 82% i overnatting/servering har stående arbeid.",
      category: "HEALTH",
      likelihood: 4,
      consequence: 3,
      controls: "Anti-tretthetsmatter, regelmessige pauser, rotasjon av arbeidsoppgaver, tilpassede sko.",
    },
    {
      title: "Vått arbeid – renhold og kjøkken",
      context: "Renhold og kjøkkenarbeid innebærer hyppig kontakt med vann og kjemikalier, som kan føre til dermatitter og hudsykdommer.",
      category: "HEALTH",
      likelihood: 3,
      consequence: 2,
      controls: "Vernehansker, fuktighetskrem, begrensning av eksponering, stoffkartotek oppdatert.",
    },
    {
      title: "Kjemikalier – rengjøringsmidler",
      context: "Bruk av rengjøringsmidler, desinfeksjonsmidler og bassengkjemikalier. Krav om stoffkartotek (AML § 4-5).",
      category: "SAFETY",
      likelihood: 3,
      consequence: 3,
      controls: "Stoffkartotek tilgjengelig, opplæring i kjemikaliehåndtering, verneutstyr, god ventilasjon.",
    },
    {
      title: "Vold, trusler og krevende kundesituasjoner",
      context: "Arbeidstilsynet fant brudd i 26% av tilsyn på vold/trusler i overnatting/servering. Resepsjon, bar og nattvakt er særlig utsatt.",
      category: "HEALTH",
      likelihood: 3,
      consequence: 3,
      controls: "Rutine for vold/trusler, varslingsknapp/alarm, tomannsprinsipper om natten, debrifing etter hendelser.",
    },
    {
      title: "Nattarbeid og skiftarbeid",
      context: "Nattarbeid er bare tillatt når arbeidets art gjør det nødvendig (AML § 10-11). Nattarbeid øker risiko for søvnforstyrrelser og hjerte-kar-sykdom.",
      category: "HEALTH",
      likelihood: 4,
      consequence: 2,
      controls: "Dokumentert nødvendighet for nattarbeid, helseundersøkelse, begrensning av nattarbeid der mulig.",
    },
    {
      title: "Seksuell trakassering",
      context: "Overnatting og servering er blant bransjene mest utsatt for seksuell trakassering (Arbeidstilsynet). 14% i næringen oppga uønsket seksuell oppmerksomhet.",
      category: "HEALTH",
      likelihood: 3,
      consequence: 3,
      controls: "Skriftlig policy, varslingskanal, opplæring av ledere, lavterskel-rapportering.",
    },
    {
      title: "Alenearbeid – resepsjon og nattvakt",
      context: "Alenearbeid om natten øker risikoen ved ulykker og vold. Krav om systematisk kartlegging (AML § 4-1).",
      category: "SAFETY",
      likelihood: 2,
      consequence: 4,
      controls: "Alenearbeidsvurdering dokumentert, kommunikasjonsmidler, sjekk-inn-rutine, duomann ved behov.",
    },
    {
      title: "Brann og evakuering",
      context: "Hoteller og restauranter med publikum har særskilt plikt til brannberedskap. DSB stiller krav om systematisk brannvernarbeid.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "Oppdatert evakueringsplan, brannøvelse minst én gang i året, kontroll av slukkeutstyr og rømningsveier.",
    },
    {
      title: "Mattrygghetsfare – HACCP",
      context: "Forordning (EF) 852/2004 art. 5 krever HACCP-basert internkontroll for alle serveringssteder. Feil temperaturstyring og krysskontaminasjon er vanlige farekilder.",
      category: "SAFETY",
      likelihood: 3,
      consequence: 4,
      controls: "HACCP-plan med CCP-punkt, temperaturlogg, opplæring i mattrygghet, regelmessig kontroll.",
    },
    {
      title: "Sesongstress og høy personalomsetning",
      context: "Reiseliv har høy andel sesong- og korttidsansatte som mangler opplæring. Feil og hendelser øker i høysesong.",
      category: "OPERATIONAL",
      likelihood: 4,
      consequence: 3,
      controls: "Standardisert onboarding, onboarding-sjekkliste, superbrukerprogram, lavterskel avviksmelding.",
    },
    {
      title: "Ergonomi – løft i housekeeping",
      context: "Housekeeping innebærer tunge løft, ukvemsarbeid og repetitivt arbeid. STAMI bekrefter høy fysisk belastning.",
      category: "HEALTH",
      likelihood: 4,
      consequence: 3,
      controls: "Løfteutstyr (traller, ergonomiske sengehøyder), opplæring i løfteteknikk, rotering av oppgaver.",
    },
    {
      title: "Allergen og matintolerans",
      context: "EU-forordning 1169/2011 krever skriftlig allergeninformasjon for ikke-ferdigpakket mat. Feil kan gi alvorlige allergireaksjoner.",
      category: "SAFETY",
      likelihood: 2,
      consequence: 5,
      controls: "Oppdatert allergenoversikt, opplæring av servitører, tydelig merking, rutine for allergiske gjester.",
    },
  ],
  sjaTemplates: [
    {
      name: "Rengjøring med sterke kjemikalier",
      description: "SJA for rengjøring med blekemidler, syrer eller andre farlige kjemikalier – kjøkken, bad og felles arealer.",
      workLocation: "Kjøkken / sanitæranlegg / teknisk rom",
      hazards: [
        { activity: "Blanding av kjemikalier", hazard: "Utilsiktet blanding av syre/base", consequence: "Etseskade, gassutvikling", probability: 2, severity: 5, measures: "Aldri bland kjemikalier. Les sikkerhetsdatablad. Bruk ventilasjon og vernehansker." },
        { activity: "Påføring av kjemikalier", hazard: "Sprut i øyne eller på hud", consequence: "Etseskade, irritasjon", probability: 3, severity: 3, measures: "Bruk vernebriller og hansker. Øyeskyllestasjoner tilgjengelig." },
        { activity: "Inhalasjon av damper", hazard: "Innånding av kjemikaliedad", consequence: "Luftveisirritasjon, forgiftning", probability: 2, severity: 4, measures: "God ventilasjon, åndedrettsvern ved behov." },
      ],
    },
    {
      name: "Kjøkkenarbeid med frityrkokere og ovner",
      description: "SJA for arbeid med varm olje, ovner og frityr. Brannfare og brannskaderisiko.",
      workLocation: "Kjøkken",
      hazards: [
        { activity: "Fritering", hazard: "Overopphetet frityrolje – brann", consequence: "Alvorlig brann, brannskade", probability: 2, severity: 5, measures: "Brannslukker ved frityrkokeren. Aldri la frityrkokeren stå uten tilsyn." },
        { activity: "Tapping av varm olje", hazard: "Søl av varm olje", consequence: "Alvorlig brannskade", probability: 2, severity: 4, measures: "Vernehanskter, lang avstand, avkjølt til under 60°C før tapping." },
        { activity: "Arbeid ved varm ovn", hazard: "Forbrenning ved kontakt", consequence: "Brannskade", probability: 3, severity: 3, measures: "Ovnsvotter, varselmerking, tilstrekkelig klaring." },
      ],
    },
    {
      name: "Guidet naturaktivitet / friluftsliv",
      description: "SJA for guidede aktiviteter som fjellvandring, kanoturer og raftingaktiviteter.",
      workLocation: "Utendørs / natur",
      hazards: [
        { activity: "Fjellvandring", hazard: "Fall i bratt terreng", consequence: "Alvorlig skade eller død", probability: 2, severity: 5, measures: "Risikovurdering av rute, erfarne guider, nødkommunikasjon, gruppeledelse." },
        { activity: "Padling/kanotur", hazard: "Kenteringsfare, drukning", consequence: "Drukning", probability: 2, severity: 5, measures: "Obligatorisk flytevest, sjekk av svømmeferdigheter, redningsplan." },
        { activity: "Gjestesikkerhetsvurdering", hazard: "Helsemessig uskikket gjest", consequence: "Kollaps/skade under aktivitet", probability: 2, severity: 4, measures: "Helse-screening av gjester, aldersbegrensning, tilkallingsrutine for hjelp." },
      ],
    },
    {
      name: "Arbeid alene – nattvakt og resepsjon",
      description: "SJA for alenearbeid i perioder med lite trafikk. Vold, trusler og nødsituasjoner.",
      workLocation: "Resepsjon / lobbyen",
      hazards: [
        { activity: "Natten håndtering av gjester", hazard: "Vold eller truende adferd", consequence: "Skade, psykisk belastning", probability: 2, severity: 4, measures: "Varslingsknapp, sikker avstand, rutine for å tilkalle hjelp, ikke overveldende store sedler i kassen." },
        { activity: "Alenearbeid – nødsituasjon", hazard: "Ulykke uten mulighet for hjelp", consequence: "Forsinket hjelp – alvorlig skade", probability: 2, severity: 4, measures: "Sjekk-inn-system via telefon, duovurdering for nattvakt." },
      ],
    },
    {
      name: "Basseng- og spabassengdrift",
      description: "SJA for vedlikehold og drift av basseng/spa. Kjemikalier og drukningsfare.",
      workLocation: "Basseng / spa",
      hazards: [
        { activity: "Klortilsetning", hazard: "Inhalasjon av klorgass", consequence: "Luftveisskade, forgiftning", probability: 2, severity: 4, measures: "God ventilasjon, åndedrettsvern, aldri bland klor og syre." },
        { activity: "Bassengdrift", hazard: "Drukning for gjest", consequence: "Drukning", probability: 2, severity: 5, measures: "Badvakt, redningsutstyr tilgjengelig, dybdemerking." },
        { activity: "Glatt gulv rundt basseng", hazard: "Gliding, fall", consequence: "Skade", probability: 3, severity: 3, measures: "Anti-skli belegg, sklisikre sko for ansatte, advarslingskilt." },
      ],
    },
  ],
  inspectionTemplates: [
    {
      name: "Vernerunde – resepsjon og publikumsarealer",
      description: "Systematisk vernerunde i resepsjon, lobby og andre publikumsarealer – AML § 6-2.",
      category: "Vernerunde",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Fysisk arbeidsmiljø" },
          { type: "item", title: "Ryddige og frie rømningsveier", checked: false },
          { type: "item", title: "Tilstrekkelig belysning i alle arealer", checked: false },
          { type: "item", title: "Sklisikre gulvflater og matter på plass", checked: false },
          { type: "item", title: "Nødutgangskilt synlige og belyst", checked: false },
          { type: "heading", title: "Ergonomi og arbeidsstasjon" },
          { type: "item", title: "Resepsjonsskranke i riktig høyde (ergonomi)", checked: false },
          { type: "item", title: "Anti-tretthetsmatter på stående arbeidsplasser", checked: false },
          { type: "item", title: "Skjerm og tastatur korrekt plassert (monitor-høyde)", checked: false },
          { type: "heading", title: "Vold og trygghet" },
          { type: "item", title: "Varslingsknapp/alarm installert og testet", checked: false },
          { type: "item", title: "Rutine for vold/trusler er kjent av alle ansatte", checked: false },
          { type: "item", title: "Kontanter/verdier sikret", checked: false },
        ],
      },
    },
    {
      name: "Vernerunde – kjøkken",
      description: "Vernerunde i produksjonskjøkken. Fokus på brann, kjemikalier, ergonomi og mattrygghet.",
      category: "Vernerunde",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Brann og varmt arbeid" },
          { type: "item", title: "Brannslukker ved frityrkokere – testet og datert", checked: false },
          { type: "item", title: "Brannteppe tilgjengelig", checked: false },
          { type: "item", title: "Ventilasjon over komfyr/ovn fungerer", checked: false },
          { type: "heading", title: "Kjemikalier" },
          { type: "item", title: "Kjemikalier lagret atskilt fra mat", checked: false },
          { type: "item", title: "Sikkerhetsdatablad tilgjengelig for alle kjemikalier", checked: false },
          { type: "item", title: "Verneutstyr (hansker, briller) tilgjengelig", checked: false },
          { type: "heading", title: "Ergonomi" },
          { type: "item", title: "Løfteutstyr tilgjengelig for tunge panner/gryter", checked: false },
          { type: "item", title: "Anti-tretthetsmatter på stående arbeidsstasjoner", checked: false },
          { type: "heading", title: "Mattrygghet" },
          { type: "item", title: "Temperaturlogger fungerer", checked: false },
          { type: "item", title: "Allergenoversikt synlig og oppdatert", checked: false },
          { type: "item", title: "Renholdsplan følges og er dokumentert", checked: false },
        ],
      },
    },
    {
      name: "Vernerunde – housekeeping",
      description: "Vernerunde for renholdsavdeling. Fokus på kjemikalier, ergonomi og alenearbeid.",
      category: "Vernerunde",
      riskCategory: "HEALTH",
      checklist: {
        items: [
          { type: "heading", title: "Kjemikalier og verneutstyr" },
          { type: "item", title: "Rengjøringsvogner er ryddige og låsbare", checked: false },
          { type: "item", title: "Kjemikalier tydelig merket og atskilt", checked: false },
          { type: "item", title: "Vernehansker tilgjengelig i alle størrelser", checked: false },
          { type: "heading", title: "Ergonomi" },
          { type: "item", title: "Støvsugere i riktig høyde (justerbare håndtak)", checked: false },
          { type: "item", title: "Ergonomiske mopper og skaft tilgjengelig", checked: false },
          { type: "item", title: "Rutine for løft av tunge gjenstander kjent", checked: false },
          { type: "heading", title: "Alenearbeid" },
          { type: "item", title: "Alenearbeidsvurdering for housekeeping-ansatte er gjennomført", checked: false },
          { type: "item", title: "Telefon/kommunikasjonsmiddel alltid tilgjengelig", checked: false },
        ],
      },
    },
    {
      name: "Brannkontroll – hotell",
      description: "Periodisk kontroll av brannvern og evakueringsplan i hotell.",
      category: "Brann og beredskap",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { type: "heading", title: "Slukkeutstyr" },
          { type: "item", title: "Håndslukkere kontrollert og datert", checked: false },
          { type: "item", title: "Sprinklersystem fungerer (indikatorlys OK)", checked: false },
          { type: "item", title: "Brannslanger tilgjengelig og i stand", checked: false },
          { type: "heading", title: "Rømning og varsling" },
          { type: "item", title: "Rømningsveier frie og tydelig merket", checked: false },
          { type: "item", title: "Nødbelysning fungerer", checked: false },
          { type: "item", title: "Brannalarmsystem testet", checked: false },
          { type: "item", title: "Evakueringsplan hengt opp i alle rom", checked: false },
          { type: "heading", title: "Opplæring" },
          { type: "item", title: "Alle ansatte har gjennomgått brannopplæring", checked: false },
          { type: "item", title: "Brannøvelse gjennomført siste 12 måneder", checked: false },
          { type: "item", title: "Brannvernansvarlig er utpekt", checked: false },
        ],
      },
    },
    {
      name: "Sesongoppstartssjekk",
      description: "Sjekkliste for sesongoppstart – gjennomgå HMS, mattrygghet, utstyr og bemanning.",
      category: "Internkontroll",
      riskCategory: "OPERATIONAL",
      checklist: {
        items: [
          { type: "heading", title: "HMS-dokumentasjon" },
          { type: "item", title: "HMS-plan oppdatert for ny sesong", checked: false },
          { type: "item", title: "Risikovurderinger gjennomgått og oppdatert", checked: false },
          { type: "item", title: "Alle ansatte har lest og forstått HMS-rutiner", checked: false },
          { type: "heading", title: "Onboarding sesongansatte" },
          { type: "item", title: "Onboarding-sjekkliste gjennomgått med alle nye ansatte", checked: false },
          { type: "item", title: "Opplæring i HMS, brann og mattrygghet dokumentert", checked: false },
          { type: "heading", title: "Utstyr og fasiliteter" },
          { type: "item", title: "Kjøkken- og serveringsutstyr kontrollert", checked: false },
          { type: "item", title: "Kjøleutstyr og frysere testet og kalibrert", checked: false },
          { type: "item", title: "Aktivitets-/opplevelseutstyr kontrollert (hvis relevant)", checked: false },
          { type: "heading", title: "Mattrygghet" },
          { type: "item", title: "HACCP-plan gjennomgått og oppdatert", checked: false },
          { type: "item", title: "Vareleverandører kontrollert", checked: false },
        ],
      },
    },
  ],
  courseTemplates: [
    { courseKey: "hospitality_food_safety_haccp", title: "Mattrygghet og HACCP", description: "Kurs i HACCP-prinsippene, temperaturkontroll, allergenbehandling og mattrygghet. Forordning (EF) 852/2004 art. 5.", isRequired: true, validityYears: 2 },
    { courseKey: "hospitality_fire_evacuation", title: "Brann og evakuering – hotell/restaurant", description: "Brannopplæring tilpasset hotell og restaurant: slukkeutstyr, evakueringsplan, gjestehåndtering.", isRequired: true, validityYears: 3 },
    { courseKey: "hospitality_first_aid", title: "Førstehjelp – grunnkurs", description: "Grunnleggende førstehjelp for ansatte i servering og overnatting.", isRequired: true, validityYears: 3 },
    { courseKey: "hospitality_alcohol_service", title: "Ansvarlig alkoholservering", description: "Kurs i alkoholloven, servering til mindreårige og ansvaret ved overservering. Alkoholloven § 1-7c.", isRequired: true, validityYears: 2 },
    { courseKey: "hospitality_chemicals", title: "Kjemikaliehåndtering – renhold og kjøkken", description: "Bruk av rengjøringsmidler, kjemikalier og verneutstyr. Korrekt lesing av sikkerhetsdatablad. AML § 4-5.", isRequired: true, validityYears: 3 },
    { courseKey: "hospitality_violence_threats", title: "Vold, trusler og alenearbeid", description: "Forebygging og håndtering av vold/trusler i servering og overnatting. Arbeidstilsynets krav.", isRequired: true, validityYears: 2 },
    { courseKey: "hospitality_hms_leaders", title: "HMS for ledere – reiseliv", description: "Lovkrav, systematisk HMS-arbeid, internkontroll, verneombud og BHT-plikt for hotell/restaurant.", isRequired: true, validityYears: null },
    { courseKey: "hospitality_safety_rep", title: "Verneombudsopplæring – 40 timer", description: "Lovpålagt 40-timers opplæring for verneombud. AML § 6-5.", isRequired: false, validityYears: null },
    { courseKey: "hospitality_allergen", title: "Allergenbehandling for serveringspersonell", description: "EU-forordning 1169/2011 – de 14 allergener, håndtering og kommunikasjon til gjester.", isRequired: true, validityYears: 2 },
    { courseKey: "hospitality_onboarding", title: "Onboarding – HMS for sesongansatte", description: "Kort innføring i HMS, rutiner og beredskap for nye og sesongansatte.", isRequired: true, validityYears: null },
  ],
  legalReferences: [
    { title: "Arbeidsmiljøloven – varsling og registrering av skader", paragraphRef: "AML § 5-1, § 5-2, § 5-3", description: "Plikt til å registrere yrkesskader og sykdommer, varsle Arbeidstilsynet og politiet ved alvorlig skade.", sourceUrl: "https://lovdata.no/dokument/NL/lov/2005-06-17-62/KAPITTEL_5" },
    { title: "Internkontrollforskriften – systematisk HMS-arbeid", paragraphRef: "IK-HMS § 5", description: "Krav til skriftlige mål, dokumentert organisering, risikovurdering og avviksrutiner.", sourceUrl: "https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127" },
    { title: "BHT-plikt – hoteller og restauranter", paragraphRef: "Forskrift om org. ledelse § 1-1", description: "Næringskodene 55.1 (hoteller), 56.11 (restauranter) og 56.3 (barer) er BHT-pliktige.", sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1355/VEDLEGG_1" },
    { title: "Næringsmiddelhygieneforskriften – HACCP-basert internkontroll", paragraphRef: "Forordning (EF) 852/2004 art. 5", description: "Alle serveringssteder skal ha internkontroll basert på HACCP-prinsippene.", sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2008-12-22-1623" },
    { title: "IK-mat – plikt til internkontroll for næringsmidler", paragraphRef: "IK-mat § 4 og § 5", description: "Virksomheter som omsetter næringsmidler skal ha dokumentert internkontroll, inkludert rutiner ved avvik og for å hindre gjentakelse.", sourceUrl: "https://lovdata.no/dokument/SF/forskrift/1994-12-15-1187" },
    { title: "Allergeninformasjon for ikke-ferdigpakket mat", paragraphRef: "EU-forordning 1169/2011", description: "Skriftlig allergeninformasjon for de 14 EU-allergener er påkrevd for ikke-ferdigpakket mat.", sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2014-10-28-1372" },
    { title: "Alkoholloven – ansvarlig servering", paragraphRef: "Alkoholloven § 1-7c", description: "Krav om kompetansebevis i ansvarlig alkoholservering for serveringssteder.", sourceUrl: "https://lovdata.no/dokument/NL/lov/1989-06-02-27" },
    { title: "Nattarbeid i reiseliv", paragraphRef: "AML § 10-11", description: "Nattarbeid er bare tillatt når arbeidets art gjør det nødvendig. Krav om helseundersøkelse.", sourceUrl: "https://lovdata.no/dokument/NL/lov/2005-06-17-62/KAPITTEL_10" },
    { title: "Kjemikalier – stoffkartotek og sikkerhetsdatablad", paragraphRef: "AML § 4-5 + Kjemikalieforskriften", description: "Arbeidsgivere skal ha stoffkartotek og sørge for at sikkerhetsdatablad er tilgjengelig for farlige kjemikalier.", sourceUrl: "https://lovdata.no/dokument/SF/forskrift/2001-04-30-443" },
  ],
};

export const INDUSTRY_PACKAGES: Readonly<Record<string, IndustryPackage>> = {
  agriculture: agriculturePackage,
  elektro: elektroPackage,
  offshore: offshorePackage,
  marine: marinePackage,
  hospitality: hospitalityPackage,
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
