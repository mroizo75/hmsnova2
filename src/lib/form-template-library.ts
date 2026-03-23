import type { FieldType, FormCategory } from "@prisma/client";

/** Globale skjemamaler med bransje-scope (JSON i FormTemplate.industryScope). */
export interface FormTemplateLibraryFieldDef {
  fieldType: FieldType;
  label: string;
  helpText?: string | null;
  placeholder?: string | null;
  isRequired?: boolean;
  /** Serialiseres til JSON i FormField.options (RADIO, SELECT, LIKERT_SCALE). */
  options?: string[] | null;
}

export interface FormTemplateLibraryEntry {
  title: string;
  description: string;
  category: FormCategory;
  industryScope: string[];
  requiresSignature?: boolean;
  fields: FormTemplateLibraryFieldDef[];
}

const STATUS_RADIO: string[] = ["OK", "Ikke OK", "Ikke relevant"];

function section(label: string): FormTemplateLibraryFieldDef {
  return { fieldType: "SECTION_HEADER", label, isRequired: false };
}

function radioTri(label: string, helpText?: string | null): FormTemplateLibraryFieldDef {
  return {
    fieldType: "RADIO",
    label,
    helpText: helpText ?? null,
    isRequired: true,
    options: STATUS_RADIO,
  };
}

function textShort(label: string, required = false, placeholder?: string | null): FormTemplateLibraryFieldDef {
  return {
    fieldType: "TEXT",
    label,
    isRequired: required,
    placeholder: placeholder ?? null,
  };
}

function textLong(label: string, required = false): FormTemplateLibraryFieldDef {
  return { fieldType: "TEXTAREA", label, isRequired: required };
}

function dateField(label: string, required = false): FormTemplateLibraryFieldDef {
  return { fieldType: "DATE", label, isRequired: required };
}

function yesNo(label: string, required = true): FormTemplateLibraryFieldDef {
  return {
    fieldType: "RADIO",
    label,
    isRequired: required,
    options: ["Ja", "Nei"],
  };
}

function checklistBlock(
  heading: string,
  items: string[]
): FormTemplateLibraryFieldDef[] {
  return [section(heading), ...items.map((item) => radioTri(item))];
}

const commonTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "HMS-vernemøte (kort referat)",
    description:
      "Kort dokumentasjon av vernerunde eller HMS-møte. Internkontroll og medvirkning (AML kap. 7, IK-HMS).",
    category: "MEETING",
    industryScope: ["all"],
    requiresSignature: false,
    fields: [
      dateField("Møtedato", true),
      textShort("Sted / avdeling", true),
      section("Deltakere"),
      textLong("Tilstede (roller og navn)", true),
      section("Gjennomgang"),
      textLong("Hovedpunkter og observasjoner", true),
      textLong("Avvik og beslutninger", false),
      textLong("Neste steg og ansvarlig", false),
    ],
  },
  {
    title: "Opplæringsbekreftelse",
    description:
      "Enkel bekreftelse på gjennomført opplæring eller instruks. Dokumentasjonskrav ved risikoarbeid (AML § 3-2).",
    category: "TRAINING",
    industryScope: ["all"],
    requiresSignature: true,
    fields: [
      textShort("Tema / kurs", true),
      dateField("Gjennomført dato", true),
      textShort("Instruktør eller ansvarlig", true),
      textLong("Kort innhold", true),
      yesNo("Jeg bekrefter at opplæringen er mottatt og forstått", true),
    ],
  },
  {
    title: "Psykososial kartlegging (kort)",
    description:
      "Lavterskel tilbakemelding om arbeidsmiljø og trivsel. Støtter systematisk HMS (AML § 4-3, ISO 45003).",
    category: "WELLBEING",
    industryScope: ["all"],
    requiresSignature: false,
    fields: [
      section("Arbeidssituasjon"),
      ...[
        "Jeg opplever at jeg kan si fra om belastning uten negative reaksjoner",
        "Arbeidsmengden oppleves som forsvarlig",
        "Samarbeid og kommunikasjon i teamet fungerer godt",
      ].map((q) => ({
        fieldType: "LIKERT_SCALE" as const,
        label: q,
        isRequired: true,
      })),
      section("Tillegg"),
      textLong("Kommentar (valgfritt)", false),
    ],
  },
  {
    title: "Kundeklage (kort)",
    description:
      "Registrering av kundeklage for oppfølging og forbedring (ISO 10002, kundefokus i internkontroll).",
    category: "COMPLAINT",
    industryScope: ["all"],
    requiresSignature: false,
    fields: [
      dateField("Dato for henvendelse", true),
      textShort("Kunde / kontakt (valgfritt)", false),
      textLong("Beskrivelse av klagen", true),
      textLong("Umiddelbare tiltak", false),
      textShort("Ansvarlig for oppfølging", false),
    ],
  },
  {
    title: "Elektrisk sikkerhet og el-kontroll (generell)",
    description:
      "Periodisk sjekk av stikkontakter, kabler, jordfeilvarsel og orden. Nyttig ved tilsyn og spørsmål om elektro i blant annet helsevesen, handel, kontor og service (lavspenningsforskriften og internkontroll).",
    category: "CHECKLIST",
    industryScope: ["all"],
    fields: [
      dateField("Kontrolldato", true),
      textShort("Lokale / avdeling", true),
      ...checklistBlock("Fast installasjon og fordeling", [
        "Synlig skade på stikkontakter, brytere og kapslinger er utbedret eller området er avsperret",
        "Jordfeilbrytere eller jordfeilvarsler finnes der forskriften krever det, og er funksjonstestet etter intern plan",
        "Fordelingstavler og tekniske rom er merket og ikke tilgjengelige for uvedkommende der nødvendig",
      ]),
      ...checklistBlock("Kabel, skjøteledning og orden", [
        "Skjøteledninger og kabeltromler er hele, tørre og ikke overbelastet",
        "Kabler er lagt slik at de ikke utsettes for mekanisk skade eller knyttap",
        "Renhold og lagring hindrer ikke lufting rundt utstyr som avleder varme",
      ]),
      ...checklistBlock("Maskiner og elektrisk arbeidsutstyr", [
        "Elektrisk arbeidsutstyr kontrolleres før bruk; defekte merkes og tas ut av drift",
        "Reparasjon og endring på fast installasjon eller utstyr utføres av kvalifisert personell der loven krever det",
      ]),
      textLong("Avvik og planlagte tiltak", false),
    ],
  },
];

const constructionTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "SJA før risikoarbeid (bygg)",
    description:
      "Kort sikker jobb-analyse før arbeid med fall, løft, maskin eller trafikk på anlegg (byggherreforskriften, AML).",
    category: "CHECKLIST",
    industryScope: ["construction"],
    fields: [
      textShort("Prosjekt / arbeidsområde", true),
      dateField("Dato", true),
      ...checklistBlock("Plan og risiko", [
        "Aktiviteten er avstemt med prosjektleder / BAS",
        "Relevante forhold fra SHA-plan er vurdert",
        "Sperring, skilting og adkomst er på plass før start",
      ]),
      ...checklistBlock("Fall, løft og maskin", [
        "Fallsikring eller stillas er godkjent og kontrollert",
        "Løfteoperasjon er planlagt med kjent vekt og signalmann ved behov",
        "Maskiner har fungerende vern og nødstopp",
      ]),
      textLong("Tiltak og restriksjoner før start", true),
    ],
  },
  {
    title: "Stillas og fallsikring (byggplass)",
    description: "Kontroll før eller under bruk av stillas og fallsikring på anlegg.",
    category: "CHECKLIST",
    industryScope: ["construction"],
    fields: [
      ...checklistBlock("Stillas", [
        "Stillas er merket og montert etter leverandørs krav",
        "Rekkverk, tårn og innfesting er intakte",
        "Adkomst og landinger er ryddige og sikre",
      ]),
      ...checklistBlock("Fallsikring", [
        "Personlig fallsikringsutstyr er kontrollert før bruk",
        "Forankringspunkter er godkjente og tilgjengelige",
        "Vær og underlag er vurdert for glid og vind",
      ]),
    ],
  },
  {
    title: "Gravearbeid og undergrunn",
    description: "Sjekk før graving med fare for kabler, grøfter og stabilitet.",
    category: "CHECKLIST",
    industryScope: ["construction"],
    fields: [
      ...checklistBlock("Forberedelse", [
        "Gravemelding / ledningskart er innhentet der det kreves",
        "Grøft er sikret mot ras og nedfall",
        "Avstand til bygg og maskiner er vurdert",
      ]),
      ...checklistBlock("Utførelse", [
        "Sikring av grøftekant og adkomst for mannskap",
        "Maskinfører og signalmann er avklart ved behov",
        "Avfall og masse håndteres uten hindring for trafikk og ganglinjer",
      ]),
    ],
  },
  {
    title: "Midlertidig strøm og elektro (anlegg)",
    description: "Kontroll av midlertidige el-anlegg og bruk på byggeplass.",
    category: "CHECKLIST",
    industryScope: ["construction"],
    fields: [
      ...checklistBlock("Anlegg", [
        "Fordelingstavle er merket og låst der nødvendig",
        "Jordfeilvarslere er i bruk der de skal være",
        "Skjøteledninger og kabeltromler er i forsvarlig stand",
      ]),
      ...checklistBlock("Bruk", [
        "Støpsler og endestykker er hele og tørre",
        "Elektrisk arbeid utføres av kvalifisert personell",
        "Advarsel og sperring ved åpne kurs",
      ]),
    ],
  },
];

const healthcareTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "Nålestikk og blodeksponering",
    description:
      "Hendelsesnotat ved stuck, skjæresår eller eksponering for biologisk materiale. Oppfølging og dokumentasjon.",
    category: "INCIDENT",
    industryScope: ["healthcare"],
    fields: [
      dateField("Tidspunkt", true),
      textShort("Sted (avdeling)", true),
      textLong("Hva skjedde", true),
      yesNo("Ble det utført førstehjelp / skylling", false),
      yesNo("Lege/vaksinekontakt er varslet", false),
      textLong("Videre oppfølging og tiltak", false),
    ],
  },
  {
    title: "Smittevernrunde (pasientnær)",
    description: "Kontroll av smittevernrutiner, håndhygiene og vernutstyr.",
    category: "CHECKLIST",
    industryScope: ["healthcare"],
    fields: [
      ...checklistBlock("Grunnrutiner", [
        "Håndhygiene og desinfeksjon følges etter retningslinjer",
        "Bruk av hansker og munnbind er tilpasset situasjonen",
        "Avfall med risiko for smitte sorteres korrekt",
      ]),
      ...checklistBlock("Miljø", [
        "Renhold i pasientnære soner er tilfredsstillende",
        "Isolasjonsrom og skilt er korrekt brukt ved behov",
        "Ventilasjon og overflatehygiene er vurdert",
      ]),
    ],
  },
  {
    title: "Vold og trussel (hendelsesnotat)",
    description: "Dokumentasjon av trusler eller vold i arbeidssituasjon for risikovurdering og tiltak (AML § 4-3).",
    category: "INCIDENT",
    industryScope: ["healthcare"],
    fields: [
      dateField("Dato", true),
      textLong("Beskrivelse av hendelsen", true),
      yesNo("Politiet er kontaktet", false),
      textLong("Tiltak for å hindre gjentakelse", false),
      textShort("Ansvarlig for oppfølging", false),
    ],
  },
  {
    title: "Medikamenthåndtering (kontroll)",
    description: "Kontroll av oppbevaring, merking og rutiner for legemidler.",
    category: "CHECKLIST",
    industryScope: ["healthcare"],
    fields: [
      ...checklistBlock("Oppbevaring", [
        "Legemidler er låst og atskilt etter regler",
        "Temperatur og kjøling er dokumentert der krav finnes",
        "Utløpsdatoer er kontrollert på utvalgte preparater",
      ]),
      ...checklistBlock("Rutiner", [
        "Dobbelkontroll ved high-alert legemidler følges",
        "Avvik ved feildosering er rapportert i henhold til prosedyre",
      ]),
    ],
  },
];

const manufacturingTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "LOTO før vedlikehold",
    description: "Låsing og merking før arbeid på maskin eller anlegg (maskinsikkerhet, stans av energi).",
    category: "CHECKLIST",
    industryScope: ["manufacturing"],
    fields: [
      textShort("Maskin / anlegg", true),
      ...checklistBlock("Prosedyre", [
        "Alle energikilder er identifisert og isolert",
        "Lås og merke er påført av autorisert person",
        "Verifisert at anlegget er trygt (prøvestart / nulltrykk)",
        "Nøkkel eller lås er under kontroll av den som utfører arbeidet",
      ]),
    ],
  },
  {
    title: "Maskinstopp og nødstopp",
    description: "Sjekk etter aktivering av nødstopp eller uventet stopp.",
    category: "CHECKLIST",
    industryScope: ["manufacturing"],
    fields: [
      ...checklistBlock("Sikkerhet", [
        "Årsak til stopp er kartlagt før gjenstart",
        "Området er avsperret og tomt for personell ved feilsøking",
        "Nødstopp er tilbakestilt i henhold til instruks",
      ]),
      ...checklistBlock("Gjenstart", [
        "Funksjonstest av vern er utført der det kreves",
        "Operatør er informert og klar for drift",
      ]),
    ],
  },
  {
    title: "Kjemikaliespill (produksjon)",
    description: "Akutt håndtering av søl av farlig kjemikalie i produksjon eller lager.",
    category: "CHECKLIST",
    industryScope: ["manufacturing"],
    fields: [
      textShort("Stoff / produktnavn", true),
      ...checklistBlock("Tiltak", [
        "Området er sperret og PPE er valgt etter datablad",
        "Oppsug og neutralisering er utført etter prosedyre",
        "Avfall er lagt i merket emballasje for farlig avfall",
        "HMS/verneombud er varslet ved større søl eller eksponering",
      ]),
    ],
  },
  {
    title: "Truck og kjøretøy (lager/produksjon)",
    description: "Daglig eller periodisk kontroll før bruk av truck i produksjon eller lager.",
    category: "CHECKLIST",
    industryScope: ["manufacturing"],
    fields: [
      textShort("Kjøretøy / ident", true),
      dateField("Kontrolldato", true),
      ...checklistBlock("Kontroll", [
        "Bremser, lys og horn fungerer",
        "Dekk og mast er uten synlig skade",
        "Last og gaffel er innen tillatt kapasitet",
        "Operatør har gyldig kompetansebevis for aktuelt kjøretøy",
      ]),
    ],
  },
];

const retailTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "Butikkåpning sikkerhet",
    description: "Sjekkliste ved åpning av butikk – sikkerhet, brann og orden.",
    category: "CHECKLIST",
    industryScope: ["retail"],
    fields: [
      ...checklistBlock("Adkomst og alarm", [
        "Alarm er slått av/på etter rutine",
        "Inngang og nødutganger er frie",
        "Belysning i salgsområde er i orden",
      ]),
      ...checklistBlock("Brann og førstehjelp", [
        "Brannslukker og rømningsplan er tilgjengelig",
        "Førstehjelpsutstyr er komplett",
      ]),
    ],
  },
  {
    title: "Kasse og ranberedskap",
    description: "Kort gjennomgang av rutiner ved kasse og trusler om ran.",
    category: "CHECKLIST",
    industryScope: ["retail"],
    fields: [
      ...checklistBlock("Rutiner", [
        "Beløpsgrenser og varslingskode er kjent for vaktene",
        "Kassaskuff og safe følger interne regler",
        "Kamera og belysning ved kasse er funksjonelle",
      ]),
      textLong("Avvik eller hendelser siden sist gjennomgang", false),
    ],
  },
  {
    title: "Varemottak og trucksoner",
    description: "Sikkerhet ved mottak, truck og kryssende trafikk i butikk/lager.",
    category: "CHECKLIST",
    industryScope: ["retail"],
    fields: [
      ...checklistBlock("Soner", [
        "Gang- og trucksoner er tydelig markert",
        "Fotgjengere og truck har avklarte kryssingspunkter",
        "Løft og stabler er innen sikkerhetsmargin",
      ]),
      ...checklistBlock("Personell", [
        "Truckførere har dokumentert opplæring",
        "Verneutstyr brukes ved behov i mottak",
      ]),
    ],
  },
  {
    title: "Renhold og kjemikalier (butikk)",
    description: "Kontroll av renholdsmidler og sikker bruk i salgslokale.",
    category: "CHECKLIST",
    industryScope: ["retail"],
    fields: [
      ...checklistBlock("Lagring og merking", [
        "Kjemikalier er merket og oppbevart utilgjengelig for kunder",
        "SDS er tilgjengelig for ansatte",
      ]),
      ...checklistBlock("Bruk", [
        "Verneutstyr brukes ved sterke midler",
        "Spill håndteres etter rutine",
      ]),
    ],
  },
];

const transportTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "Kjøretøykontroll før kjøring",
    description: "Før-kjøring sjekk for varebil, lastebil eller terminalkjøretøy.",
    category: "CHECKLIST",
    industryScope: ["transport"],
    fields: [
      textShort("Kjøretøy (regnr)", true),
      dateField("Dato", true),
      ...checklistBlock("Teknisk", [
        "Dekk, lys, speil og vindusviskere er i orden",
        "Bremser og styring oppleves normale",
        "Last og surringer er kontrollert",
      ]),
      ...checklistBlock("Dokumentasjon", [
        "Kjøretøy er EU-godkjent / etterkontroll i orden der relevant",
        "Førerkort og påkrevd kompetanse er med",
      ]),
    ],
  },
  {
    title: "Godssikring og lasting",
    description: "Kontroll av lastsikring før transport (vekt, surring, tyngdepunkt).",
    category: "CHECKLIST",
    industryScope: ["transport"],
    fields: [
      ...checklistBlock("Last", [
        "Vekt og dimensjoner er innen tillatelse for kjøretøyet",
        "Surring og spennbånd er i god stand og riktig antall",
        "Tyngdepunkt og stabilitet er vurdert for høye laster",
      ]),
      ...checklistBlock("Dokument", [
        "Fraktbrev og farlig gods er merket etter ADR der relevant",
      ]),
    ],
  },
  {
    title: "Kjøre- og hviletid (selvvurdering)",
    description:
      "Kort egenkontroll av uthviling og plan før kjøring (kjøre- og hviletidsregler, arbeidstid).",
    category: "CHECKLIST",
    industryScope: ["transport"],
    fields: [
      dateField("Dato", true),
      yesNo("Jeg har hatt tilstrekkelig hvile før kjøring", true),
      yesNo("Jeg er ikke påvirket av medikamenter eller alkohol", true),
      textLong("Avvik eller behov for pauseplan (valgfritt)", false),
    ],
  },
  {
    title: "Terminal og lager (gående og truck)",
    description: "Sikkerhet for gående i terminal og kryssende trucktrafikk.",
    category: "CHECKLIST",
    industryScope: ["transport"],
    fields: [
      ...checklistBlock("Trafikk", [
        "Ganglinjer og kjøreruter er fulgt",
        "Varsellys og refleks brukes i mørke",
        "Advarsler ved bakkjøring er på plass",
      ]),
      ...checklistBlock("Kommunikasjon", [
        "Signalmann brukes ved behov ved lasting",
      ]),
    ],
  },
];

const hospitalityTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "Kjøkken sikkerhet (daglig)",
    description: "HMS-sjekk på kjøkken – sliping, varme, orden og personlig vern.",
    category: "CHECKLIST",
    industryScope: ["hospitality"],
    fields: [
      ...checklistBlock("Maskiner og varme", [
        "Kniver og maskiner brukes med riktig verneutstyr",
        "Friturer og varme flater er uten overfylling og søl",
        "Brannslukker og brann teppe er tilgjengelig",
      ]),
      ...checklistBlock("Orden", [
        "Gulv er tørre og ryddige i risikosoner",
        "Kjøling og varmehold følger temperaturlogger der krav finnes",
      ]),
    ],
  },
  {
    title: "Rengjøringsmidler (hotell/restaurant)",
    description: "Sikker bruk og lagring av kjemikalier i renhold og kjøkken.",
    category: "CHECKLIST",
    industryScope: ["hospitality"],
    fields: [
      ...checklistBlock("Lagring", [
        "Midler er merket og atskilt fra mat og drikke",
        "Blandinger skjer etter datablad og merking",
      ]),
      ...checklistBlock("Bruk", [
        "Hansker og ventilasjon brukes ved sterke produkter",
      ]),
    ],
  },
  {
    title: "Brann og ventilasjon kjøkken",
    description: "Kontroll av ventilasjon, fettfilter og brannforebygging på kjøkken.",
    category: "CHECKLIST",
    industryScope: ["hospitality"],
    fields: [
      ...checklistBlock("Ventilasjon", [
        "Fettfilter og ventilasjon er rengjort etter plan",
        "Brannalarm i kjøkken er testet der rutine finnes",
      ]),
      ...checklistBlock("Tiltak", [
        "Avvik fra brannvesen eller kontrollør er fulgt opp",
      ]),
    ],
  },
  {
    title: "Servering alkohol (avvik)",
    description: "Notat ved avvik fra alkoholloven eller interne rutiner (aldersgrense, synlig beruset).",
    category: "CUSTOM",
    industryScope: ["hospitality"],
    fields: [
      dateField("Dato", true),
      textLong("Hva skjedde", true),
      textLong("Tiltak (nekting, vaktleder, politi)", false),
      textShort("Ansvarlig", false),
    ],
  },
];

const educationTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "Utflukt og ekskursjon (risiko før avreise)",
    description: "Sjekk før aktivitet utenfor skole/barnehage – ansvar, transport og førstehjelp.",
    category: "CHECKLIST",
    industryScope: ["education"],
    fields: [
      textShort("Sted og aktivitet", true),
      dateField("Dato", true),
      ...checklistBlock("Plan", [
        "Risiko er vurdert og godkjent av leder",
        "Ansvarfordeling og kontaktnummer er kjent",
        "Førstehjelpsutstyr og medisinrutiner er avklart",
      ]),
      ...checklistBlock("Transport", [
        "Kjøretøy og sjåfør oppfyller krav",
        "Bilbelte og kapasitet er ivaretatt",
      ]),
    ],
  },
  {
    title: "Elevhendelse (kort notat)",
    description: "Kort registrering av ulykke eller skade på elev for intern oppfølging.",
    category: "INCIDENT",
    industryScope: ["education"],
    fields: [
      dateField("Dato og tid", true),
      textShort("Sted", true),
      textLong("Hva skjedde", true),
      textLong("Tiltak og varsling til foresatte", false),
    ],
  },
  {
    title: "Arbeidsmiljø i klasserom",
    description: "Kontroll av lys, støy, luft og orden i undervisningsrom.",
    category: "CHECKLIST",
    industryScope: ["education"],
    fields: [
      ...checklistBlock("Miljø", [
        "Lys og temperatur er tilfredsstillende",
        "Støynivå og akustikk er akseptabelt for undervisning",
        "Lufting / ventilasjon er mulig og brukes",
      ]),
      ...checklistBlock("Orden", [
        "Gangveier og nødutgang er frie",
        "Elektrisk utstyr og kabler er i forsvarlig stand",
      ]),
    ],
  },
];

const technologyTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "Kontor og hjemmekontor (ergonomi)",
    description: "Kort kartlegging av skjermarbeid for å forebygge belastningsplager (AML, ergonomi).",
    category: "CHECKLIST",
    industryScope: ["technology"],
    fields: [
      ...checklistBlock("Arbeidsplass", [
        "Skjerm, stol og bord er justert for neutral stilling",
        "Pauser og variasjon i arbeid er praktisert",
        "Belysning og blend unngås der mulig",
      ]),
      textLong("Behov for tiltak eller utstyr", false),
    ],
  },
  {
    title: "Tilgangsrevisjon (IT)",
    description: "Periodisk kontroll av brukertilganger og kritiske systemer.",
    category: "CHECKLIST",
    industryScope: ["technology"],
    fields: [
      dateField("Revisjonsdato", true),
      ...checklistBlock("Tilganger", [
        "Uaktive brukere er deaktivert eller fjernet",
        "Administratorrettigheter er begrenset til behov",
        "Deling av kontoer skjer ikke",
      ]),
      ...checklistBlock("Sikkerhet", [
        "MFA er aktivert for fjernadgang der policy krever det",
        "Sikkerhetsoppdateringer er planlagt / gjennomført",
      ]),
    ],
  },
  {
    title: "IT-sikkerhetshendelse eller databrann",
    description: "Kort registrering ved mistanke om brudd, virus eller tap av utstyr (beredskap).",
    category: "BCM",
    industryScope: ["technology"],
    fields: [
      dateField("Oppdaget", true),
      textLong("Beskrivelse av hendelsen", true),
      yesNo("Berørte parter er varslet i henhold til rutine", false),
      textLong("Iverksatte tiltak", false),
    ],
  },
];

const agricultureTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "Traktor og kjøretøy (daglig kontroll)",
    description: "Sjekk før kjøring med traktor eller jordbruksmaskin.",
    category: "CHECKLIST",
    industryScope: ["agriculture"],
    fields: [
      textShort("Kjøretøy", true),
      dateField("Dato", true),
      ...checklistBlock("Teknisk", [
        "Dekk, bremser og lys er i orden",
        "Rops / sikkerhetsbelte brukes der det finnes",
        "Hydraulikk og koblinger er uten synlig lekkasje",
      ]),
    ],
  },
  {
    title: "Gjødsellager og gassfare",
    description: "Kontroll av ventilasjon og adkomst ved gjødselkum eller lagring.",
    category: "CHECKLIST",
    industryScope: ["agriculture"],
    fields: [
      ...checklistBlock("Sikkerhet", [
        "Advarsler og sperring er på plass ved risikable soner",
        "Ventilasjon og måling er vurdert før inntrenging",
        "Arbeid alene er unngått i risikable rom",
      ]),
      textLong("Avvik og tiltak", false),
    ],
  },
  {
    title: "Dyrehåndtering sikkerhet",
    description: "Kontroll av håndtering av storfe, sau eller annet husdyr.",
    category: "CHECKLIST",
    industryScope: ["agriculture"],
    fields: [
      ...checklistBlock("Faresituasjoner", [
        "Drivganger og låser fungerer og er ryddige",
        "Eskalering ved aggressive dyr er kjent for mannskapet",
        "Nødkommunikasjon er tilgjengelig ved alenearbeid der tillatt",
      ]),
    ],
  },
  {
    title: "Plantevern og sprøyting",
    description: "Sjekk før eller etter bruk av plantevernmidler (PPE, vær, nabo).",
    category: "CHECKLIST",
    industryScope: ["agriculture"],
    fields: [
      ...checklistBlock("Forberedelse", [
        "Riktig PPE og åndedrettsvern er valgt etter etikett",
        "Vær og vind er vurdert for drift",
        "Nabovarsling skjer etter krav og rutine",
      ]),
      ...checklistBlock("Etter bruk", [
        "Utstyr er rengjort og spill håndtert forsvarlig",
        "Personlig hygiene og klær er håndtert etter eksponering",
      ]),
    ],
  },
];

const otherTemplates: FormTemplateLibraryEntry[] = [
  {
    title: "Vernerunde liten virksomhet",
    description: "Enkel HMS-runde for små kontor- eller tjenestevirksomheter uten egen bransjemal.",
    category: "CHECKLIST",
    industryScope: ["other"],
    fields: [
      ...checklistBlock("Lokaler", [
        "Orden, lys og ventilasjon er tilfredsstillende",
        "Nødutgang og rømningsveier er frie",
        "Elektrisk utstyr og kabler er i forsvarlig stand",
      ]),
      ...checklistBlock("Organisasjon", [
        "Avvikssystem er kjent for alle",
        "Førstehjelpsutstyr er tilgjengelig",
      ]),
    ],
  },
  {
    title: "Innleid arbeidskraft (HMS-avklaring)",
    description: "Kort avklaring av HMS-ansvar og orientering ved innleie (AML, internkontroll).",
    category: "CUSTOM",
    industryScope: ["other"],
    fields: [
      dateField("Dato", true),
      textShort("Leverandør / prosjekt", true),
      textLong("Gjennomgåtte HMS-krav og risikoer", true),
      yesNo("Innleid personell er orientert om vernerunder og avvik", false),
    ],
  },
  {
    title: "Beredskap og nødnummer (kontroll)",
    description: "At nødprosedyrer og kontaktliste er oppdatert.",
    category: "BCM",
    industryScope: ["other"],
    fields: [
      dateField("Kontrolldato", true),
      ...checklistBlock("Liste", [
        "Brann, lege og politi er synlig for ansatte",
        "Varslingskjede ved hendelse er oppdatert",
        "Møteplass ved evakuering er kjent",
      ]),
    ],
  },
];

/** Alle globale skjemamaler som skal synkes via seed. */
export function getGlobalFormTemplateLibrary(): FormTemplateLibraryEntry[] {
  return [
    ...commonTemplates,
    ...constructionTemplates,
    ...healthcareTemplates,
    ...manufacturingTemplates,
    ...retailTemplates,
    ...transportTemplates,
    ...hospitalityTemplates,
    ...educationTemplates,
    ...technologyTemplates,
    ...agricultureTemplates,
    ...otherTemplates,
  ];
}
