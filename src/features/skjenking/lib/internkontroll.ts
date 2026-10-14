/**
 * Internkontroll for salg og skjenking.
 * Hjemmel: alkoholloven § 1-9, alkoholforskriften § 8-1 til § 8-3.
 * § 8-3 nr. 1–6 angir hva internkontrollen skal inneholde.
 */

export type Bevillingstype = "SKJENKING" | "SALG" | "BEGGE";

export interface SkjenkeProfil {
  bevillingstype: Bevillingstype;
  harMinibar: boolean;
}

export interface SkjenkeRutineMal {
  nokkel: string;
  tittel: string;
  lovhjemmel: string;
  innhold: string;
  applies: (profil: SkjenkeProfil) => boolean;
}

const skjenk = (profil: SkjenkeProfil) => profil.bevillingstype !== "SALG";
const salg = (profil: SkjenkeProfil) => profil.bevillingstype !== "SKJENKING";
const alltid = () => true;

export const SKJENKE_RUTINE_MALER: SkjenkeRutineMal[] = [
  {
    nokkel: "alderskontroll",
    tittel: "Alderskontroll",
    lovhjemmel: "Alkoholloven § 1-5, alkoholforskriften § 2-4",
    innhold:
      "Ved tvil om alder kreves legitimasjon før alkohol selges eller skjenkes. Gruppe 1 og 2 serveres ikke til gjester under 18 år. Gruppe 3 (fra 22 volumprosent) serveres ikke til gjester under 20 år. Skriftlig fullmakt fra foresatte godtas ikke. Avslag registreres uten gjestens navn, fødselsnummer eller legitimasjonsnummer.",
    applies: alltid,
  },
  {
    nokkel: "personalder",
    tittel: "Alder på den som selger eller skjenker",
    lovhjemmel: "Alkoholforskriften § 2-3",
    innhold:
      "Den som selger eller skjenker gruppe 1 og 2 skal ha fylt 18 år. Den som selger eller skjenker gruppe 3 skal ha fylt 20 år. Lærlinger og elever i kokk-, servitør- eller resepsjonistfag kan selge eller servere under opplæring når det inngår i læreplanen og en ansvarlig voksen følger med. Styrer kontrollerer alder før en ansatt settes til oppgaven.",
    applies: alltid,
  },
  {
    nokkel: "skjenketid",
    tittel: "Skjenketider",
    lovhjemmel: "Alkoholloven § 4-4",
    innhold:
      "Skjenking skjer bare innenfor tidene i bevillingen. Gruppe 3 kan ikke skjenkes mellom kl. 03:00 og 13:00. Annen alkoholholdig drikk kan ikke skjenkes mellom kl. 03:00 og 06:00. Konsum av utskjenket alkohol opphører senest 30 minutter etter skjenketidens utløp. Ansvarlig gjennomgår kveldens tider ved vaktskifte.",
    applies: skjenk,
  },
  {
    nokkel: "beruselse",
    tittel: "Beruselse, adgang og skjenkestopp",
    lovhjemmel: "Alkoholforskriften § 4-1 og § 4-2",
    innhold:
      "Åpenbart påvirkede får ikke adgang. Er en slik gjest allerede inne, sørger ansvarlig for at vedkommende forlater stedet og får nødvendig bistand. Det skjenkes ikke til åpenbart påvirkede, og ikke slik at gjesten må antas å bli det. Sitter flere sammen og én er åpenbart påvirket, stoppes skjenking til hele følget til den påvirkede er fjernet. Tegn: ustøhet, utydelig tale, søvnighet, aggressivitet og manglende orientering.",
    applies: skjenk,
  },
  {
    nokkel: "andres_alkohol",
    tittel: "Mindreårige og andres alkohol",
    lovhjemmel: "Alkoholforskriften § 4-3",
    innhold:
      "Gjest under aldersgrensen skal ikke drikke alkohol som er skjenket andre. Ved mistanke stoppes servering til bordet, og alkoholen fjernes fra den mindreårige.",
    applies: skjenk,
  },
  {
    nokkel: "ikke_medta",
    tittel: "Medbrakt og uttak av alkohol",
    lovhjemmel: "Alkoholforskriften § 4-4",
    innhold:
      "Gjestene skal bare nyte alkohol som er skjenket her. Medbrakt alkohol avvises. Skjenket alkohol tas ikke med ut av skjenkestedet.",
    applies: skjenk,
  },
  {
    nokkel: "mengde",
    tittel: "Skjenkemål for brennevin",
    lovhjemmel: "Alkoholforskriften § 4-5",
    innhold:
      "Brennevin skjenkes bare i 2 og 4 cl. Unntaket er cocktails. Mål og glass kontrolleres ved vaktstart.",
    applies: skjenk,
  },
  {
    nokkel: "alkoholfritt",
    tittel: "Alkoholfrie og alkoholsvake alternativer",
    lovhjemmel: "Alkoholforskriften § 4-6",
    innhold:
      "Vi fører et rimelig utvalg alkoholfrie og alkoholsvake drikker som naturlig erstatning for alkohol. De står på skjenkekart og prisliste. Sortimentet gjennomgås ved menyendring.",
    applies: skjenk,
  },
  {
    nokkel: "halvflasker",
    tittel: "Halvflasker",
    lovhjemmel: "Alkoholforskriften § 4-7",
    innhold:
      "Når halvflasker er i handelen, fører skjenkestedet et rimelig utvalg. Ansvarlig sjekker dette ved innkjøp og menyendring.",
    applies: skjenk,
  },
  {
    nokkel: "minibar",
    tittel: "Selvbetjening på hotellrom",
    lovhjemmel: "Alkoholforskriften § 4-8",
    innhold:
      "Alkohol på hotellrom holdes utilgjengelig for mindreårige. Ved innsjekk kontrolleres at gjesten fyller alderskravet før minibaren åpnes eller nøkkelen utleveres.",
    applies: (profil) => skjenk(profil) && profil.harMinibar,
  },
  {
    nokkel: "salg_pavirket",
    tittel: "Salg til påvirkede",
    lovhjemmel: "Alkoholforskriften § 3-1",
    innhold:
      "Alkoholholdig drikk selges eller utleveres ikke til personer som er åpenbart påvirket av rusmidler.",
    applies: salg,
  },
  {
    nokkel: "salg_plassering",
    tittel: "Plassering i salgslokalet",
    lovhjemmel: "Alkoholforskriften § 3-3",
    innhold:
      "Alkoholholdig drikk plasseres slik at den ikke kan forveksles med alkoholfri eller alkoholsvak drikk.",
    applies: salg,
  },
  {
    nokkel: "avvik",
    tittel: "Avvik: avdekke, rette opp og forebygge",
    lovhjemmel: "Alkoholforskriften § 8-3 nr. 5",
    innhold:
      "Brudd og tilløp registreres samme vakt, uten gjestens identitet. Avviket beskrives, rettes og lukkes. Gjentakelse følges med opplæring eller endret rutine. Åpne avvik tas med i gjennomgangen av internkontrollen.",
    applies: alltid,
  },
  {
    nokkel: "reklame",
    tittel: "Forbud mot alkoholreklame",
    lovhjemmel: "Alkoholloven kapittel 9",
    innhold:
      "Virksomheten reklamerer ikke for alkoholholdig drikk. Menyer, skjermer og andre flater sjekkes slik at de ikke er alkoholreklame.",
    applies: alltid,
  },
  {
    nokkel: "omsetning",
    tittel: "Omsetningsoppgave og bevillingsgebyr",
    lovhjemmel: "Alkoholforskriften § 6-3",
    innhold:
      "Oppgave over forventet og faktisk omsatt mengde alkohol sendes kommunen innen fristen. Dato for siste innsending føres i internkontrollen.",
    applies: alltid,
  },
];

export const SKJENKE_KRAV: Array<{ id: string; ref: string; text: string }> = [
  { id: "formål", ref: "Alkoholforskriften § 2-1", text: "Salg og skjenking skal begrense skadevirkningene og ivareta alkoholpolitiske hensyn." },
  { id: "ansvar", ref: "Alkoholforskriften § 2-2", text: "Bevillingshaver og styrer fører tilsyn med de ansatte og gjør regelverket kjent. Stedfortreder trer inn ved styrers fravær." },
  { id: "alder-ansatt", ref: "Alkoholforskriften § 2-3", text: "Den som selger eller skjenker gruppe 1 og 2 må ha fylt 18 år, gruppe 3 må ha fylt 20 år." },
  { id: "alder-gjest", ref: "Alkoholloven § 1-5 og alkoholforskriften § 2-4", text: "Ikke salg eller skjenking til personer under 18 år (gruppe 1 og 2) eller under 20 år (gruppe 3). Legitimasjon ved tvil." },
  { id: "kunnskap", ref: "Alkoholloven § 1-7c og alkoholforskriften § 5-1", text: "Styrer og stedfortreder må ha bestått kunnskapsprøve. Ansatte som selger eller skjenker skal ha nødvendig kunnskap." },
  { id: "skjenketid", ref: "Alkoholloven § 4-4", text: "Skjenking bare innenfor tidene og vilkårene i bevillingen." },
  { id: "adgang", ref: "Alkoholforskriften § 4-1", text: "Åpenbart påvirkede nektes adgang, bortvises og får nødvendig bistand." },
  { id: "skjenkestopp", ref: "Alkoholforskriften § 4-2", text: "Ikke skjenking til åpenbart påvirkede, eller slik at gjesten må antas å bli det. Hele følget stoppes til den påvirkede er fjernet." },
  { id: "andres", ref: "Alkoholforskriften § 4-3", text: "Mindreårige skal ikke drikke alkohol som er skjenket andre gjester." },
  { id: "medta", ref: "Alkoholforskriften § 4-4", text: "Gjestene nyter bare skjenket alkohol, og tar den ikke med ut." },
  { id: "maal", ref: "Alkoholforskriften § 4-5", text: "Brennevin skjenkes i 2 og 4 cl, unntatt cocktails." },
  { id: "uten-alkohol", ref: "Alkoholforskriften § 4-6", text: "Rimelig utvalg av alkoholfrie eller alkoholsvake drikker, oppført på skjenkekart og prisliste." },
  { id: "halv", ref: "Alkoholforskriften § 4-7", text: "Rimelig utvalg av halvflasker når slike er i handelen." },
  { id: "minibar", ref: "Alkoholforskriften § 4-8", text: "Selvbetjening på hotellrom skal ikke være tilgjengelig for mindreårige." },
  { id: "salg", ref: "Alkoholforskriften § 3-1 og § 3-3", text: "Ved salgsbevilling: ikke salg til åpenbart påvirkede, og plassering som ikke kan forveksles med alkoholfri drikk." },
  { id: "reklame", ref: "Alkoholloven kapittel 9", text: "Forbud mot reklame for alkoholholdig drikk." },
  { id: "gebyr", ref: "Alkoholforskriften § 6-3", text: "Oppgave over omsatt mengde alkohol og bevillingsgebyr." },
  { id: "internkontroll", ref: "Alkoholforskriften § 8-1 til § 8-3", text: "Dokumentert internkontroll, tilpasset virksomheten, oppdatert og tilgjengelig for kontrollmyndigheten. Ambulerende skjenkebevilling er unntatt." },
];

export const HENDELSE_TYPE = {
  ALDERSKONTROLL: "Alderskontroll",
  BERUSELSE: "Beruselse",
  BORTVISNING: "Bortvisning",
  AVVIK: "Avvik",
  ANNET: "Annet",
} as const;

export const HENDELSE_ACTION = {
  AVSLATT: "Avslått servering",
  SERVERING_STOPPET: "Servering stoppet",
  BORTVIST: "Bortvist",
  ADVARSEL: "Advarsel",
  ANNET: "Annet",
} as const;

export const BERUSELSE = {
  NORMAL: "Normal",
  PA_VEI: "På vei mot åpenbart påvirket",
  APENBART_PAVIRKET: "Åpenbart påvirket",
} as const;

export const HENDELSE_STATUS = {
  APEN: "Åpen",
  LUKKET: "Lukket",
} as const;

const FNR = /\b\d{11}\b/;

export function containsGuestIdentity(value: string): boolean {
  return FNR.test(value);
}

export function skjenkeProfil(
  bevilling: { bevillingstype?: string | null; harMinibar?: boolean | null } | null,
): SkjenkeProfil {
  const type = bevilling?.bevillingstype;
  const bevillingstype: Bevillingstype = type === "SALG" || type === "BEGGE" ? type : "SKJENKING";
  return { bevillingstype, harMinibar: Boolean(bevilling?.harMinibar) };
}

export function aktuelleRutiner(profil: SkjenkeProfil): SkjenkeRutineMal[] {
  return SKJENKE_RUTINE_MALER.filter((mal) => mal.applies(profil));
}

export interface SkjenkingBevillingInput {
  bevillingstype: string;
  ambulerende: boolean;
  bevillingsnummer: string | null;
  kommune: string | null;
  gyldigFra: string | Date | null;
  gyldigTil: string | Date | null;
  gruppe1: boolean;
  gruppe2: boolean;
  gruppe3: boolean;
  styrer: string | null;
  stedfortreder: string | null;
  styrerProveDato: string | Date | null;
  stedfortrederProveDato: string | Date | null;
  skjenketider: string | null;
  internregler: string | null;
  alderskontrollAnsvar: string | null;
  beruselseAnsvar: string | null;
  bortvisningAnsvar: string | null;
  opplaeringAnsvar: string | null;
  alkoholfrittUtvalg: string | null;
  harHalvflasker: boolean;
  harMinibar: boolean;
  sarvilkar: string | null;
  sistOmsetningsoppgave: string | Date | null;
  sistGjennomgatt: string | Date | null;
  nesteGjennomgang: string | Date | null;
}

export interface SkjenkingCheck {
  id: string;
  section: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  legalRef: string;
  ok: boolean;
  detail: string;
}

export interface SkjenkingCoverage {
  exempt: boolean;
  complete: boolean;
  sections: Array<{
    nr: 1 | 2 | 3 | 4 | 5 | 6;
    title: string;
    legalRef: string;
    ok: boolean;
    checks: SkjenkingCheck[];
  }>;
}

export interface SkjenkingCoverageInput {
  bevilling: SkjenkingBevillingInput | null;
  rutiner: Array<{ nokkel: string; innhold: string; aktiv: boolean }>;
  apneHendelser: number;
  gjennomganger: Array<{ gjennomfortAt: string | Date }>;
  opplaering: { total: number; fullfort: number };
  now?: Date;
}

const SECTION_META: Record<1 | 2 | 3 | 4 | 5 | 6, { title: string; legalRef: string }> = {
  1: { title: "Oversikt over krav", legalRef: "Alkoholforskriften § 8-3 nr. 1" },
  2: { title: "Kunnskap og kompetanse", legalRef: "Alkoholforskriften § 8-3 nr. 2" },
  3: { title: "Organisering og myndighet", legalRef: "Alkoholforskriften § 8-3 nr. 3" },
  4: { title: "Rutiner som sikrer etterlevelse", legalRef: "Alkoholforskriften § 8-3 nr. 4" },
  5: { title: "Avdekke, rette opp og forebygge", legalRef: "Alkoholforskriften § 8-3 nr. 5" },
  6: { title: "Systematisk gjennomgang", legalRef: "Alkoholforskriften § 8-3 nr. 6" },
};

function filled(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length >= 2);
}

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthsBefore(now: Date, months: number): Date {
  const copy = new Date(now.getTime());
  copy.setMonth(copy.getMonth() - months);
  return copy;
}

function check(
  section: 1 | 2 | 3 | 4 | 5 | 6,
  id: string,
  title: string,
  legalRef: string,
  ok: boolean,
  detail: string,
): SkjenkingCheck {
  return { section, id, title, legalRef, ok, detail };
}

export function evaluateSkjenkingInternkontroll(input: SkjenkingCoverageInput): SkjenkingCoverage {
  const now = input.now ?? new Date();
  if (input.bevilling?.ambulerende) {
    const checks = [
      check(
        1,
        "unntak",
        "Ambulerende bevilling",
        "Alkoholforskriften § 8-1 andre ledd",
        true,
        "Ambulerende skjenkebevilling er unntatt fra plikten til internkontroll.",
      ),
    ];
    return {
      exempt: true,
      complete: true,
      sections: [
        { nr: 1, ...SECTION_META[1], ok: true, checks },
      ],
    };
  }

  const bevilling = input.bevilling;
  const profil = skjenkeProfil(bevilling);
  const skjenker = profil.bevillingstype !== "SALG";
  const gyldigFra = asDate(bevilling?.gyldigFra);
  const gyldigTil = asDate(bevilling?.gyldigTil);
  const omsetning = asDate(bevilling?.sistOmsetningsoppgave);
  const ettAarSiden = monthsBefore(now, 12);
  const omsetningPaakrevd = Boolean(gyldigFra && gyldigFra <= ettAarSiden);
  const grupper = Boolean(bevilling && (bevilling.gruppe1 || bevilling.gruppe2 || bevilling.gruppe3));

  const checks: SkjenkingCheck[] = [
    check(1, "bevilling", "Bevillingen er identifisert", "Alkoholloven § 1-9", filled(bevilling?.bevillingsnummer) && filled(bevilling?.kommune), filled(bevilling?.bevillingsnummer) && filled(bevilling?.kommune) ? "Bevillingsnummer og kommune er ført." : "Før bevillingsnummer og kommune."),
    check(1, "gyldighet", "Bevillingen er gyldig", "Alkoholloven § 1-6", Boolean(gyldigFra && gyldigTil && gyldigFra <= now && gyldigTil >= now), !gyldigFra || !gyldigTil ? "Før gyldig fra og gyldig til." : gyldigTil < now ? "Bevillingen er utløpt." : gyldigFra > now ? "Bevillingen har ikke startet." : "Bevillingen gjelder nå."),
    check(1, "grupper", "Hvilke drikkekategorier bevillingen omfatter", "Alkoholforskriften § 1-1", grupper, grupper ? "Minst én gruppe er valgt." : "Velg gruppe 1, 2 og/eller 3."),
    check(1, "tider", skjenker ? "Skjenketider og vilkår" : "Salgsvilkår", "Alkoholloven § 4-4", filled(bevilling?.skjenketider), filled(bevilling?.skjenketider) ? "Tider og vilkår er beskrevet." : "Beskriv tidene og vilkårene i bevillingen."),
    check(
      1,
      "omsetning",
      "Omsetningsoppgave siste år",
      "Alkoholforskriften § 6-3",
      Boolean(gyldigFra) && (!omsetningPaakrevd || Boolean(omsetning && omsetning >= ettAarSiden)),
      !gyldigFra
        ? "Før gyldig fra, så fristen for omsetningsoppgaven kan vurderes."
        : !omsetningPaakrevd
          ? "Første bevillingsår: oppgaven føres når den er sendt."
          : omsetning && omsetning >= ettAarSiden
            ? "Oppgave er registrert siste 12 måneder."
            : "Registrer dato for siste innsendte omsetningsoppgave.",
    ),
    check(2, "prove-styrer", "Kunnskapsprøve for styrer", "Alkoholforskriften § 5-1", Boolean(asDate(bevilling?.styrerProveDato)), asDate(bevilling?.styrerProveDato) ? "Bestått prøve er datert." : "Før dato for styrers kunnskapsprøve."),
    check(2, "prove-stedfortreder", "Kunnskapsprøve for stedfortreder", "Alkoholforskriften § 5-1", Boolean(asDate(bevilling?.stedfortrederProveDato)), asDate(bevilling?.stedfortrederProveDato) ? "Bestått prøve er datert." : "Før dato for stedfortreders kunnskapsprøve."),
    check(
      2,
      "ansatte",
      "Opplæring av ansatte som selger eller skjenker",
      "Alkoholloven § 1-7c, alkoholforskriften § 8-3 nr. 2",
      input.opplaering.total > 0 && input.opplaering.fullfort === input.opplaering.total,
      input.opplaering.total === 0 ? "Ingen ansatte er registrert." : `${input.opplaering.fullfort} av ${input.opplaering.total} har gyldig kurs.`,
    ),
    check(3, "styrer", "Styrer er navngitt", "Alkoholforskriften § 2-2", filled(bevilling?.styrer), filled(bevilling?.styrer) ? bevilling?.styrer ?? "" : "Oppgi styrer."),
    check(3, "stedfortreder", "Stedfortreder er navngitt", "Alkoholforskriften § 2-2", filled(bevilling?.stedfortreder), filled(bevilling?.stedfortreder) ? bevilling?.stedfortreder ?? "" : "Oppgi stedfortreder."),
    check(3, "ansvar-alder", "Ansvar for alderskontroll", "Alkoholforskriften § 8-3 nr. 3", filled(bevilling?.alderskontrollAnsvar), filled(bevilling?.alderskontrollAnsvar) ? "Ansvaret er fordelt." : "Oppgi hvem som har myndighet til å kreve legitimasjon og avslå."),
    check(3, "ansvar-beruselse", "Ansvar for beruselse og bortvisning", "Alkoholforskriften § 4-1", filled(bevilling?.beruselseAnsvar) && filled(bevilling?.bortvisningAnsvar), filled(bevilling?.beruselseAnsvar) && filled(bevilling?.bortvisningAnsvar) ? "Ansvaret er fordelt." : "Oppgi hvem som stopper skjenking og hvem som bortviser."),
    check(3, "ansvar-opplaering", "Ansvar for opplæring", "Alkoholforskriften § 2-2", filled(bevilling?.opplaeringAnsvar), filled(bevilling?.opplaeringAnsvar) ? "Ansvaret er fordelt." : "Oppgi hvem som sørger for opplæring av de ansatte."),
  ];

  if (skjenker) {
    checks.push(
      check(
        4,
        "alkoholfritt-utvalg",
        "Utvalg av alkoholfrie alternativer",
        "Alkoholforskriften § 4-6",
        filled(bevilling?.alkoholfrittUtvalg),
        filled(bevilling?.alkoholfrittUtvalg) ? "Utvalget er beskrevet." : "Beskriv de alkoholfrie og alkoholsvake drikkene på skjenkekartet.",
      ),
    );
  }

  for (const mal of aktuelleRutiner(profil).filter((mal) => mal.nokkel !== "avvik")) {
    const rutine = input.rutiner.find((row) => row.nokkel === mal.nokkel);
    const ok = Boolean(rutine?.aktiv && rutine.innhold.trim().length >= 40);
    checks.push(
      check(
        4,
        `rutine-${mal.nokkel}`,
        mal.tittel,
        mal.lovhjemmel,
        ok,
        ok ? "Rutinen er dokumentert." : "Rutinen må være aktiv og utfylt.",
      ),
    );
  }

  const avvikRutine = input.rutiner.find((row) => row.nokkel === "avvik");
  const avvikOk = Boolean(avvikRutine?.aktiv && avvikRutine.innhold.trim().length >= 40);
  checks.push(
    check(
      5,
      "avvik-rutine",
      "Rutine for avvik",
      "Alkoholforskriften § 8-3 nr. 5",
      avvikOk,
      avvikOk ? "Rutinen beskriver hvordan brudd avdekkes, rettes og forebygges." : "Rutinen må være aktiv og utfylt.",
    ),
  );
  checks.push(
    check(
      5,
      "apne-avvik",
      "Åpne avvik er rettet",
      "Alkoholforskriften § 8-3 nr. 5",
      input.apneHendelser === 0,
      input.apneHendelser === 0 ? "Ingen åpne hendelser." : `${input.apneHendelser} hendelse${input.apneHendelser === 1 ? "" : "r"} er ikke lukket.`,
    ),
  );

  const siste = input.gjennomganger
    .map((row) => asDate(row.gjennomfortAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const neste = asDate(bevilling?.nesteGjennomgang);
  checks.push(
    check(
      6,
      "gjennomfort",
      "Gjennomgang siste 12 måneder",
      "Alkoholforskriften § 8-3 nr. 6",
      Boolean(siste && siste >= ettAarSiden),
      siste && siste >= ettAarSiden ? "Internkontrollen er gjennomgått." : "Gjennomfør og dokumenter en gjennomgang.",
    ),
  );
  checks.push(
    check(
      6,
      "neste",
      "Neste gjennomgang er planlagt",
      "Alkoholforskriften § 8-3 nr. 6",
      Boolean(neste && neste >= now),
      neste && neste >= now ? "Neste gjennomgang er satt." : "Sett dato for neste gjennomgang.",
    ),
  );

  const sections = ([1, 2, 3, 4, 5, 6] as const).map((nr) => {
    const sectionChecks = checks.filter((row) => row.section === nr);
    return {
      nr,
      ...SECTION_META[nr],
      ok: sectionChecks.every((row) => row.ok),
      checks: sectionChecks,
    };
  });

  return {
    exempt: false,
    complete: sections.every((section) => section.ok),
    sections,
  };
}
