export interface RoutineTemplateLibraryEntry {
  title: string;
  description: string;
  category: string;
  legalReference: string;
  industryScope: string[];
  reviewIntervalMonths: number;
  content: {
    formaal: string;
    omfang: string;
    ansvar: string[];
    gjennomforing: string[];
    dokumentasjon: string[];
    avvikOppfolging: string[];
    revisjon: string;
    kilder: string[];
  };
}

const GENERAL_LEGAL_BASE = [
  "AML § 2-3",
  "AML § 3-1",
  "IK-HMS § 5",
];

function createContent(params: {
  formaal: string;
  omfang: string;
  ansvar: string[];
  gjennomforing: string[];
  dokumentasjon: string[];
  avvikOppfolging: string[];
  revisjon: string;
  kilder: string[];
}): RoutineTemplateLibraryEntry["content"] {
  return {
    formaal: params.formaal,
    omfang: params.omfang,
    ansvar: params.ansvar,
    gjennomforing: params.gjennomforing,
    dokumentasjon: params.dokumentasjon,
    avvikOppfolging: params.avvikOppfolging,
    revisjon: params.revisjon,
    kilder: params.kilder,
  };
}

const commonTemplates: RoutineTemplateLibraryEntry[] = [
  {
    title: "Avviksbehandling og korrigerende tiltak",
    description:
      "Rutine for registrering, vurdering, korrigering og verifisering av avvik i virksomheten.",
    category: "AVVIK",
    legalReference: "IK-HMS § 5, AML § 3-1, ISO 9001:2015 kap. 10.2",
    industryScope: ["all"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre systematisk behandling av avvik og forebygge gjentakelser.",
      omfang: "Gjelder alle ansatte, ledere og innleid personell i virksomheten.",
      ansvar: [
        "Ansatt: melde avvik så raskt som mulig.",
        "Leder/HMS: klassifisere, iverksette og følge opp tiltak.",
        "Admin: sikre dokumentasjon og sporbarhet.",
      ],
      gjennomforing: [
        "Registrer avvik med tid, sted, beskrivelse og konsekvens.",
        "Vurder alvorlighetsgrad og behov for strakstiltak.",
        "Tildel ansvarlig med frist for korrigerende tiltak.",
        "Verifiser effekt av tiltak og lukk avvik.",
      ],
      dokumentasjon: [
        "Avviksnummer, status, ansvarlig, frister.",
        "Årsaksanalyse (minst 5 hvorfor ved alvorlige avvik).",
        "Bevis for gjennomfort tiltak.",
      ],
      avvikOppfolging: [
        "Over forfallsdato varsles leder/HMS automatisk.",
        "Avvik uten tiltak i tide eskaleres til ADMIN/HMS.",
      ],
      revisjon: "Revideres årlig eller ved vesentlige prosessendringer.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127",
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },
  {
    title: "Varsling av kritikkverdige forhold",
    description:
      "Rutine for intern varsling, behandling, konfidensialitet og vern mot gjengjeldelse.",
    category: "VARSLING",
    legalReference: "AML kap. 2 A, særlig § 2 A-1 til § 2 A-6",
    industryScope: ["all"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Legge til rette for trygg varsling og forsvarlig saksbehandling.",
      omfang: "Gjelder alle ansatte, innleide og tidligere ansatte som varsler.",
      ansvar: [
        "Varslingsmottak: registrere og bekrefte mottak.",
        "Leder/HMS: undersøke saken og gjennomføre tiltak.",
        "Arbeidsgiver: forhindre gjengjeldelse.",
      ],
      gjennomforing: [
        "Motta varsel via definert kanal (anonym og åpen).",
        "Bekreft mottak innen fastsatt intern frist.",
        "Undersøk forholdet med nødvendig kontradiksjon.",
        "Dokumenter vurdering, beslutning og oppfølging.",
      ],
      dokumentasjon: [
        "Tidspunkt, kategori og behandlingsstatus.",
        "Tiltak og beslutningsgrunnlag.",
        "Sikring av taushetsplikt og tilgangsstyring.",
      ],
      avvikOppfolging: [
        "Saker uten fremdrift følges opp med ledervarsel.",
        "Vurder behov for ekstern varsling til myndighet.",
      ],
      revisjon: "Revideres årlig og ved endring i varslingsregelverket.",
      kilder: [
        "https://www.arbeidstilsynet.no/tema/varsling/",
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },
  {
    title: "Årlig HMS-gjennomgang og handlingsplan",
    description:
      "Rutine for årlig evaluering av HMS-arbeid, måloppnåelse og nye tiltak.",
    category: "HMS_STYRING",
    legalReference: "AML § 3-1, IK-HMS § 5, ISO 45001 kap. 10.2",
    industryScope: ["all"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre kontinuerlig forbedring i HMS-styringssystemet.",
      omfang: "Gjelder ledelse, HMS-ansvarlig, verneombud og relevante funksjoner.",
      ansvar: [
        "Leder: gjennomføre årlig HMS-gjennomgang.",
        "HMS: sammenstille data og forslag til tiltak.",
        "Verneombud: medvirke i vurdering av risiko og tiltak.",
      ],
      gjennomforing: [
        "Oppsummer avvik, hendelser, sykefravær og risikobilde.",
        "Evaluer måloppnåelse og tidligere tiltak.",
        "Definer nye HMS-mål, ansvar og frister.",
        "Publiser handlingsplan og varsle ansvarlige.",
      ],
      dokumentasjon: [
        "Moteprotokoll og beslutninger.",
        "Oppdatert handlingsplan med ansvar/frister.",
        "Statusrapport på forrige periodes tiltak.",
      ],
      avvikOppfolging: [
        "Mangler i gjennomføring registreres som styringsavvik.",
        "Forsinkede tiltak eskaleres til leder.",
      ],
      revisjon: "Revideres i forbindelse med årlig ledelsesgjennomgang.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127",
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },
  {
    title: "Elektrisk sikkerhet, anlegg og elektrisk arbeidsutstyr",
    description:
      "Internkontroll på lavspenningsanlegg, bruk av skjøteledninger og elektrisk arbeidsutstyr – ofte tema ved tilsyn i helse, handel, kontor, produksjon og andre bransjer.",
    category: "EL_SIKKERHET",
    legalReference:
      "Forskrift om elektriske lavspenningsanlegg m.m. (sentrale krav), AML § 3-1, AML § 3-2, IK-HMS § 5",
    industryScope: ["all"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal:
        "Forebygge elektriske personskader og brann knyttet til elektriske installasjoner og utstyr i virksomheten.",
      omfang:
        "Gjelder faste og midlertidige anlegg, stikkontakter, skjøteledninger, maskiner og håndverktøy med tilkobling til nett.",
      ansvar: [
        "Arbeidsgiver: sikre forsvarlige anlegg, risikovurdering og dokumentasjon der loven krever det.",
        "Ansatte: melde feil og skader på utstyr; følge opplæring og stans ved åpenbar fare.",
        "Kvalifisert personell: utføre arbeid som er definert som elektrisk arbeid etter gjeldende forskrifter.",
      ],
      gjennomforing: [
        "Kartlegg elektriske farer (skadde støpsler, feil bruk av skjøting, fukt, midlertidige forsyninger, overbelastning).",
        "Sørg for at merking, adkomst og dokumentasjon på anlegg følges der det er påkrevd.",
        "Planlegg og gjennomfør kontroll og ettersyn i tråd med risiko og bransjestandard.",
        "Sikre at personell som skal utføre lovregulert el-arbeid, har nødvendig kompetanse og autorisasjon.",
      ],
      dokumentasjon: [
        "Kontroller, avvik, utbedringer og ansvarlig.",
        "Referanser til kjente feil på utstyr og oppfølgende tiltak.",
      ],
      avvikOppfolging: [
        "Farlige forhold stanses eller sperres inntil utbedret.",
        "Gjentatte avvik på samme sted utløser ny risikovurdering og eventuelt ekstern bistand.",
      ],
      revisjon: "Revideres årlig eller ved endring i lokaler, maskinpark, midlertidige anlegg eller regelverk.",
      kilder: [
        "https://www.arbeidstilsynet.no/tema/elektrisk-arbeid/",
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },
];

const industrySpecificTemplates: RoutineTemplateLibraryEntry[] = [
  {
    title: "Sikker jobb analyse (SJA) for risikofylt arbeid",
    description:
      "Bransjetilpasset rutine for planlegging og gjennomføring av SJA i bygg- og anleggsarbeid.",
    category: "BYGG_ANLEGG",
    legalReference: "AML § 3-2, Byggherreforskriften, IK-HMS § 5",
    industryScope: ["construction"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal: "Forebygge ulykker ved risikofylte arbeidsoperasjoner.",
      omfang: "Gjelder arbeid i høyden, løfteoperasjoner, gravearbeid og varme arbeider.",
      ansvar: [
        "Bas/formann: initiere SJA før oppstart.",
        "Arbeidende lag: delta aktivt i risikovurdering.",
        "Prosjektleder/HMS: verifisere at tiltak er implementert.",
      ],
      gjennomforing: [
        "Beskriv oppgave, arbeidssted og involvert utstyr.",
        "Identifiser farer, konsekvens og sannsynlighet.",
        "Definer barrierer/PPE og ansvar per tiltak.",
        "Godkjenn SJA før arbeid igangsettes.",
      ],
      dokumentasjon: [
        "Signert SJA med dato og deltakere.",
        "Planlagte og gjennomforte sikringstiltak.",
      ],
      avvikOppfolging: [
        "Arbeid stanses ved manglende kritiske barrierer.",
        "Avvik registreres i systemet og lukkes før restart.",
      ],
      revisjon: "Revideres halvårlig eller ved endret risikobilde.",
      kilder: [
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
        "https://lovdata.no/dokument/SF/forskrift/2009-08-03-1028",
      ],
    }),
  },
  {
    title: "Pasientsikker hendelseshåndtering",
    description:
      "Rutine for registrering, vurdering og oppfølging av uønskede pasientrelaterte hendelser.",
    category: "HELSE",
    legalReference: "AML § 3-1, IK-HMS § 5, Helsepersonelloven § 16",
    industryScope: ["healthcare"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal: "Sikre læring og forebygging av pasientskade.",
      omfang: "Gjelder alle ansatte i pasient- og brukerrettet tjeneste.",
      ansvar: [
        "Ansatt: melde hendelse umiddelbart.",
        "Leder/HMS: risikovurdere og iverksette tiltak.",
        "Fagansvarlig: sikre læring i team.",
      ],
      gjennomforing: [
        "Registrer hendelsen med pasientkontekst og tiltak utført.",
        "Klassifiser alvorlighet og behov for strakstiltak.",
        "Gjennomfør årsaksanalyse og forbedringstiltak.",
        "Informer berorte roller etter intern prosedyre.",
      ],
      dokumentasjon: [
        "Hendelseslogg og behandlingsstatus.",
        "Tiltak, ansvar og verifikasjon av effekt.",
      ],
      avvikOppfolging: [
        "Alvorlige hendelser prioriteres med ledereskalering.",
        "Lukking krever verifisert effekt av tiltak.",
      ],
      revisjon: "Revideres halvårlig og ved alvorlig hendelse.",
      kilder: [
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },
  {
    title: "Trafikksikkerhet og kjøre-/hviletid",
    description:
      "Rutine for sikker kjøring, planlegging og oppfølging av arbeidstid i transportoppdrag.",
    category: "TRANSPORT",
    legalReference: "AML kap. 10, IK-HMS § 5",
    industryScope: ["transport"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal: "Redusere risiko for trafikkulykker og brudd på arbeidstidsregler.",
      omfang: "Gjelder sjåfører, transportledere og operativ planlegging.",
      ansvar: [
        "Sjåfør: følge kjøre-/hviletid og melde avvik.",
        "Transportleder: planlegge forsvarlige ruter og pauser.",
        "HMS/leder: følge opp hendelser og trender.",
      ],
      gjennomforing: [
        "Gjennomfør daglig kjøretøykontroll før oppdrag.",
        "Planlegg rute med pauser og hvile i tråd med regelverk.",
        "Registrer avvik/nestenulykker med hendelsesdetaljer.",
        "Følg opp med tiltak ved gjentatte brudd eller hendelser.",
      ],
      dokumentasjon: [
        "Kontrollskjema før avreise.",
        "Kjøre-/hviletidsoversikt og avvikslogg.",
      ],
      avvikOppfolging: [
        "Brudd på hviletid eskaleres til leder samme dag.",
        "Gjennomfør korrigerende plan ved gjentagelse.",
      ],
      revisjon: "Revideres halvårlig eller ved endring i transportmønster.",
      kilder: [
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },
  {
    title: "Maskinsikkerhet og LOTO",
    description:
      "Rutine for lockout/tagout, vedlikehold og sikker oppstart av maskiner i produksjon.",
    category: "INDUSTRI",
    legalReference: "AML § 3-2, Forskrift om utførelse av arbeid",
    industryScope: ["manufacturing"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal: "Forebygge klemskader, strømulykker og utilsiktet oppstart.",
      omfang: "Gjelder produksjonslinjer, vedlikehold og teknisk personell.",
      ansvar: [
        "Operatør: rapportere feil og stoppe ved usikre forhold.",
        "Vedlikehold: gjennomføre LOTO før arbeid.",
        "Leder/HMS: kontrollere etterlevelse og opplæring.",
      ],
      gjennomforing: [
        "Isoler energi og lås av utstyr før inngrep.",
        "Verifiser null-energi før arbeid starter.",
        "Utfør arbeid i tråd med godkjent instruks.",
        "Gjenopprett drift med sikker oppstartssjekk.",
      ],
      dokumentasjon: [
        "LOTO-protokoll og utførte kontroller.",
        "Vedlikeholdslogg og avvikshistorikk.",
      ],
      avvikOppfolging: [
        "Brudd på LOTO klassifiseres som kritisk avvik.",
        "Krev umiddelbar korrigerende handling og verifisering.",
      ],
      revisjon: "Revideres halvårlig og etter alvorlige hendelser.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/2011-12-06-1357",
      ],
    }),
  },
  {
    title: "Kundekontakt, vold/trusler og alenearbeid",
    description:
      "Rutine for håndtering av risiko ved kundekontakt, konflikt og alenearbeid i butikk/service.",
    category: "HANDEL_SERVICE",
    legalReference: "AML § 4-3, AML § 3-1, IK-HMS § 5",
    industryScope: ["retail"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forebygge vold, trusler og psykososial belastning.",
      omfang: "Gjelder ansatte i kundemottak, salg og servicefunksjoner.",
      ansvar: [
        "Ansatt: følge rutine ved truende situasjoner.",
        "Leder: sikre bemanning og ettervern.",
        "HMS: følge opp avvik, opplæring og læring.",
      ],
      gjennomforing: [
        "Gjennomfør risikovurdering av utsatte tidspunkter/områder.",
        "Sikre alarm-/tilkallingsrutiner ved alenearbeid.",
        "Registrer hendelser med faktiske forhold og tiltak.",
        "Gjennomfør debrief og forebyggende oppfølging.",
      ],
      dokumentasjon: [
        "Vaktplaner og alenearbeidsvurderinger.",
        "Hendelses- og oppfølgingslogg.",
      ],
      avvikOppfolging: [
        "Hendelser med trussel/vold behandles prioritet høy.",
        "Leder skal følge opp berorte ansatte samme dag.",
      ],
      revisjon: "Revideres årlig eller ved økt hendelsesnivå.",
      kilder: [
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },
  {
    title: "Brannvern og evakuering i servering/overnatting",
    description:
      "Rutine for forebyggende brannvern, opplæring og evakuering i hotell- og restaurantdrift.",
    category: "HOTELL_RESTAURANT",
    legalReference: "IK-HMS § 5, AML § 3-1, brannforebyggingskrav",
    industryScope: ["hospitality"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal: "Sikre rask og kontrollert håndtering av brannhendelser.",
      omfang: "Gjelder kjøkken, serveringslokaler, gjestearealer og overnatting.",
      ansvar: [
        "Vaktleder: lede evakuering ved alarm.",
        "Ansatte: følge oppsatt evakueringsrolle.",
        "HMS/leder: planlegge og øve rutinen.",
      ],
      gjennomforing: [
        "Utfør periodisk kontroll av rømningsveier og slokkemidler.",
        "Gjennomfør opplæring for nyansatte i beredskapsrutiner.",
        "Ved alarm: varsle, evakuer, møteplass, opptelling.",
        "Etter hendelse: registrer avvik og læringspunkter.",
      ],
      dokumentasjon: [
        "Kontrollskjema og øvelsesprotokoller.",
        "Avviksrapport etter hendelser og øvelser.",
      ],
      avvikOppfolging: [
        "Funksjonsfeil i brannvern utbedres uten ugrunnet opphold.",
        "Manglende opplæring registreres som avvik.",
      ],
      revisjon: "Revideres halvårlig og etter øvelser/hendelser.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127",
      ],
    }),
  },
  {
    title: "Skolemiljø, trusler og hendelser i undervisning",
    description:
      "Rutine for forebygging og håndtering av vold/trusler, hendelser og psykososial belastning i utdanning.",
    category: "UTDANNING",
    legalReference: "AML § 4-3, AML § 3-1, IK-HMS § 5",
    industryScope: ["education"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre trygt arbeidsmiljø for ansatte i undervisning og elevoppfølging.",
      omfang: "Gjelder lærere, assistenter, administrasjon og ledelse.",
      ansvar: [
        "Ansatt: følge rutine for varsling og hendelsesrapportering.",
        "Leder: sikre beredskap, støtte og oppfølging.",
        "HMS: analysere trender og anbefale tiltak.",
      ],
      gjennomforing: [
        "Kartlegg risikosituasjoner i undervisningshverdagen.",
        "Definer klare varslings- og tilkallingsrutiner.",
        "Registrer hendelser og nesten-hendelser systematisk.",
        "Gjennomfør læringsmoter og korrigerende tiltak.",
      ],
      dokumentasjon: [
        "Hendelseslogg og tiltaksliste.",
        "Opplæringsstatus i konflikthåndtering.",
      ],
      avvikOppfolging: [
        "Alvorlige hendelser følges opp med strakstiltak.",
        "Forsinket oppfølging eskaleres til ledelse.",
      ],
      revisjon: "Revideres årlig ved skolestart eller ved økt hendelsesnivå.",
      kilder: [
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },
  {
    title: "Informasjonssikkerhet og tilgangsstyring",
    description:
      "Rutine for tilgangsstyring, passord, hendelser og personvern i teknologi- og IT-virksomhet.",
    category: "TEKNOLOGI_IT",
    legalReference: "GDPR art. 5 og 6, AML § 3-1, IK-HMS § 5",
    industryScope: ["technology"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre konfidensialitet, integritet og tilgjengelighet i systemene.",
      omfang: "Gjelder alle ansatte med tilgang til systemer og personopplysninger.",
      ansvar: [
        "Ansatt: følge tilgangs- og sikkerhetsrutiner.",
        "Systemansvarlig: forvalte tilgang og logging.",
        "Leder/HMS/personvern: følge opp avvik og forbedringer.",
      ],
      gjennomforing: [
        "Tildel tilgang etter minste privilegium.",
        "Gjennomfør periodisk tilgangsrevisjon.",
        "Registrer og håndter sikkerhetshendelser.",
        "Gjennomfør opplæring i sikker bruk av systemer.",
      ],
      dokumentasjon: [
        "Tilgangsmatrise og revisjonsspor.",
        "Sikkerhetshendelser og korrigerende tiltak.",
      ],
      avvikOppfolging: [
        "Kritiske sikkerhetshendelser eskaleres umiddelbart.",
        "Personvernbrudd vurderes for melding til tilsynsmyndighet.",
      ],
      revisjon: "Revideres årlig eller ved vesentlige systemendringer.",
      kilder: [
        "https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/",
      ],
    }),
  },
  {
    title: "Sikker gårdsdrift og maskinbruk",
    description:
      "Rutine for trygg bruk av maskiner, dyrehåndtering og arbeidsoperasjoner i landbruk.",
    category: "LANDBRUK",
    legalReference: "AML § 3-1, AML § 2-3, IK-HMS § 5",
    industryScope: ["agriculture"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal: "Forebygge alvorlige personskader i gårdsdrift.",
      omfang: "Gjelder gårdeier, ansatte og sesongarbeidere.",
      ansvar: [
        "Arbeidsgiver: sikre opplæring og risikovurdering.",
        "Ansatt: melde farlige forhold og følge rutiner.",
        "Leder/HMS: planlegge sesongbaserte tiltak.",
      ],
      gjennomforing: [
        "Utfør daglig kontroll av traktorer/maskiner.",
        "Planlegg sikre arbeidsoperasjoner med risikovurdering.",
        "Bruk påkrevd verneutstyr ved farlige oppgaver.",
        "Registrer hendelser og nestenulykker fortløpende.",
      ],
      dokumentasjon: [
        "Maskinkontroll og vedlikeholdslogg.",
        "Hendelseslogg med tiltak og ansvar.",
      ],
      avvikOppfolging: [
        "Alvorlige hendelser håndteres med strakstiltak og varsling.",
        "Gjentatte avvik utløser ny risikovurdering.",
      ],
      revisjon: "Revideres halvårlig og før høysesong.",
      kilder: [
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },
  {
    title: "Generell HMS-rutine for øvrige bransjer",
    description:
      "Standardrutine for virksomheter som ikke er dekket av spesifikk bransjepakke.",
    category: "GENERELL",
    legalReference: GENERAL_LEGAL_BASE.join(", "),
    industryScope: ["other"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre grunnleggende, lovpålagt HMS-oppfølging i virksomheten.",
      omfang: "Gjelder alle ansatte, ledere og innleide.",
      ansvar: [
        "Ansatt: medvirke og melde fra om farer.",
        "Leder/HMS: risikovurdere, prioritere og følge opp tiltak.",
      ],
      gjennomforing: [
        "Kartlegg farer og vurder risiko.",
        "Fastsett tiltak, ansvar og frister.",
        "Følg opp status i faste HMS-moter.",
      ],
      dokumentasjon: [
        "Risikovurdering og handlingsplan.",
        "Avvik og gjennomforte tiltak.",
      ],
      avvikOppfolging: [
        "Mangler i oppfølging registreres som avvik.",
      ],
      revisjon: "Revideres årlig.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127",
      ],
    }),
  },
];

export const GLOBAL_ROUTINE_TEMPLATE_LIBRARY: ReadonlyArray<RoutineTemplateLibraryEntry> = [
  ...commonTemplates,
  ...industrySpecificTemplates,
];

export function getGlobalRoutineTemplateLibrary(): RoutineTemplateLibraryEntry[] {
  return [...GLOBAL_ROUTINE_TEMPLATE_LIBRARY];
}
