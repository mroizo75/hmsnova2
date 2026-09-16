import type { FormTemplateLibraryEntry } from "@/lib/form-template-library";
import type { FieldType } from "@prisma/client";

const STATUS_RADIO = ["OK", "Ikke OK", "Ikke relevant"];

function section(label: string) {
  return { fieldType: "SECTION_HEADER" as FieldType, label, isRequired: false };
}

function radioTri(label: string, helpText?: string | null) {
  return {
    fieldType: "RADIO" as FieldType,
    label,
    helpText: helpText ?? null,
    isRequired: true,
    options: STATUS_RADIO,
  };
}

function textShort(label: string, required = false, placeholder?: string | null) {
  return { fieldType: "TEXT" as FieldType, label, isRequired: required, placeholder: placeholder ?? null };
}

function textLong(label: string, required = false) {
  return { fieldType: "TEXTAREA" as FieldType, label, isRequired: required };
}

function dateField(label: string, required = false) {
  return { fieldType: "DATE" as FieldType, label, isRequired: required };
}

function checklistBlock(heading: string, items: string[]) {
  return [section(heading), ...items.map((item) => radioTri(item))];
}

const AUTOMOTIVE = ["automotive"];
const LAKK = ["automotive", "skade_lakk"];
const ELBIL = ["automotive", "elbil"];

export const AUTOMOTIVE_FORM_TEMPLATES: FormTemplateLibraryEntry[] = [
  {
    title: "Daglig kontroll billøfter før bruk",
    description: "Når: før jobb. Visuell og funksjonell sjekk før første løft. FuA kap. 12. Avvik kan opprettes fra funn.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Dato", true),
      textShort("Løfter / ID", true),
      textShort("Kontrollert av", true),
      ...checklistBlock("Før bruk", [
        "Løfteren er uten synlige sprekker, lekkasje eller skade på armer",
        "Gummiklosser og løftepunkter er i orden",
        "Nødstopp og senkefunksjon virker",
        "Underlaget er plant og fritt for hinder",
        "Sertifikat/kalibrering er ikke utløpt",
      ]),
      textLong("Avvik / tiltak (opprett avvik i modulen ved Ikke OK)"),
    ],
  },
  {
    title: "Kontroll eksosavsug og punktavsug",
    description: "Når: uke. Arbeidsplassforskriften §§ 7-1–7-3.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Dato", true),
      textShort("Kontrollert av", true),
      ...checklistBlock("Eksosavsug", [
        "Slanger er hele og tetter mot eksosrør",
        "Vifte trekker synlig/kjennbart",
        "Avsug brukes ved motor inne",
      ]),
      ...checklistBlock("Punktavsug sveising/kjemikalier", [
        "Arm/hette kan plasseres ved kilden",
        "Filter/anlegg uten alarm",
        "Ingen synlig røykansamling i hallen",
      ]),
      textLong("Kommentarer"),
    ],
  },
  {
    title: "Før prøvekjøring",
    description: "Når: før jobb. Trafikksikkerhet før kundebil tas ut på vei.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Dato", true),
      textShort("Kjøretøy / reg.nr.", true),
      textShort("Sjåfør", true),
      ...checklistBlock("Kjøretøy", [
        "Bremser virker og væskenivå er OK",
        "Hjul er montert og momentet er trukket",
        "Lys, dekk og styring er vurdert trygge",
        "Sjåfør har gyldig førerrett for klassen",
      ]),
      textShort("Rute / formål", false, "Kort testsløyfe"),
      textLong("Merknader"),
    ],
  },
  {
    title: "Elbil: spenningsfrihet / serviceplugg / isolert verktøy",
    description: "Når: før jobb. NBF-praksis. Underkategori elbil. Krysslenke til SJA høyvolt.",
    category: "CHECKLIST",
    industryScope: ELBIL,
    fields: [
      dateField("Dato", true),
      textShort("Kjøretøy / merke", true),
      textShort("Utført av + medhjelper (to-mannsregel)", true),
      ...checklistBlock("Før arbeid på HV", [
        "SJA høyvolt er gjennomført",
        "Produsentanvisning er fulgt",
        "Serviceplugg/frakobling er utført",
        "Spenningsfrihet er målt og dokumentert",
        "Isolert verktøy og PPE er i bruk",
        "Sone er merket og avsperret",
      ]),
      textLong("Måleverdi / merknad"),
    ],
  },
  {
    title: "Kjemikaliesøl",
    description: "Når: i jobb. Opprydding og avfall etter søl.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Tidspunkt", true),
      textShort("Stoff / produkt", true),
      textShort("Sted", true),
      ...checklistBlock("Tiltak", [
        "Område er sperret og personer varslet",
        "Absorbent er brukt etter SDS",
        "PPE er brukt",
        "Avfall er merket som farlig avfall",
        "Avvik er opprettet hvis hendelsen krever det",
      ]),
      textLong("Hva skjedde"),
    ],
  },
  {
    title: "Mottak og levering farlig avfall",
    description: "Når: uke. Kvittering arkiveres. Full leveringslogg er fase 2.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Dato", true),
      textShort("Mottak / transportør", true),
      ...checklistBlock("Levering", [
        "Spillolje, filtre og kjemikalieavfall er merket",
        "Batteri og dekk er med i retur der aktuelt",
        "Kvittering er mottatt og lastet opp i dokumentarkiv",
        "Oljeutskiller er sjekket",
      ]),
      textLong("Mengder / merknad (fritekst)"),
    ],
  },
  {
    title: "PPE lakkering (friskluft og vernetøy)",
    description: "Når: før jobb. Underkategori skade/lakk. FuA § 3-12.",
    category: "CHECKLIST",
    industryScope: LAKK,
    fields: [
      dateField("Dato", true),
      textShort("Operatør", true),
      ...checklistBlock("Før sprøyting", [
        "Gyldig diisocyanat-opplæring",
        "Friskluftsmaske er testet og i bruk",
        "Vernetøy / hansker etter SDS",
        "Sprøyteboks har avsug og forrigling",
        "ATEX-sone er respektert (ingen gnist)",
      ]),
      textLong("Produkt / merknad"),
    ],
  },
  {
    title: "Støy- og vibrasjonskartlegging",
    description: "Når: år. Ja/nei + tiltak. FuA kap. 14. BHT ved overskridelse.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Dato", true),
      textShort("Kartlagt av", true),
      ...checklistBlock("Kartlegging", [
        "Støyende maskiner er identifisert (sliping, slag, dekk, kompressor)",
        "Hørselsvern er påbudt og tilgjengelig der det trengs",
        "Vibrerende håndverktøy er identifisert",
        "Jobbrotasjon / tidsbegrensning er vurdert",
        "BHT-helseundersøkelse er vurdert (tiltaksverdi 85 dB)",
      ]),
      textLong("Tiltak og ansvarlig"),
    ],
  },
  {
    title: "Tilsynsklar mappe – AT og SVV § 16 a–f",
    description: "Når: år. Hold verkstedet godkjent. Arbeidstilsynet + Statens vegvesen.",
    category: "INSPECTION",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Dato", true),
      textShort("Gjennomgått av (teknisk leder)", true),
      ...checklistBlock("§ 16 a Organisering", [
        "Organisasjonskart og roller er oppdatert",
        "Teknisk leder og stedfortreder er navngitt",
      ]),
      ...checklistBlock("§ 16 b Kompetanse", [
        "Fagbrev, kurs, billøfter og førerrett er registrert",
        "Plan for oppfriskning finnes",
      ]),
      ...checklistBlock("§ 16 c Arbeidsprosedyre", [
        "Overordnet reparasjonsprosedyre er aktiv",
        "Samarbeidsavtaler er arkivert",
      ]),
      ...checklistBlock("§ 16 d Kvalitet", [
        "Egenkontroll og stikkprøver er dokumentert",
      ]),
      ...checklistBlock("§ 16 e Kalibrering", [
        "Kalibreringsbevis er gyldige",
      ]),
      ...checklistBlock("§ 16 f Avvik", [
        "Kundeklager og tilsynsfølges i avviksmodulen",
      ]),
      textLong("Neste steg"),
    ],
  },
  {
    title: "Kalibreringsstatus – utstyr og gyldig til",
    description: "Når: uke. Bro til senere utstyrsregister. Utløpt dato = avvik.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Dato", true),
      textShort("Utstyr / type", true, "Billøfter, bremseprøver, momentnøkkel"),
      textShort("Serie-/ID-nummer", true),
      dateField("Sist kalibrert", true),
      dateField("Gyldig til", true),
      radioTri("Kalibreringsbevis er lastet opp i dokumentarkiv"),
      radioTri("Utstyret kan brukes (ikke utløpt)"),
      textLong("Vedlegg / merknad. Opprett avvik hvis utløpt."),
    ],
  },
  {
    title: "Miljøfyrtårn-speil – kjemikalier, substitusjon, avfall, oljeutskiller",
    description: "Når: år. Speiler Miljøfyrtårn bransje Bilverksted / Skade- og lakkverksted. Ikke sertifiseringsintegrasjon.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Dato", true),
      ...checklistBlock("Kjemikalier", [
        "Stoffkartotek er komplett",
        "Substitusjon av farligste stoffer er vurdert",
      ]),
      ...checklistBlock("Avfall", [
        "Farlig avfall leveres til godkjent mottak",
        "Batteri og dekk går i returordning",
      ]),
      ...checklistBlock("Oljeutskiller og utslipp", [
        "Oljeutskiller er i drift og tømmes etter avtale",
        "Ingen kjent utslipp til sluk",
      ]),
      textLong("Forbedringspunkter"),
    ],
  },
  {
    title: "Egenkontroll jobb (mekaniker)",
    description: "Når: i jobb. Verkstedforskriften § 16 d. Før utlevering.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    requiresSignature: true,
    fields: [
      dateField("Dato", true),
      textShort("Arbeidsordre / jobb", true),
      textShort("Mekaniker", true),
      ...checklistBlock("Egenkontroll", [
        "Arbeidet er utført etter produsentanvisning / oppdrag",
        "Moment, væsker og funksjon er kontrollert der det er relevant",
        "Prøvekjøring er vurdert og utført ved behov",
        "Bilen er klar for utlevering",
      ]),
      textLong("Merknad til kunde / teknisk leder"),
    ],
  },
  {
    title: "Stikkprøve teknisk leder",
    description: "Når: uke. Verkstedforskriften § 16 d. Etter mekanikers egenkontroll.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    requiresSignature: true,
    fields: [
      dateField("Dato", true),
      textShort("Jobb / arbeidsordre", true),
      textShort("Teknisk leder", true),
      ...checklistBlock("Stikkprøve", [
        "Egenkontroll er utført",
        "Utført arbeid samsvarer med oppdrag og produsent",
        "Sikkerhetskritisk funksjon er vurdert (bremser, styring, hjul, lys)",
        "Dokumentasjon er tilstrekkelig",
      ]),
      radioTri("Innleid kvalitetskontroll brukt (énmannsverksted)"),
      textLong("Funnet avvik – opprett kvalitetsavvik ved nei"),
    ],
  },
  {
    title: "Kartlegging eksponeringsregister (60 år)",
    description: "Når: år. FuA kap. 31. Dieseleksos, sveiserøyk, mineralolje, diisocyanater, løsemidler.",
    category: "CHECKLIST",
    industryScope: AUTOMOTIVE,
    fields: [
      dateField("Dato", true),
      section("Hvem er eksponert? Opprett poster i eksponeringsregisteret (60 år)."),
      radioTri("Dieseleksos – ansatte som kjører motor inne er kartlagt"),
      radioTri("Sveiserøyk – sveisere er kartlagt"),
      radioTri("Mineralolje på hud – mekanikere er kartlagt"),
      radioTri("Diisocyanater – lakk/lim er kartlagt (hvis aktuelt)"),
      radioTri("Løsemidler – delerens/avfetting er kartlagt"),
      textLong("Navn / stillinger som mangler post i registeret"),
    ],
  },
];
