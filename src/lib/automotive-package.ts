import type {
  IndustryCourseTemplateSeed,
  IndustryExposureAgentSeed,
  IndustryInspectionTemplateSeed,
  IndustryLegalReferenceSeed,
  IndustryPackage,
  IndustryRiskSeed,
  IndustrySjaTemplateSeed,
} from "@/lib/industry-packages";
import { AUTOMOTIVE_WORKSHOP_TYPES } from "@/lib/automotive-workshop-types";

const VERKSTEDFORSKRIFTEN =
  "https://lovdata.no/dokument/SF/forskrift/2020-10-28-2170";
const FUA = "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1357";
const ARBEIDSPLASS = "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1356";
const GRENSEVERDIER = "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1358";
const AML = "https://lovdata.no/dokument/NL/lov/2005-06-17-62";
const IK_HMS = "https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127";
const AVFALL = "https://lovdata.no/dokument/SF/forskrift/2004-06-01-930";
const FARLIG_STOFF = "https://lovdata.no/dokument/SF/forskrift/2009-06-08-602";
const BHT = "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1355";
const PKK = "https://lovdata.no/dokument/SF/forskrift/2012-05-13-488";
const ATEX = "https://lovdata.no/dokument/SF/forskrift/2003-06-10-727";

const risks: IndustryRiskSeed[] = [
  {
    title: "Klemskade ved kjøretøyløfter",
    context: "Fallende kjøretøy eller klemming mellom løfter og bil ved feil oppstilling, manglende sikring eller opplæring.",
    category: "SAFETY",
    likelihood: 2,
    consequence: 5,
    controls: "Dokumentert og utstyrsspesifikk opplæring (FuA §§ 10-2 og 10-4). Daglig kontroll før bruk. Løftearmer og gummiklosh plassert etter produsent.",
  },
  {
    title: "Fall i arbeidsgrav",
    context: "Fall ned i grav, eksosansamling og klemfare når kjøretøy kjøres over grav uten avsperring.",
    category: "SAFETY",
    likelihood: 2,
    consequence: 4,
    controls: "Rekkverk/overdekking når grav ikke er i bruk. God belysning. Aldri tomgang uten avsug.",
  },
  {
    title: "Dieseleksos i hall",
    context: "Dieseleksos er klassifisert kreftfremkallende (K) og reproduksjonstoksisk (G). Grenseverdi 0,05 mg/m³ EC fra 21.02.2023.",
    category: "HEALTH",
    likelihood: 4,
    consequence: 4,
    controls: "Punktavsug på eksosrør ved motor inne. Måling mot grenseverdi. Eksponeringsregister 60 år (FuA kap. 31).",
  },
  {
    title: "Løsemidler og mineralolje på hud",
    context: "Hudkontakt med mineralolje (kreftfare) og innånding av løsemidler ved rengjøring, oljeskift og deltvask.",
    category: "HEALTH",
    likelihood: 4,
    consequence: 3,
    controls: "Stoffkartotek, hansker, substitusjon, hudpleie og eksponeringsregister. AML § 4-5 og FuA kap. 3.",
  },
  {
    title: "Diisocyanater ved lakk og lim",
    context: "Diisocyanater krever spesifikk opplæring (FuA § 3-12 og REACH ≥ 0,1 %). Friskluft ved sprøyting.",
    category: "HEALTH",
    likelihood: 3,
    consequence: 4,
    controls: "Opplæring før bruk, friskluftsmaske, sprøyteboks med avsug, stoffkartotek-scan.",
    workshopTypes: ["skade_lakk"],
  },
  {
    title: "Sveiserøyk",
    context: "Sveiserøyk er IARC-klassifisert kreftfremkallende. AT-kampanjer har gitt pålegg om manglende kartlegging og avsug.",
    category: "HEALTH",
    likelihood: 3,
    consequence: 4,
    controls: "Punktavsug, SJA før sveising, åndedrettsvern, informasjonsblad og eksponeringsregister (FuA kap. 5 og 31).",
  },
  {
    title: "Støy over tiltaksverdi",
    context: "Slagverktøy, sliping og dekkmaskiner kan overskride 85 dB. Hørselsskade og BHT-helseundersøkelse.",
    category: "HEALTH",
    likelihood: 4,
    consequence: 3,
    controls: "Hørselsvern, støykartlegging, BHT-undersøkelse når tiltaksverdi overskrides (FuA kap. 14).",
  },
  {
    title: "Hånd-arm-vibrasjon",
    context: "Muttertrekker, meisel og slipemaskin gir HAV-risiko og mulige kar-/nerveskader.",
    category: "HEALTH",
    likelihood: 4,
    consequence: 3,
    controls: "Redusert eksponeringstid, lavvibrasjonsverktøy, jobbrotasjon og BHT-oppfølging (FuA kap. 14).",
  },
  {
    title: "Brann og ATEX i sprøyteboks",
    context: "Løsemiddeldamp i sprøyteboks er eksplosjonsfarlig sone. Feil ventilasjon eller gnist kan gi brann/eksplosjon.",
    category: "SAFETY",
    likelihood: 2,
    consequence: 5,
    controls: "ATEX-brukerdokument, forrigling, EX-utstyr, orden og DSB farlig stoff-lagring.",
    workshopTypes: ["skade_lakk"],
  },
  {
    title: "Høyvolt el-/hybridbil",
    context: "Arbeid på drivbatteri og oransje kabler kan gi livsfarlig strømgjennomgang.",
    category: "SAFETY",
    likelihood: 2,
    consequence: 5,
    controls: "NBF-praksis: to-mannsregel, isolert verktøy, frakobling etter produsent, merking og opplæring (AML § 3-2, verkstedforskriften § 11).",
    workshopTypes: ["elbil"],
  },
  {
    title: "Thermal runaway i litiumbatteri",
    context: "Skadet eller ladende drivbatteri kan gå i termisk løpsk og gi giftig røyk og brann som er vanskelig å slokke.",
    category: "SAFETY",
    likelihood: 2,
    consequence: 5,
    controls: "Karanteneområde, ikke lagre skadet batteri innendørs uten plan, brannrutine og DSB/NBF-veileder.",
    workshopTypes: ["elbil"],
  },
  {
    title: "Kjemikaliesøl og farlig avfall",
    context: "Spillolje, bremsevæske, frostvæske og batterisyre på gulv gir glatt underlag, forurensning og brannfare.",
    category: "ENVIRONMENTAL",
    likelihood: 3,
    consequence: 3,
    controls: "Absorbent, oljeutskiller, merket avfall, levering til godkjent mottak (avfallsforskriften kap. 11).",
  },
  {
    title: "Ergonomi under bil",
    context: "Arbeid over hodet, tunge løft av hjul og girkasse gir muskel- og skjelettplager.",
    category: "HEALTH",
    likelihood: 4,
    consequence: 3,
    controls: "Løftehjelpemidler, jobbrotasjon, opplæring i løfteteknikk (AML § 4-4).",
  },
  {
    title: "Prøvekjøring av kundebil",
    context: "Trafikkulykke, skade på kundebil eller tredjepart ved prøvekjøring uten sjekk av bremser, dekk og førerrett.",
    category: "SAFETY",
    likelihood: 2,
    consequence: 5,
    controls: "Sjekkliste før vei, gyldig førerkort for klassen, merking, rute og forsikring.",
  },
  {
    title: "Lærling uten tilsyn",
    context: "Unge under 18 kan ikke utføre visse farlige arbeider alene (høyvolt, visse kjemikalier, farlige maskiner).",
    category: "SAFETY",
    likelihood: 3,
    consequence: 4,
    controls: "Tilsyn etter OLM kap. 12 og § 8-1. Forbudsliste kjent av veileder. Opplæring før selvstendig arbeid.",
  },
];

const sjaTemplates: IndustrySjaTemplateSeed[] = [
  {
    name: "Løft og arbeid under kjøretøy",
    description: "SJA før arbeid på løfter, bukker eller over grav. FuA kap. 10 og 12.",
    workLocation: "Verkstedhall",
    hazards: [
      { activity: "Oppstilling på løfter", hazard: "Kjøretøy glir av armer", consequence: "Klemskade, død", probability: 2, severity: 5, measures: "Riktig løftepunkt etter produsent. Sjekk gummi og armer. Ingen under bil før sikret." },
      { activity: "Arbeid under hevet bil", hazard: "Fallende last / utilsiktet senking", consequence: "Alvorlig klemskade", probability: 2, severity: 5, measures: "Mekanisk sikring der det kreves. Sperreområde. Kommunikasjon ved senking." },
      { activity: "Arbeid i grav", hazard: "Fall og eksos", consequence: "Fallskade, forgiftning", probability: 2, severity: 4, measures: "Avsug, rekkverk, ikke tomgang uten avsug." },
    ],
  },
  {
    name: "Høyvolt / frakobling drivbatteri",
    description: "SJA for arbeid på el-/hybridbil. NBF to-mannsregel og isolert verktøy.",
    workLocation: "Elbil-sone",
    workshopTypes: ["elbil"],
    hazards: [
      { activity: "Frakobling av serviceplugg", hazard: "Restspenning / feil rekkefølge", consequence: "Strømskade, død", probability: 2, severity: 5, measures: "Produsentanvisning. Isolert verktøy. Måling av spenningsfrihet. To personer." },
      { activity: "Arbeid nær oransje kabler", hazard: "Utilsiktet kontakt med høyspenning", consequence: "Livsfarlig strømgjennomgang", probability: 2, severity: 5, measures: "Merking, avsperring, verneutstyr klasse 0, opplæring." },
      { activity: "Håndtering av skadet batteri", hazard: "Thermal runaway", consequence: "Brann, giftig røyk", probability: 2, severity: 5, measures: "Karantene, brannslokking etter NBF/DSB, evakuering." },
    ],
  },
  {
    name: "Sveising i hall",
    description: "SJA for varmt arbeid og sveiserøyk. FuA kap. 5 og 31.",
    workLocation: "Verkstedhall / sveiseplass",
    hazards: [
      { activity: "Sveising på kjøretøy", hazard: "Sveiserøyk og UV", consequence: "Kreftfare, øyeskade", probability: 3, severity: 4, measures: "Punktavsug, sveisemaske, åndedrettsvern, eksponeringsregister." },
      { activity: "Varmt arbeid nær drivstoff/plast", hazard: "Brann", consequence: "Brannskade, verkstedbrann", probability: 2, severity: 5, measures: "Brannvakt, slokkeutstyr, fjern brennbart, varmt arbeid-sertifikat." },
      { activity: "Sveising i trange rom", hazard: "Oksygenmangel / røyk", consequence: "Forgiftning", probability: 2, severity: 4, measures: "Ekstra avsug, ikke alene, gassmåling ved behov." },
    ],
  },
  {
    name: "Lakkering i sprøyteboks",
    description: "SJA for sprøyting med løsemidler og diisocyanater. FuA § 3-12, ATEX.",
    workLocation: "Sprøyteboks",
    workshopTypes: ["skade_lakk"],
    hazards: [
      { activity: "Sprøyting", hazard: "Innånding diisocyanater/løsemidler", consequence: "Astma, kreftfare", probability: 3, severity: 4, measures: "Friskluft, opplæring, avsug i boks, forrigling." },
      { activity: "Blanding av lakk", hazard: "Søl og damp", consequence: "Hud- og luftveisskade", probability: 3, severity: 3, measures: "Hansker, vernebriller, avtrekk ved blanding." },
      { activity: "Arbeid i EX-sone", hazard: "Gnist / statisk elektrisitet", consequence: "Eksplosjon", probability: 2, severity: 5, measures: "EX-utstyr, jording, ingen åpen ild, ATEX-dokument." },
    ],
  },
  {
    name: "Prøvekjøring",
    description: "SJA før prøvekjøring på vei. Trafikksikkerhet og kundebil.",
    workLocation: "Offentlig vei / prøvestrekning",
    hazards: [
      { activity: "Kjøring etter reparasjon", hazard: "Svikt i bremser/styring", consequence: "Ulykke", probability: 2, severity: 5, measures: "Sjekkliste før vei. Bremser, hjul, lys. Gyldig førerrett." },
      { activity: "Høy hastighet / test", hazard: "Tap av kontroll", consequence: "Alvorlig ulykke", probability: 2, severity: 5, measures: "Kun nødvendig kjøring. Egnet vei. Passasjer kun ved behov." },
    ],
  },
  {
    name: "Hjulavtrekk / dekkmontering",
    description: "SJA for dekkmaskin, klemfare og sprengning.",
    workLocation: "Dekk-/hjulavdeling",
    hazards: [
      { activity: "Demontering av hjul", hazard: "Klemskade, tunge løft", consequence: "Knusning, ryggskade", probability: 3, severity: 3, measures: "Løfter, hansker, rett moment, to personer ved tunge hjul." },
      { activity: "Montering på dekkmaskin", hazard: "Sprengning / dekk av felg", consequence: "Alvorlig skade", probability: 2, severity: 4, measures: "Bur/skjerm, rett trykk, aldri overtrykk, opplæring." },
    ],
  },
];

function checklist(
  name: string,
  description: string,
  sections: Array<{ heading: string; items: string[] }>,
  extras?: { workshopTypes?: ReadonlyArray<string>; riskCategory?: IndustryInspectionTemplateSeed["riskCategory"] }
): IndustryInspectionTemplateSeed {
  return {
    name,
    description,
    category: "Vernerunde",
    riskCategory: extras?.riskCategory ?? "SAFETY",
    workshopTypes: extras?.workshopTypes,
    checklist: {
      items: sections.flatMap((section) => [
        { type: "heading" as const, title: section.heading },
        ...section.items.map((title) => ({ type: "item" as const, title, checked: false })),
      ]),
    },
  };
}

const inspectionTemplates: IndustryInspectionTemplateSeed[] = [
  checklist(
    "Vernerunde verkstedhall",
    "Månedlig vernerunde: løfter, avsug, kjemikalier, avfall, brann og orden. AML § 6-2.",
    [
      { heading: "Løfter og grav", items: ["Løftere er merket og uten synlige skader", "Daglig kontroll er dokumentert", "Arbeidsgrav er sikret når den ikke er i bruk"] },
      { heading: "Avsug og luft", items: ["Eksosavsug brukes ved motor inne", "Punktavsug ved sveising fungerer", "Ingen synlig eksosdis i hallen"] },
      { heading: "Kjemikalier og avfall", items: ["Stoffkartotek og SDS er tilgjengelig", "Farlig avfall er merket og adskilt", "Oljeutskiller er i drift uten alarm"] },
      { heading: "Brann og orden", items: ["Rømningsveier er frie", "Slokkeutstyr er kontrollert", "Søl er fjernet, nøkler og verdier er sikret"] },
    ]
  ),
  checklist(
    "Tilsynsklar mappe – AT og SVV § 16",
    "Sjekk at dokumentasjon Arbeidstilsynet og Statens vegvesen spør etter er ajour. Verkstedforskriften § 16 a–f og § 17.",
    [
      { heading: "Organisering (§ 16 a)", items: ["Organisasjonskart og roller er oppdatert", "Teknisk leder og stedfortreder er navngitt", "Arbeidsinstruks er kjent"] },
      { heading: "Kompetanse (§ 16 b)", items: ["Fagbrev, kurs og førerrett er registrert", "Billøfter-opplæring er dokumentert", "Plan for oppfriskning finnes"] },
      { heading: "Arbeidsprosedyre (§ 16 c)", items: ["Overordnet reparasjonsprosedyre er aktiv", "Samarbeidsavtaler er arkivert"] },
      { heading: "Kvalitetskontroll (§ 16 d)", items: ["Egenkontroll og stikkprøver er dokumentert", "Énmannsverksted har avtale om innleid kontroll"] },
      { heading: "Kalibrering (§ 16 e)", items: ["Kalibreringsbevis er lastet opp", "Gyldig til-dato er ikke utløpt"] },
      { heading: "Avvik (§ 16 f)", items: ["Kundeklager og SVV-pålegg føres i avviksmodulen", "Tiltak er fulgt opp"] },
    ],
    { riskCategory: "OPERATIONAL" }
  ),
];

const courseTemplates: IndustryCourseTemplateSeed[] = [
  { courseKey: "automotive_lift_documented", title: "Dokumentert opplæring billøfter", description: "Lovpålagt opplæring i bruk av kjøretøyløfter. FuA § 10-2. AT-listen «billøftere».", isRequired: true, validityYears: null },
  { courseKey: "automotive_lift_equipment", title: "Utstyrsspesifikk opplæring på den enkelte løfteren", description: "Opplæring på den konkrete løfteren som brukes. FuA § 10-4.", isRequired: true, validityYears: null },
  { courseKey: "automotive_isocyanates", title: "Diisocyanater – sikker bruk", description: "Obligatorisk opplæring når stoffkartotek har diisocyanater ≥ 0,1 %. FuA § 3-12 og REACH.", isRequired: true, validityYears: 5, workshopTypes: ["skade_lakk"] },
  { courseKey: "automotive_hot_work", title: "Varmt arbeid", description: "Sertifikat for sveising, skjæring og annet varmt arbeid i hall.", isRequired: true, validityYears: 5 },
  { courseKey: "automotive_ev_nbf", title: "Sikkert arbeid el-/hybrid (NBF)", description: "Høyvolt, frakobling, isolert verktøy og to-mannsregel. Årlig repetisjon etter NBF/FSE-praksis. Verkstedforskriften § 11.", isRequired: true, validityYears: 1, workshopTypes: ["elbil"] },
  { courseKey: "automotive_ev_first_aid", title: "Førstehjelp strømskade og batteribrann", description: "Førstehjelp ved strømgjennomgang og thermal runaway. NBF/DSB.", isRequired: true, validityYears: 3, workshopTypes: ["elbil"] },
  { courseKey: "automotive_f_gas", title: "F-gass opplæringsbevis (personbil/varebil)", description: "Personlig opplæringsbevis for AC-service på kjøretøy under 3,5 t. Produktforskriften. Sertifisering skjer hos Isovator/Incert – vi registrerer gyldighet.", isRequired: true, validityYears: 5 },
  { courseKey: "automotive_safety_rep", title: "Verneombudsopplæring – 40 timer", description: "Lovpålagt 40-timers opplæring for verneombud. AML § 6-5.", isRequired: false, validityYears: null },
];

const legalReferences: IndustryLegalReferenceSeed[] = [
  { title: "Arbeidsmiljøloven – internkontroll og varsling", paragraphRef: "AML § 3-1, § 5-1, § 5-2", description: "Plikt til systematisk HMS, registrering av skader og varsling ved alvorlig ulykke.", sourceUrl: AML },
  { title: "Internkontrollforskriften", paragraphRef: "IK-HMS § 5", description: "Krav til mål, organisering, risikovurdering, avvik og dokumentasjon.", sourceUrl: IK_HMS },
  { title: "Verkstedforskriften – kvalitetsstyring", paragraphRef: "§§ 15–17", description: "Godkjent verksted skal ha dokumentert kvalitetsstyring: roller, kompetanse, arbeidsprosedyre, stikkprøve, kalibrering og avvik. Statens vegvesen fører tilsyn.", sourceUrl: VERKSTEDFORSKRIFTEN },
  { title: "Verkstedforskriften – teknisk leder og kompetanse", paragraphRef: "§§ 10–11 og § 14", description: "Krav til teknisk leder/stedfortreder, merkespesifikk/elbil-kompetanse og melding ved endring som påvirker godkjenning.", sourceUrl: VERKSTEDFORSKRIFTEN },
  { title: "Utførelse av arbeid – kjemikalier og eksponering", paragraphRef: "FuA kap. 3, 5 og 31", description: "Stoffkartotek, sveiserøyk, diisocyanater og eksponeringsregister med 60 års oppbevaring.", sourceUrl: FUA },
  { title: "Utførelse av arbeid – arbeidsutstyr", paragraphRef: "FuA §§ 10-2, 10-4 og kap. 12", description: "Dokumentert og utstyrsspesifikk opplæring på billøfter. Kontroll og vedlikehold av arbeidsutstyr.", sourceUrl: FUA },
  { title: "Arbeidsplassforskriften – ventilasjon", paragraphRef: "§§ 7-1–7-3", description: "Krav til ventilasjon og eksosavsug. 1978-verkstedforskriften er opphevet.", sourceUrl: ARBEIDSPLASS },
  { title: "Tiltaks- og grenseverdier – dieseleksos", paragraphRef: "Grenseverdi 0,05 mg/m³ EC", description: "Dieseleksos med anmerkning K/G fra 21.02.2023. Måling og tiltak ved overskridelse.", sourceUrl: GRENSEVERDIER },
  { title: "BHT-plikt for bilverksted", paragraphRef: "NACE 45.2 og 45.403", description: "Bilverksted og MC-verksted er BHT-pliktige etter forskrift om organisering, ledelse og medvirkning vedlegg 1.", sourceUrl: BHT },
  { title: "Avfallsforskriften – farlig avfall, batteri og dekk", paragraphRef: "Kap. 11, 3 og 5", description: "Farlig avfall skal leveres til godkjent mottak. Returplikt for batteri og dekk.", sourceUrl: AVFALL },
  { title: "Farlig stoff og ATEX", paragraphRef: "FOR-2009-06-08-602 + ATEX-brukerforskrift", description: "Lagring av løsemidler, olje og gassflasker. Sprøyteboks som eksplosjonsfarlig sone.", sourceUrl: FARLIG_STOFF },
  { title: "PKK-forskriften – kontrollorgan", paragraphRef: "§§ 12c, 13–15", description: "Kvalitetssystem, habilitet og 17025-kalibrering for periodisk kjøretøykontroll. Gjelder kun kontrollorgan.", sourceUrl: PKK },
  { title: "ATEX brukerforskrift", paragraphRef: "FOR-2003-06-10-727", description: "Eksplosjonsverndokument og tiltak i sprøyteboks (sone 2, EN 16985).", sourceUrl: ATEX },
];

const exposureAgents: IndustryExposureAgentSeed[] = [
  {
    productName: "Dieseleksos (eksponeringsfaktor)",
    hazardClass: "Kreftfremkallende / reproduksjonstoksisk (K/G)",
    isCMR: true,
    notes: "FuA kap. 31: eksponeringsregister med 60 års oppbevaring. Grenseverdi 0,05 mg/m³ EC fra 21.02.2023. Kartlegg hvem som arbeider med motor i gang innendørs.",
  },
  {
    productName: "Sveiserøyk (eksponeringsfaktor)",
    hazardClass: "IARC kreftfremkallende",
    isCMR: true,
    notes: "FuA kap. 5 og 31: 60 års oppbevaring. Registrer sveisere og hjelpearbeidere. Punktavsug og informasjonsblad.",
  },
  {
    productName: "Mineralolje – hudkontakt (eksponeringsfaktor)",
    hazardClass: "Kreftfare ved gjentatt hudkontakt",
    isCMR: true,
    notes: "FuA kap. 3 og 31: 60 års oppbevaring. Mekanikere med olje på hud. Hansker og hudpleie.",
  },
  {
    productName: "Diisocyanater (eksponeringsfaktor)",
    hazardClass: "Sensibiliserende, astmafare",
    containsIsocyanates: true,
    isCMR: false,
    notes: "FuA § 3-12 og kap. 31: 60 års oppbevaring. Krever opplæring ved ≥ 0,1 %. Typisk lakk og lim.",
    workshopTypes: ["skade_lakk"],
  },
  {
    productName: "Løsemidler – verksted (eksponeringsfaktor)",
    hazardClass: "Løsemiddel / innånding og hud",
    notes: "FuA kap. 31: 60 års oppbevaring. Brems-/delerens, tynner og avfetting. Stoffkartotek og avsug.",
  },
];

export const automotivePackage: IndustryPackage = {
  industry: "automotive",
  displayName: "Bilverksted og kjøretøy",
  farmTypes: AUTOMOTIVE_WORKSHOP_TYPES.map(({ value, label }) => ({ value, label })),
  simpleMenuHrefs: [
    "/dashboard/incidents",
    "/dashboard/inspections",
    "/dashboard/sja",
    "/dashboard/chemicals",
    "/dashboard/exposure-register",
    "/dashboard/environment",
    "/dashboard/complaints",
  ],
  risks,
  sjaTemplates,
  inspectionTemplates,
  courseTemplates,
  legalReferences,
  exposureAgents,
};
