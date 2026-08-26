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
    title: "Årlig medarbeidersamtale",
    description:
      "Rutine for planlegging og gjennomføring av årlige medarbeidersamtaler – sikrer ivaretakelse av den enkelte ansattes arbeidsforhold, utvikling og psykososiale arbeidsmiljø.",
    category: "HMS_STYRING",
    legalReference: "AML § 4-2, AML § 4-3, AML § 3-1, IK-HMS § 5",
    industryScope: ["all"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal:
        "Sikre at alle ansatte får en strukturert, dokumentert samtale med nærmeste leder om arbeidsforhold, trivsel, utvikling og eventuelle belastninger i arbeidsmiljøet.",
      omfang: "Gjelder alle ansatte og ledere med personalansvar. Gjennomføres minst én gang per år.",
      ansvar: [
        "Leder: planlegge, innkalle og gjennomføre medarbeidersamtale med alle sine ansatte.",
        "HMS-ansvarlig: sikre at maler og rutine er tilgjengelig og at gjennomføring dokumenteres.",
        "Ansatt: forberede seg og delta aktivt i samtalen.",
      ],
      gjennomforing: [
        "Send innkalling med agenda minst én uke i forveien.",
        "Gjennomfør samtalen i egnet, uforstyrret lokale.",
        "Gå gjennom: trivsel, arbeidsbelastning, samarbeid, utviklingsmål og eventuelle bekymringer.",
        "Avtal konkrete tiltak, ansvar og oppfølgingstidspunkt.",
        "Dokumenter samtalen og avtalte tiltak i systemet.",
      ],
      dokumentasjon: [
        "Referat fra samtalen (lagret konfidensielt).",
        "Avtalte tiltak med ansvarlig og frist.",
        "Dato og deltakere.",
      ],
      avvikOppfolging: [
        "Dersom medarbeidersamtale ikke er gjennomført innen årets utgang, registreres dette som avvik.",
        "Alvorlige forhold avdekket i samtalen følges opp som HMS-sak eller varsel.",
      ],
      revisjon: "Revideres årlig i forbindelse med HR-årsplan og HMS-gjennomgang.",
      kilder: [
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62#KAPITTEL_4",
        "https://www.arbeidstilsynet.no/tema/psykososialt-arbeidsmiljo/",
      ],
    }),
  },
  {
    title: "Opplæring av nye konsulenter",
    description:
      "Rutine for strukturert onboarding og HMS-opplæring av nye konsulenter – sikrer at alle som starter har nødvendig kunnskap om arbeidsoppgaver, risikoer og gjeldende regler.",
    category: "HMS_STYRING",
    legalReference: "AML § 3-2, AML § 2-3, IK-HMS § 5, FOLM § 3-18",
    industryScope: ["all"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal:
        "Sikre at nye konsulenter er tilstrekkelig opplært i HMS, arbeidsoppgaver og interne rutiner før de arbeider selvstendig.",
      omfang:
        "Gjelder alle nye konsulenter og innleide, uavhengig av erfaring og ansettelsesform. Gjennomføres ved oppstart.",
      ansvar: [
        "Fagansvarlig/leder: planlegge og gjennomføre opplæringsplan.",
        "HMS-ansvarlig: sikre at HMS-opplæring er inkludert og dokumentert.",
        "Ny konsulent: delta aktivt og bekrefte gjennomført opplæring.",
      ],
      gjennomforing: [
        "Utarbeid individuell opplæringsplan basert på konsulentens bakgrunn og oppdrag.",
        "Gjennomgå virksomhetens HMS-rutiner, varslingskanaler og avvikshåndtering.",
        "Introduser relevante risikoer knyttet til oppdraget og bransjen.",
        "Gi tilgang til HMS-systemet og relevante dokumenter.",
        "Gjennomfør praktisk innføring i aktuelle verktøy og arbeidsmetoder.",
        "Avslutt med signert bekreftelse på gjennomført opplæring.",
      ],
      dokumentasjon: [
        "Signert opplæringsplan med dato og gjennomgåtte tema.",
        "Bekreftelse på HMS-opplæring i opplæringsmodulen.",
        "Eventuelle sertifikater eller kurs som er fullført.",
      ],
      avvikOppfolging: [
        "Dersom opplæring ikke er gjennomført før konsulenten starter selvstendig arbeid, registreres dette som avvik.",
        "Mangler i opplæringen som oppdages under oppdrag, følges opp umiddelbart.",
      ],
      revisjon: "Revideres ved endringer i oppdrags­portefølje, regelverk eller organisasjon, minimum årlig.",
      kilder: [
        "https://www.arbeidstilsynet.no/tema/opplaring-og-kompetanse/",
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62#KAPITTEL_3",
      ],
    }),
  },
  {
    title: "Debrief etter hvert oppdrag",
    description:
      "Rutine for systematisk erfaringsgjennomgang etter avsluttet oppdrag – fanger opp avvik, forbedringspunkter og god praksis til bruk i fremtidige oppdrag.",
    category: "HMS_STYRING",
    legalReference: "AML § 3-1, IK-HMS § 5, ISO 9001 kap. 10.2",
    industryScope: ["all"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal:
        "Sikre systematisk læring og kontinuerlig forbedring ved å gjennomgå erfaringer fra hvert oppdrag – inkludert HMS-forhold, kvalitet og samarbeid.",
      omfang:
        "Gjelder alle avsluttede oppdrag. Gjennomføres av oppdragsansvarlig og involverte konsulenter innen én uke etter avslutning.",
      ansvar: [
        "Oppdragsansvarlig: innkalle til og lede debriefmøtet.",
        "Konsulenter: bidra med erfaringer og observasjoner fra oppdraget.",
        "HMS-ansvarlig: sikre at HMS-relaterte funn registreres som avvik eller tiltak.",
      ],
      gjennomforing: [
        "Gjennomgå hva som gikk bra og hva som kan forbedres.",
        "Identifiser HMS-relaterte hendelser, nestenulykker eller farlige situasjoner fra oppdraget.",
        "Vurder om kunden fikk den kvaliteten som ble lovet.",
        "Avtal konkrete forbedringstiltak med ansvarlig og frist.",
        "Dokumenter funn og tiltak i HMS-systemet.",
      ],
      dokumentasjon: [
        "Debriefnotat med dato, oppdrag og deltakere.",
        "Registrerte avvik eller tiltak som følge av debriefmøtet.",
        "Oppsummering av erfaringer som deles med resten av teamet.",
      ],
      avvikOppfolging: [
        "Funn som avdekker systematiske problemer eskaleres til leder og behandles som HMS-avvik.",
        "Tiltak fra debriefmøtet følges opp i neste teamgjennomgang.",
      ],
      revisjon: "Rutinen revideres hvert halvår eller ved vesentlige endringer i oppdragsmodellen.",
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

const newIndustryTemplates: RoutineTemplateLibraryEntry[] = [
  // ── ELEKTRO ────────────────────────────────────────────────────────────────
  {
    title: "Sikker arbeidspraksis – FSE og arbeid på elektriske anlegg",
    description:
      "Rutine for sikker utførelse av arbeid på elektriske anlegg iht. FSE, inkl. spenningssetting og FU-prosedyrer.",
    category: "EL_SIKKERHET",
    legalReference: "FSE § 5, § 10, AML § 3-1, AML § 3-2",
    industryScope: ["elektro"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal:
        "Forebygge elektrisk støt, lysbue og brann ved å sikre at arbeid på elektriske anlegg utføres etter FSE-kravene.",
      omfang:
        "Gjelder alle el-fagarbeidere, montører, driftsoperatører og innleide som arbeider på lavspennings- eller høyspenningsanlegg.",
      ansvar: [
        "Faglig ansvarlig (DLE/ansvarlig søker): sikre at personell er kvalifisert iht. FSE.",
        "Leder/HMS: planlegge arbeidet og sikre at prosedyrene følges.",
        "Arbeidstaker: varsle om usikre forhold og aldri utføre arbeid uten godkjent prosedyre.",
      ],
      gjennomforing: [
        "Risikovurder arbeidsoppdraget og velg arbeidsmetode: arbeid uten spenning (AUS) der mulig.",
        "Gjennomfør de 5 sikkerhetstrinnene: slå av – sikre mot innkobling – kontroller spenningsfriheten – kortslut og jord – beskytt mot naboanlegg.",
        "Bruk godkjent FSE-verneutstyr og -verktøy for aktuelle spenningsnivå.",
        "Registrer arbeidet i arbeidstillatelsessystem ved nødvendig.",
        "Gjeninnkobling skjer kun etter skriftlig tillatelse fra ansvarlig.",
      ],
      dokumentasjon: [
        "Arbeidsordre og arbeidstillatelse.",
        "Spenningsprotokoller og FU-prosedyrer.",
        "Avviksregistrering ved hendelser.",
      ],
      avvikOppfolging: [
        "Avvik fra FSE-prosedyrene registreres umiddelbart og eskaleres til leder.",
        "Nær-ulykker med elektrisk fare meldes og følges opp med tiltak.",
      ],
      revisjon: "Revideres årlig og ved endring i FSE eller NEK-standarder.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/2006-04-28-458",
        "https://lovdata.no/dokument/SF/forskrift/1998-11-06-1060",
        "https://www.standard.no/fagomrader/el-ikt-og-telekommunikasjon/elektriske-anlegg/",
      ],
    }),
  },
  {
    title: "Periodisk el-kontroll og vedlikehold av elektriske anlegg",
    description:
      "Rutine for planlegging og gjennomføring av periodisk kontroll, termografering og vedlikehold av elektriske anlegg.",
    category: "EL_SIKKERHET",
    legalReference: "FEL § 10, NEK 400, AML § 3-1, IK-HMS § 5",
    industryScope: ["elektro"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal:
        "Sikre at lavspenningsanlegg er i forsvarlig stand ved periodisk kontroll, termografi og vedlikehold.",
      omfang: "Gjelder alle elektriske installasjoner eid eller driftet av virksomheten.",
      ansvar: [
        "Leder/HMS: sørge for at periodisk kontroll utføres etter NEK 400 og FEL-kravene.",
        "Ansvarlig for elektriske anlegg: bestille ekstern kontrollør og sette opp plan.",
        "Ansatte: melde fra om feil, skader og avvik på elektrisk utstyr.",
      ],
      gjennomforing: [
        "Utarbeid oversikt over anlegg og planlegg kontrollintervaller (iht. NEK 400 del 6).",
        "Gjennomfør termografering av tavler og koblingspunkter hvert 3. år (eller etter behov).",
        "Kontroller jordfeilbrytere kvartalsvis ved hjelp av T-knapp.",
        "Dokumenter funn og registrer avvik i HMS-systemet.",
        "Sett frister for utbedring og følg opp til avvik er lukket.",
      ],
      dokumentasjon: [
        "Kontrollrapporter og termograferingsrapporter.",
        "Avvik med tiltak og frister.",
        "Kursfortegnelse og anleggsoversikt.",
      ],
      avvikOppfolging: [
        "Kritiske feil utbedres umiddelbart – anlegget spenningssettes om nødvendig.",
        "Øvrige avvik prioriteres og lukes innen fastsatt frist.",
      ],
      revisjon: "Revideres ved endring i NEK 400 eller ved vesentlige anleggsendringer.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/1998-11-06-1060",
        "https://www.standard.no/fagomrader/el-ikt-og-telekommunikasjon/elektriske-anlegg/",
      ],
    }),
  },

  // ── OFFSHORE ───────────────────────────────────────────────────────────────
  {
    title: "Tillatelse til arbeid (PTW) – arbeidstillatelsessystem offshore",
    description:
      "Rutine for bruk av arbeidstillatelsessystem (PTW) for alle farlige arbeidsoperasjoner på innretning.",
    category: "OFFSHORE_SIKKERHET",
    legalReference: "Aktivitetsforskriften § 23, Rammeforskriften § 9",
    industryScope: ["offshore", "oil_gas"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal:
        "Sikre at farlige arbeid på innretningen kun gjennomføres etter risikovurdering og med godkjent arbeidstillatelse (PTW).",
      omfang: "Gjelder alle arbeidsoperasjoner definert i PTW-prosedyren, inkl. varmarbeider, innstigning og høyspenningsarbeid.",
      ansvar: [
        "Område-ansvarlig: utstede og godkjenne PTW.",
        "Utfører: lese, forstå og signere på PTW og SJA.",
        "HMS-koordinator: overvåke PTW-systemets etterlevelse.",
      ],
      gjennomforing: [
        "Identifiser om arbeidet krever PTW iht. klassifiseringslisten.",
        "Utfør SJA og fyll ut PTW-skjema med tilhørende sjekklister.",
        "Sikre at alle involverte har lest og signert PTW.",
        "Gjennomfør arbeidet innenfor godkjente rammer.",
        "Avslutt PTW: sjekk at arbeidet er ferdig og stedet er ryddet.",
      ],
      dokumentasjon: [
        "Signert PTW-skjema arkiveres iht. krav.",
        "SJA som vedlegg til PTW.",
        "Avvik meldes i HMS-systemet.",
      ],
      avvikOppfolging: [
        "Arbeid stoppes om PTW-kravene ikke overholdes.",
        "Avvik fra PTW-prosedyren eskaleres til plattformsjef.",
      ],
      revisjon: "Revideres årlig og ved intern revisjon av styrings­systemet.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/2010-04-29-613",
        "https://lovdata.no/dokument/SF/forskrift/2010-04-29-611",
      ],
    }),
  },
  {
    title: "Beredskapsplan og øvelser – offshore innretning",
    description:
      "Rutine for beredskapsplanlegging, øvelsesgjennomføring og evaluering iht. Aktivitetsforskriften.",
    category: "BEREDSKAP",
    legalReference: "Aktivitetsforskriften § 99, Rammeforskriften § 5",
    industryScope: ["offshore", "oil_gas"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal:
        "Sikre at innretningen er forberedt til å håndtere storulykker, brann, mann-over-bord og andre nødsituasjoner.",
      omfang: "Gjelder plattformsjef, beredskapsorganisasjonen og alle personell ombord.",
      ansvar: [
        "Plattformsjef (OIM): øverstkommanderende ved nødsituasjon.",
        "HMS-koordinator: planlegge og evaluere øvelser.",
        "Alle ombord: kjenne mønstringsstasjoner og nødprosedyrer.",
      ],
      gjennomforing: [
        "Gjennomfør evakueringsøvelse minst en gang per 30 dager.",
        "Gjennomfør mann-over-bord-øvelse iht. beredskapsplan.",
        "Evaluer øvelsene og registrer funn og forbedringstiltak.",
        "Oppdater beredskapsplanen etter øvelse eller endring i bemanning.",
      ],
      dokumentasjon: [
        "Øvelseslogg med dato, type, deltakere og evaluering.",
        "Oppdatert beredskapsplan og mønstringsplan.",
        "Avvik og tiltak fra øvelser.",
      ],
      avvikOppfolging: [
        "Funn fra øvelser behandles som avvik og følges opp med tiltaksplaner.",
        "Kritiske mangler i beredskapen stoppes umiddelbart.",
      ],
      revisjon: "Revideres årlig og etter reell nødsituasjon eller vesentlig øvelsespåvisning.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/2010-04-29-613",
      ],
    }),
  },

  // ── MARITIME ───────────────────────────────────────────────────────────────
  {
    title: "Sikkerhetsstyringssystem (SMS) – ISM-koden",
    description:
      "Rutine for utvikling, implementering og vedlikehold av ISM-samsvarende sikkerhetsstyringssystem ombord.",
    category: "MARITIM_SIKKERHET",
    legalReference: "ISM-koden kap. 1, 3 og 12, Sjødyktighetsloven § 2",
    industryScope: ["marine"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal:
        "Sikre at fartøyet opererer iht. ISM-kodens krav gjennom et dokumentert og levende sikkerhetsstyringssystem.",
      omfang: "Gjelder rederiet, kaptein, offiserer og alt mannskap ombord.",
      ansvar: [
        "Rederiet (DPA): sikre at SMS er tilgjengelig, oppdatert og implementert.",
        "Kaptein: implementere SMS ombord og rapportere til rederiet.",
        "Alle offiserer og mannskap: kjenne og etterleve relevante SMS-prosedyrer.",
      ],
      gjennomforing: [
        "Alle prosedyrer i SMS er tilgjengelige ombord og oppdatert.",
        "Nytt mannskap introduseres til SMS og relevante prosedyrer ved ombordstigning.",
        "Intern ISM-revisjon gjennomføres minst en gang per år.",
        "Avvik og farlige situasjoner meldes, registreres og følges opp.",
        "Øvelser dokumenteres i øvelseslogg.",
      ],
      dokumentasjon: [
        "SMS-manual (hoved- og prosedyredel).",
        "Øvelseslogg og avvikslogg.",
        "ISM-revisjonsrapport.",
      ],
      avvikOppfolging: [
        "Avvik og nestenulykker rapporteres til rederiet iht. SMS.",
        "Kritiske funn fra revisjon behandles umiddelbart.",
      ],
      revisjon: "Revideres etter intern revisjon, eksterne ISM-revisjoner og endringer i mannskap eller operasjonsområde.",
      kilder: [
        "https://www.sdir.no/regelverk/internasjonale-regler/ism-koden/",
        "https://lovdata.no/dokument/NL/lov/1903-06-09-7",
      ],
    }),
  },

  // ── FISKERI ────────────────────────────────────────────────────────────────
  {
    title: "Sikker fangstoperasjon og dekksarbeid",
    description:
      "Rutine for sikker gjennomføring av fangstoperasjoner og dekksarbeid på fiskefartøy.",
    category: "FISKERIFARTOY",
    legalReference: "Sjødyktighetsloven § 2, Arbeidsmiljøloven § 3-1, IK-HMS § 5",
    industryScope: ["fiskeri"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal:
        "Forebygge personskader og ulykker under fangstoperasjoner på fiskefartøy.",
      omfang: "Gjelder alt mannskap ombord under fangstoperasjoner.",
      ansvar: [
        "Skipper: overordnet ansvar for sikkerhet og gjennomføring av rutiner.",
        "Dekksformann: lede og overvåke arbeidsoperasjonene.",
        "Alt mannskap: bruke verneutstyr og varsle om farlige situasjoner.",
      ],
      gjennomforing: [
        "Briefing om dagens operasjon og arbeidsfordeling.",
        "Kontroller at verneutstyr (flytevest, hansker, hørselsvern) er tilgjengelig.",
        "Bruk tauguider og sikringer ved håndtering av line og trål.",
        "Minimer opphold på dekk under dårlig vær.",
        "Registrer avvik og nestenulykker etter endt operasjon.",
      ],
      dokumentasjon: [
        "Operasjonslogg og avviksrapporter.",
        "Vedlikeholdslogg for løfte- og fiskereutstyr.",
      ],
      avvikOppfolging: [
        "Personskader meldes til reder og relevant myndighet.",
        "Gjentatte nestenulykker utløser ny risikovurdering.",
      ],
      revisjon: "Revideres halvårlig og etter alvorlige hendelser.",
      kilder: [
        "https://lovdata.no/dokument/NL/lov/1903-06-09-7",
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },

  // ── BERGVERK ───────────────────────────────────────────────────────────────
  {
    title: "Sikker gruveoperasjon og sprengningsarbeid",
    description:
      "Rutine for sikkert arbeid i gruve, tunneldrift og ved sprengningsoperasjoner.",
    category: "BERGVERK",
    legalReference: "AML § 3-1, Arbeidsmiljøforskriftene, Sprengstofforskriften",
    industryScope: ["bergverk"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal:
        "Forebygge sprengningsulykker, ras og gassulykker i gruvedrift og tunnelarbeid.",
      omfang: "Gjelder bergingeniører, sprengere, bergarbeidere og innleide i gruve eller tunnel.",
      ansvar: [
        "Bergingeniør/HMS-ansvarlig: risikovurdering og godkjenning av sprengplan.",
        "Sprenger (godkjent): utføre sprengning iht. sprengningsplan.",
        "Alle arbeidere: evakuere ved alarm og aldri gå inn i røyksone etter sprengning.",
      ],
      gjennomforing: [
        "Utarbeid sprengplan og innhent nødvendige tillatelser.",
        "Evakuer alle fra risikosone før antenning.",
        "Ventiler grundig etter sprengning (min. 30 min. eller iht. beregning).",
        "Befar skytested for blindskudd før normal drift gjenopptas.",
        "Registrer sprengning i sprengningslogg.",
      ],
      dokumentasjon: [
        "Sprengningsplan, -protokoll og forbruksregnskap.",
        "Avvik og nestenulykker.",
        "Kompetansebevis for godkjente sprengere.",
      ],
      avvikOppfolging: [
        "Blindskudd og uventede detonasjoner håndteres etter gitt nødprosedyre.",
        "Alle sprengningsuhell meldes til Arbeidstilsynet.",
      ],
      revisjon: "Revideres halvårlig og ved endring i sprengstoff eller metode.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/2002-06-26-922",
        "https://lovdata.no/dokument/NL/lov/2005-06-17-62",
      ],
    }),
  },

  // ── OLJE OG GASS (deler med offshore) ────────────────────────────────────
  {
    title: "Barrierestyring og -verifisering – olje og gass",
    description:
      "Rutine for identifisering, vedlikehold og verifikasjon av sikkerhetsbarrierer i olje- og gassvirksomhet.",
    category: "OFFSHORE_SIKKERHET",
    legalReference: "Rammeforskriften § 5, Styringsforskriften § 5, Ptil D-010",
    industryScope: ["oil_gas", "offshore"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal:
        "Sikre at barrierene mot storulykke (brann, eksplosjon, ukontrollert utstrømning) er på plass og virker.",
      omfang: "Gjelder operatør, brønnansvarlig, vedlikeholdsansvarlig og HMS-koordinator.",
      ansvar: [
        "Operatør: sette barrierestandard og dokumentere i WBD/BEP.",
        "Produksjonsleder: sørge for at barrierestatus er kjent.",
        "HMS-koordinator: overvåke og rapportere barrieresvekkelser.",
      ],
      gjennomforing: [
        "Identifiser og dokumenter alle sikkerhetsbarrierer i barriereskjemaet.",
        "Gjennomfør periodisk testing av barrierer etter fastsatt plan.",
        "Rapporter svekkede barrierer umiddelbart og sett kompenserende tiltak.",
        "Evaluer barriereintegritet som del av den løpende driftsgjennomgangen.",
      ],
      dokumentasjon: [
        "Barrierediagram og brønnbarriere-dokument (WBD).",
        "Testprotokoller og avvikssystem.",
        "Periodisk barrierestatusrapport.",
      ],
      avvikOppfolging: [
        "Svekkede barrierer utløser umiddelbar risikovurdering og kompenserende tiltak.",
        "To simultant svekkede barrierer mot samme storulykke stoppes driften.",
      ],
      revisjon: "Revideres ved endring i brønntilstand eller etter storulykke-hendelse.",
      kilder: [
        "https://lovdata.no/dokument/SF/forskrift/2010-04-29-611",
        "https://www.ptil.no/regelverksveiledning/d-010/",
      ],
    }),
  },
];

// ─── Reiseliv / Hotell og Restaurant ────────────────────────────────────────
// Kategori: HOTELL_RESTAURANT
// Hjemmel: AML, IK-HMS, IK-mat, næringsmiddelhygieneforskriften, BHT-forskriften
const hotelRestaurantTemplates: RoutineTemplateLibraryEntry[] = [
  {
    title: "Renholdsrutine – housekeeping (daglig/ukentlig)",
    description: "Rutine for daglig og ukentlig renhold av rom og felles arealer. Kjemikalier, ergonomi og kvalitetssikring.",
    category: "HOTELL_RESTAURANT",
    legalReference: "IK-HMS § 5, AML § 4-5 (kjemikalier), AML § 4-4 (ergonomi)",
    industryScope: ["hospitality", "HOTELL_OVERNATTING"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre rent og hygienisk miljø for gjester og ansatte, og forebygge arbeidsrelaterte skader i renholdsarbeid.",
      omfang: "Gjelder alt renholdsarbeid på rom, fellesarealer, bad og kjøkken.",
      ansvar: [
        "Renholdsansvarlig: planlegge og fordele oppgaver.",
        "Housekeeping-ansatt: utføre renhold iht. rutine og bruke riktig verneutstyr.",
        "HMS-ansvarlig: sørge for opplæring og oppdatert stoffkartotek.",
      ],
      gjennomforing: [
        "Daglig: senging, tøm søppel, rengjør bad, bytt håndklær og sengitøy ved utsjekk.",
        "Ukentlig: grundig rengjøring av alle flater, møbler og garderobeinnhold.",
        "Bruk alltid vernehansker og følg doseringsveiledning for kjemikalier.",
        "Bruk ergonomisk riktig teknikk ved støvsuging og moppearbeid (kort/langt skaft).",
        "Meld fra om defekter (ødelagte møbler, lekkasjer) umiddelbart.",
      ],
      dokumentasjon: [
        "Renholdslogg for hvert rom (dato, initialer, avvik).",
        "Stoffkartotek tilgjengelig og oppdatert.",
        "Opplæring i kjemikaliehåndtering dokumentert.",
      ],
      avvikOppfolging: [
        "Avvik meldes umiddelbart til renholdsansvarlig.",
        "Kjemikaliehendelser (søl, innånding) meldes som avvik og behandles iht. sikkerhetsdatablad.",
      ],
      revisjon: "Revideres ved endring i kjemikalier/metoder eller ved avvik. Ellers hvert år.",
      kilder: [
        "AML § 4-5 – kjemikalier",
        "AML § 4-4 – ergonomi",
        "IK-HMS § 5 – internkontroll",
        "Arbeidstilsynet: renholdsarbeid",
      ],
    }),
  },
  {
    title: "Temperaturkontroll – kjølerom og fryser",
    description: "Rutine for daglig temperaturlogging av kjøle- og fryseanlegg. HACCP – kritisk kontrollpunkt (CCP).",
    category: "HOTELL_RESTAURANT",
    legalReference: "Næringsmiddelhygieneforskriften, forordning (EF) 852/2004 art. 5 (HACCP CCP)",
    industryScope: ["hospitality", "RESTAURANT_SERVERING", "HOTELL_OVERNATTING"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal: "Forebygge matforgiftning ved å sikre at matvarer oppbevares ved korrekt temperatur til enhver tid.",
      omfang: "Gjelder alle kjøle- og fryseanlegg i virksomheten.",
      ansvar: [
        "Kjøkkenansvarlig: sørge for daglig logging og oppfølging av avvik.",
        "Kokk/kjøkkenansatt: utføre daglig temperaturmåling og registrering.",
        "HACCP-ansvarlig: revidere CCP-grensene og oppdatere HACCP-planen ved endringer.",
      ],
      gjennomforing: [
        "Mål og registrer temperatur i alle kjøle- og fryseanlegg minst én gang per dag.",
        "Kjølesoner: 0–4°C for kjøtt og fisk, 0–8°C for øvrige varer.",
        "Frysoner: under –18°C.",
        "Ved avvik: kontroller innhold, iverksett strakstiltak (flytt varer, meld til leder).",
        "Kontroller at alarmsystemer er koblet opp (varsel ved temperaturavvik).",
      ],
      dokumentasjon: [
        "Temperaturlogg: dato, klokkeslett, målt temperatur, ansvarlig.",
        "Avviksskjema ved temperaturer utenfor grenseverdiene.",
        "Kalibrering av termometere – dokumenter siste kalibreringsdato.",
      ],
      avvikOppfolging: [
        "Ved temperaturavvik: vurder mattrygghet, kast mat ved tvil.",
        "Meld avvik i avvikssystemet med bilde og beskrivelse.",
        "Teknisk feil meldes umiddelbart til servicepartner.",
      ],
      revisjon: "Revideres halvårlig eller ved endringer i menyen/produktmiksen.",
      kilder: [
        "Forordning (EF) 852/2004 Art. 5 – HACCP",
        "Mattilsynet: veiledning til temperaturkrav",
        "IK-mat-forskriften",
      ],
    }),
  },
  {
    title: "Allergeninformasjon og merking",
    description: "Rutine for håndtering og kommunikasjon av allergeninformasjon til gjester. EU-forordning 1169/2011 – de 14 EU-allergener.",
    category: "HOTELL_RESTAURANT",
    legalReference: "EU-forordning 1169/2011, Matmerkeforskriften § 5",
    industryScope: ["hospitality", "RESTAURANT_SERVERING"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal: "Forebygge alvorlige allergireaksjoner ved å sikre korrekt og tilgjengelig allergeninformasjon for alle retter.",
      omfang: "Gjelder all mat og drikke som serveres i restauranten, inkludert bufét, barmat og catering.",
      ansvar: [
        "Kjøkkensjef: oppdatere allergenliste ved menyendringer.",
        "Servitør: informere gjester og videreformidle allergispørsmål til kjøkken.",
        "Innkjøpsansvarlig: sjekke allergeninformasjon for nye ingredienser.",
      ],
      gjennomforing: [
        "Oppdater allergenliste ved hver menyendring – de 14 EU-allergener: gluten, krepsdyr, egg, fisk, peanøtter, soya, melk/laktose, nøtter, selleri, sennep, sesamfrø, svoveldioksid/sulfitt, lupin, bløtdyr.",
        "Gjør allergenlisten tilgjengelig for gjester (meny, QR-kode, skriftlig ved forespørsel).",
        "Servitørene skal alltid spørre gjester ved allergiforespørsel om å få bekreftet allergier skriftlig til kjøkken.",
        "Unngå kryssk kontaminasjon: egne redskaper, skjærebrett og arbeidsflater for allergenkrit mat.",
        "Gi all ny ansatt opplæring i de 14 EU-allergener og håndtering av allergiforespørsler.",
      ],
      dokumentasjon: [
        "Allergenliste per rett – oppdatert dato og signatur.",
        "Opplæring av serveringspersonell dokumentert.",
        "Avvik/hendelser med allergireaksjoner registrert.",
      ],
      avvikOppfolging: [
        "Ved allergireaksjon: tilkall hjelp umiddelbart, meld avvik.",
        "Evaluer om allergeninformasjonen var korrekt og tilgjengelig.",
      ],
      revisjon: "Revideres ved menyendringer og minst hvert halvår.",
      kilder: [
        "EU-forordning 1169/2011",
        "Matmerkeforskriften",
        "Mattilsynet: allergen-veiledning",
      ],
    }),
  },
  {
    title: "Nattarbeid og alenearbeidsvurdering",
    description: "Rutine for vurdering av nattarbeid og alenearbeid i overnatting og servering. AML § 10-11 og § 4-1.",
    category: "HOTELL_RESTAURANT",
    legalReference: "AML § 10-11 (nattarbeid), AML § 4-1 (forsvarlig arbeidsmiljø), IK-HMS § 5",
    industryScope: ["hospitality", "HOTELL_OVERNATTING"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre at nattarbeid og alenearbeid er lovlig begrunnet, forsvarlig tilrettelagt og at ansatte er ivaretatt.",
      omfang: "Gjelder all nattarbeid (kl. 21–06) og alenearbeid i hotell, overnatting og restaurant.",
      ansvar: [
        "Leder/HR: gjennomføre skriftlig vurdering av nødvendigheten av nattarbeid.",
        "HMS-ansvarlig: sørge for tilbud om helseundersøkelse for nattarbeidere.",
        "Nattansatt: kjenne rutiner for alenearbeid og nødsituasjoner.",
      ],
      gjennomforing: [
        "Dokumenter skriftlig at nattarbeid er nødvendig for virksomhetens art (krav i AML § 10-11).",
        "Tilby helseundersøkelse ved ansettelse og deretter hvert år for faste nattarbeidere.",
        "Vurder om alenearbeid er forsvarlig: er det to ansatte om natten, eller kreves duoprinsipp?",
        "Sørg for at nattvakt alltid har kommunikasjonsmiddel (telefon/alarm) og sjekk-inn-rutine.",
        "Etabler varslingsknapp/alarm i resepsjon for alenearbeidere om natten.",
      ],
      dokumentasjon: [
        "Skriftlig nattarbeidsvurdering – dato og signatur.",
        "Dokumentasjon av helseundersøkelse for nattarbeidere.",
        "Alenearbeidsvurdering – risikobeskrivelse og tiltak.",
      ],
      avvikOppfolging: [
        "Hendelse under nattarbeid/alenearbeid meldes som avvik.",
        "Evaluer om tiltak er tilstrekkelige og oppdater vurderingen.",
      ],
      revisjon: "Revideres hvert år, og ved endringer i bemanningsplan.",
      kilder: [
        "AML § 10-11 – nattarbeid",
        "AML § 4-1 – forsvarlig arbeidsmiljø",
        "Arbeidstilsynet: alenearbeid",
        "IK-HMS § 5",
      ],
    }),
  },
  {
    title: "Vold, trusler og krevende kundesituasjoner",
    description: "Rutine for forebygging og håndtering av vold og trusler i resepsjon, servering og bar. AML § 4-3.",
    category: "HOTELL_RESTAURANT",
    legalReference: "AML § 4-3 (psykososialt arbeidsmiljø), IK-HMS § 5, Arbeidstilsynet",
    industryScope: ["hospitality", "HOTELL_OVERNATTING", "RESTAURANT_SERVERING"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forebygge og håndtere vold, trusler og krevende kundesituasjoner for å beskytte ansatte.",
      omfang: "Gjelder alle ansatte i kontakt med gjester/kunder: resepsjon, servering, bar, vakt.",
      ansvar: [
        "Leder: kartlegge risiko for vold/trusler, etablere skriftlig rutine.",
        "Alle ansatte: kjenne rutinen og varsle leder ved hendelser.",
        "HMS-ansvarlig: sørge for opplæring og øvelse.",
      ],
      gjennomforing: [
        "Risikovurdering: identifiser situasjoner med høy risiko for vold/trusler (bar om natten, alene-nattvakt, kasse).",
        "Fysiske tiltak: varslingsknapp, sikkerhetsglass ved kasse, kontroll av kontanter.",
        "Opplæring: deeskalering, «nå-stop»-signal mellom kollegaer.",
        "Prosedyre ved truende atferd: trekk deg rolig unna, trykk på alarm, tilkall hjelp.",
        "Etter hendelse: debrifing samme dag, tilbud om krisestøtte.",
      ],
      dokumentasjon: [
        "Risikovurdering – vold og trusler.",
        "Rutine tilgjengelig for alle ansatte.",
        "Opplæring dokumentert.",
        "Hendelseslogg – alle volds-/trusselhendelser.",
      ],
      avvikOppfolging: [
        "Alle hendelser meldes i avvikssystemet.",
        "Evaluer om rutine og tiltak var tilstrekkelige.",
        "Psykisk ettervern: tilby samtale/krisestøtte til berørte ansatte.",
      ],
      revisjon: "Revideres etter alvorlige hendelser og ellers hvert år.",
      kilder: [
        "AML § 4-3 – psykososialt arbeidsmiljø",
        "Arbeidstilsynet: vold og trusler i arbeidslivet",
        "IK-HMS § 5",
      ],
    }),
  },
  {
    title: "Smilefjesberedskap – Mattilsynets tilsyn",
    description: "Rutine for forberedelse til og oppfølging av Mattilsynets tilsyn. Smilefjesordningen for serveringssteder.",
    category: "HOTELL_RESTAURANT",
    legalReference: "Næringsmiddelhygieneforskriften, smilefjesforskriften (FOR-2016-05-19-501)",
    industryScope: ["hospitality", "RESTAURANT_SERVERING"],
    reviewIntervalMonths: 6,
    content: createContent({
      formaal: "Sikre at virksomheten alltid er forberedt på tilsyn fra Mattilsynet og opprettholder et strålende smilefjes.",
      omfang: "Gjelder kjøkken, serveringsarealer, lager og all matvarehåndtering.",
      ansvar: [
        "Daglig leder: ansvarlig for Mattilsynet-oppfølging og søksmålslogg.",
        "Kjøkkensjef: sikre daglig etterlevelse av HACCP og renholdsrutiner.",
        "Alle ansatte: melde avvik og følge rutiner.",
      ],
      gjennomforing: [
        "Hold HACCP-plan, temperaturlogg og allergenoversikt oppdatert til enhver tid.",
        "Gjennomfør månedlig intern sjekk mot Mattilsynets tilsynspunkter.",
        "Sørg for at alle ansatte kjenner hygienereglene (håndhygiene, sykdomsmelding).",
        "Renholdsplan skal følges og dokumenteres (dato, initialer).",
        "Meld fra til Mattilsynet om endringer i virksomheten (lokaler, meny, eierskap).",
      ],
      dokumentasjon: [
        "HACCP-plan med CCP-punkt og grenseverdier.",
        "Temperaturlogger – siste 3 måneder.",
        "Renholdslogg.",
        "Tilsynsrapporter og oppfølgingslogg.",
        "Ansattes opplæring i mattrygghet.",
      ],
      avvikOppfolging: [
        "Feil funnet av Mattilsynet behandles som avvik.",
        "Iverksett korrigerende tiltak innen fristen.",
        "Dokumenter tiltak og send svar til Mattilsynet.",
      ],
      revisjon: "Revideres halvårlig og etter hvert tilsyn.",
      kilder: [
        "Smilefjesforskriften FOR-2016-05-19-501",
        "Næringsmiddelhygieneforskriften – forordning (EF) 852/2004",
        "Mattilsynet: smilefjesordningen",
      ],
    }),
  },
  {
    title: "Sesongoppstart – HMS-sjekkliste",
    description: "Rutine for HMS-forberedelser ved sesongoppstart. Onboarding av sesongansatte, utstyrkontroll og mattrygghet.",
    category: "HOTELL_RESTAURANT",
    legalReference: "IK-HMS § 5, AML § 3-2 (opplæring), IK-mat § 5 nr. 9 (kompetanse)",
    industryScope: ["hospitality", "HOTELL_OVERNATTING", "RESTAURANT_SERVERING", "ATTRAKSJON_OPPLEVELSE"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre at virksomheten er HMS-klar ved sesongoppstart og at alle ansatte er riktig opplært.",
      omfang: "Gjelder alle avdelinger og alle ansatte ved oppstart av ny sesong.",
      ansvar: [
        "Daglig leder: ansvarlig for sesongoppstartssjekk.",
        "Avdelingsledere: gjennomføre sjekkliste for sin avdeling.",
        "HR/HMS: koordinere onboarding og dokumentere opplæring.",
      ],
      gjennomforing: [
        "Oppdater HMS-plan, risikovurderinger og beredskapsplan.",
        "Gjennomfør onboarding med alle nye og returnerende sesongansatte: HMS, brann, mattrygghet.",
        "Kontroller og sertifiser utstyr (kjøkken, aktivitets-/sportsutstyr, løfteutstyr).",
        "Sjekk at kjøle- og fryseanlegg er kalibrert og fungerer.",
        "Gjennomgå brannslokkeutstyr og evakueringsplan.",
        "Oppdater allergenoversikt og HACCP-plan for sesongens meny.",
      ],
      dokumentasjon: [
        "Sesongoppstartssjekkliste – signert av avdelingsleder.",
        "Opplæringslogg for alle nye ansatte.",
        "Utstyrskontroll – signert.",
      ],
      avvikOppfolging: [
        "Avvik funnet ved sesongoppstart prioriteres og lukkes før åpning.",
        "Meldes i avvikssystemet.",
      ],
      revisjon: "Revideres hvert år før sesongoppstart.",
      kilder: [
        "IK-HMS § 5",
        "AML § 3-2 – opplæring",
        "Forordning (EF) 852/2004 art. 5 – HACCP",
      ],
    }),
  },

  // ── Kontor / rådgivning / advokatfirma / regnskap ──────────────────────
  {
    title: "Ergonomi og skjermarbeid",
    description: "Rutine for ergonomisk tilpasning av kontorarbeidsplass, skjermpauser og synsundersøkelse for skjermbrukere.",
    category: "ERGONOMI",
    legalReference: "Forskrift om utforming og innretning av arbeidsplasser § 2-3, AML § 4-4",
    industryScope: ["office", "consulting", "legal", "accounting", "technology", "finance", "architecture", "media"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forebygge muskel- og skjelettplager, synsproblemer og belastningsskader hos ansatte med skjermarbeid.",
      omfang: "Gjelder alle ansatte som bruker dataskjerm som en vesentlig del av arbeidsdagen.",
      ansvar: [
        "Arbeidsgiver: tilby ergonomisk utstyr og synsundersøkelse.",
        "HMS-ansvarlig: gjennomføre arbeidsplassvurderinger.",
        "Ansatte: melde behov for tilpasning og ta regelmessige pauser.",
      ],
      gjennomforing: [
        "Gjennomfør individuell arbeidsplassvurdering ved nyansettelse og ved endret arbeidsoppgave.",
        "Tilby hev/senk-pult, justerbar stol, ekstern skjerm og tastatur/mus.",
        "Gi opplæring i riktig arbeidsstilling: skjermavstand, stolhøyde, underarmsvinkel.",
        "Sørg for pauser fra skjermarbeid – minimum 5–10 minutter per arbeidstime med skjerm.",
        "Tilby synsundersøkelse hvert annet år for ansatte med skjermarbeid over halv dag.",
        "Varier arbeidsoppgaver slik at langvarig statisk arbeid unngås.",
      ],
      dokumentasjon: [
        "Arbeidsplassvurdering – signert av ansatt og HMS-ansvarlig.",
        "Oversikt over utlevert utstyr.",
        "Logg over gjennomførte synsundersøkelser.",
      ],
      avvikOppfolging: [
        "Ansatte melder plager eller behov via avvikssystemet.",
        "Tiltak iverksettes innen 14 dager og dokumenteres.",
      ],
      revisjon: "Revideres årlig eller ved endring av arbeidsplass/utstyr.",
      kilder: [
        "Forskrift om utforming og innretning av arbeidsplasser § 2-3",
        "AML § 4-4 – fysisk arbeidsmiljø",
        "Arbeidstilsynet: skjermarbeid og ergonomi",
      ],
    }),
  },
  {
    title: "Inneklima og kontormiljø",
    description: "Rutine for overvåkning og forbedring av inneklima, temperatur, ventilasjon og støy i kontormiljø.",
    category: "INNEKLIMA",
    legalReference: "AML § 4-4, Forskrift om utforming og innretning av arbeidsplasser",
    industryScope: ["office", "consulting", "legal", "accounting", "finance", "architecture", "media"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre godt inneklima og kontormiljø som forebygger helseplager og fremmer produktivitet.",
      omfang: "Gjelder alle kontorarealer, møterom og fellesområder.",
      ansvar: [
        "Arbeidsgiver: sørge for tilfredsstillende inneklima og vedlikehold av ventilasjon.",
        "HMS-ansvarlig: gjennomføre inneklimamålinger og følge opp avvik.",
        "Verneombud: fange opp klager og melde videre.",
      ],
      gjennomforing: [
        "Mål temperatur, luftfuktighet og CO₂-nivå minst halvårlig.",
        "Sørg for at romtemperatur holdes mellom 20–24 °C og luftfuktighet 30–60 %.",
        "Kontroller at ventilasjonssystem har riktig kapasitet og er rengjort/vedlikeholdt.",
        "Kartlegg og reduser støykilder i kontorlandskap: romavdelere, stillesoner, headset.",
        "Sikre tilstrekkelig belysning ved arbeidsplasser (500 lux anbefalt).",
      ],
      dokumentasjon: [
        "Inneklimamålinger – loggført med dato og verdier.",
        "Vedlikeholdslogg for ventilasjonsanlegg.",
        "Eventuelle klager og iverksatte tiltak.",
      ],
      avvikOppfolging: [
        "Klager på inneklima registreres i avvikssystemet.",
        "Tiltak iverksettes og effekt evalueres innen 30 dager.",
      ],
      revisjon: "Revideres årlig eller ved ombygging/endring av lokaler.",
      kilder: [
        "AML § 4-4 – fysisk arbeidsmiljø",
        "Forskrift om utforming og innretning av arbeidsplasser",
        "Arbeidstilsynet: inneklima og ventilasjon",
      ],
    }),
  },
  {
    title: "Informasjonssikkerhet og personvern (GDPR)",
    description: "Rutine for ivaretakelse av informasjonssikkerhet, tilgangsstyring og etterlevelse av GDPR i kontorvirksomhet.",
    category: "PERSONVERN",
    legalReference: "GDPR art. 5, 6, 32, Personopplysningsloven, AML § 3-1",
    industryScope: ["office", "consulting", "legal", "accounting", "finance", "technology"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre at personopplysninger behandles i samsvar med GDPR, og at informasjonssikkerheten er ivaretatt.",
      omfang: "Gjelder all behandling av personopplysninger i virksomheten, digitalt og fysisk.",
      ansvar: [
        "Daglig leder: behandlingsansvarlig etter GDPR.",
        "Personvernombud/IT-ansvarlig: oppdatere behandlingsprotokoll og følge opp avvik.",
        "Alle ansatte: følge retningslinjer for passord, tilgang og varsle ved mulig brudd.",
      ],
      gjennomforing: [
        "Før behandlingsprotokoll (art. 30) med oversikt over alle behandlingsaktiviteter.",
        "Implementer tilgangsstyring: minst nødvendig tilgang (need-to-know).",
        "Krev sterke passord og tofaktorautentisering på alle systemer med persondata.",
        "Gjennomfør opplæring i personvern og informasjonssikkerhet for alle ansatte årlig.",
        "Sørg for databehandleravtaler med alle leverandører som behandler persondata.",
        "Etabler prosedyre for håndtering av personvernbrudd: varsle Datatilsynet innen 72 timer.",
      ],
      dokumentasjon: [
        "Behandlingsprotokoll (art. 30).",
        "Databehandleravtaler.",
        "Logg over opplæring og gjennomførte risikovurderinger.",
        "Avvikshåndteringslogg for personvernbrudd.",
      ],
      avvikOppfolging: [
        "Mulige personvernbrudd meldes umiddelbart til personvernombud.",
        "Alvorlige brudd varsles Datatilsynet innen 72 timer (GDPR art. 33).",
      ],
      revisjon: "Revideres årlig og ved endring i systemer eller behandlingsaktiviteter.",
      kilder: [
        "GDPR art. 5, 6, 32, 33",
        "Personopplysningsloven",
        "Datatilsynet: veiledning om internkontroll og informasjonssikkerhet",
      ],
    }),
  },
  {
    title: "Psykososialt arbeidsmiljø og stressmestring",
    description: "Rutine for forebygging og håndtering av psykososiale belastninger, arbeidsrelatert stress og utbrenning.",
    category: "PSYKOSOSIALT",
    legalReference: "AML § 4-3, IK-HMS § 5",
    industryScope: ["office", "consulting", "legal", "accounting", "finance", "technology", "media"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forebygge arbeidsrelatert stress, utbrenning og psykososiale belastninger blant ansatte.",
      omfang: "Gjelder alle ansatte og ledere i virksomheten.",
      ansvar: [
        "Arbeidsgiver: sørge for forsvarlig psykososialt arbeidsmiljø (AML § 4-3).",
        "Ledere: fange opp tidlige tegn på stress og tilby tilpasning.",
        "Verneombud: ivareta ansattes rettigheter og melde bekymringer.",
      ],
      gjennomforing: [
        "Gjennomfør arbeidsmiljøkartlegging med fokus på psykososiale forhold minst årlig.",
        "Sørg for at arbeidsbelastning og tidspress er håndterbare – vurder bemanning.",
        "Tilby støtte og veiledning ved høy arbeidsbelastning: prioriteringshjelp, avlastning.",
        "Gi opplæring til ledere i å gjenkjenne og håndtere stressrelaterte plager.",
        "Etabler lavterskeltilbud: bedriftshelsetjeneste, samtalepartner, kollegastøtteordning.",
        "Gjennomfør medarbeidersamtaler med fokus på arbeidsmiljø og trivsel minst årlig.",
      ],
      dokumentasjon: [
        "Resultater fra arbeidsmiljøkartlegging – anonymisert.",
        "Handlingsplan med tiltak og ansvarlig.",
        "Logg over gjennomførte medarbeidersamtaler.",
      ],
      avvikOppfolging: [
        "Bekymringer meldes via verneombud eller direkte til HMS-ansvarlig.",
        "Tiltak evalueres kvartalsvis.",
      ],
      revisjon: "Revideres årlig eller ved vesentlige organisasjonsendringer.",
      kilder: [
        "AML § 4-3 – psykososialt arbeidsmiljø",
        "IK-HMS § 5",
        "Arbeidstilsynet: psykososialt arbeidsmiljø",
      ],
    }),
  },

  // ── Finans ─────────────────────────────────────────────────────────────
  {
    title: "Ransforebygging og sikkerhet i finansvirksomhet",
    description: "Rutine for forebygging av ran og sikkerhetshåndtering i finansvirksomhet med kontanthåndtering.",
    category: "SIKKERHET",
    legalReference: "AML § 4-3 (3), AML § 3-1, IK-HMS § 5",
    industryScope: ["finance"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forebygge ran og sikre trygg håndtering av verdier, samt ivareta ansattes sikkerhet og psykisk helse.",
      omfang: "Gjelder alle ansatte i avdelinger med kontanthåndtering og kundemottak.",
      ansvar: [
        "Daglig leder: ansvarlig for sikkerhetsrutiner og beredskapsplan.",
        "Sikkerhetsansvarlig: vedlikeholde teknisk utstyr og gjennomføre øvelser.",
        "Alle ansatte: kjenne alarmrutiner og følge prosedyrer.",
      ],
      gjennomforing: [
        "Installer og vedlikehold tidsforsinket safe, alarmknapper og overvåkningskamera.",
        "Minimer kontantbeholdning i kasser – regelmessig tømming.",
        "Gjennomfør ransinstruks-opplæring for alle ansatte ved ansettelse og årlig.",
        "Øv på ransscenarier minst årlig – inkluder kommunikasjon med politi.",
        "Etabler ettervern: debriefing, psykologbistand og oppfølgingssamtale etter hendelse.",
        "Gjennomfør risikovurdering av lokaler: belysning, siktlinjer, adgangskontroll.",
      ],
      dokumentasjon: [
        "Sikkerhetsplan med alarmrutiner og ansvarsoversikt.",
        "Logg over gjennomførte øvelser og opplæring.",
        "Vedlikeholdslogg for sikkerhetsutstyr.",
      ],
      avvikOppfolging: [
        "Alle sikkerhetshendelser meldes umiddelbart til politi og registreres i avvikssystemet.",
        "Ettervern iverksettes samme dag for berørte ansatte.",
      ],
      revisjon: "Revideres årlig og etter sikkerhetshendelser.",
      kilder: [
        "AML § 4-3 (3) – vold og trusler",
        "AML § 3-1 – systematisk HMS-arbeid",
        "IK-HMS § 5",
        "Finansnæringens Fellesorganisasjon – sikkerhetsveiledning",
      ],
    }),
  },

  // ── AV-installasjon og telekom ─────────────────────────────────────────
  {
    title: "Sikker installasjon og montasje – arbeid i høyden",
    description: "Rutine for sikker utførelse av montasje- og installasjonsarbeid i høyden, inkludert fallsikring og SJA.",
    category: "MONTASJE",
    legalReference: "Forskrift om utførelse av arbeid kap. 17, AML § 3-2",
    industryScope: ["av_installation", "telecom"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forhindre fallulykker og sikre trygg gjennomføring av montasje- og installasjonsarbeid i høyden.",
      omfang: "Gjelder alt arbeid over 2 meter hvor det er fare for fall.",
      ansvar: [
        "Arbeidsgiver: sørge for godkjent utstyr og opplæring i arbeid i høyden.",
        "Prosjektleder/bas: gjennomføre SJA (Sikker Jobb Analyse) før oppstart.",
        "Montør: bruke pålagt fallsikringsutstyr og melde usikre forhold.",
      ],
      gjennomforing: [
        "Gjennomfør SJA før alt arbeid i høyden – dokumenteres skriftlig.",
        "Bruk kollektive sikringstiltak først: rekkverk, stillas, lift.",
        "Når kollektive tiltak ikke er mulig: bruk personlig fallsikringsutstyr (sele, line, falldempere).",
        "Kontroller stige, lift og stillas før bruk – sjekk godkjenning og tilstand.",
        "Sørg for at alle montører har dokumentert opplæring i bruk av fallsikring.",
        "Sperre av område under arbeid i høyden for å beskytte forbipasserende.",
      ],
      dokumentasjon: [
        "SJA-skjema – signert av alle involverte.",
        "Sertifikater og opplæringsbevis for arbeid i høyden.",
        "Inspeksjonslogg for fallsikringsutstyr.",
      ],
      avvikOppfolging: [
        "Nestenulykker og farlige forhold meldes i avvikssystemet.",
        "Gjentatte avvik fører til stans og gjennomgang av rutiner.",
      ],
      revisjon: "Revideres årlig og etter alvorlige hendelser.",
      kilder: [
        "Forskrift om utførelse av arbeid kap. 17 – arbeid i høyden",
        "AML § 3-2 – opplæring",
        "Arbeidstilsynet: arbeid i høyden",
      ],
    }),
  },
  {
    title: "Elektrosikkerhet ved AV- og telekominstallasjon",
    description: "Rutine for sikker håndtering av elektrisk utstyr og kabling ved AV- og telekominstallasjoner.",
    category: "ELEKTRO",
    legalReference: "FSE § 5, NEK 400, AML § 3-2",
    industryScope: ["av_installation", "telecom"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forebygge elektriske ulykker ved installasjon, vedlikehold og feilsøking av AV- og telekomutstyr.",
      omfang: "Gjelder alt arbeid på eller nær elektriske installasjoner, kabling og utstyr.",
      ansvar: [
        "Arbeidsgiver: sikre at kun kvalifisert personell utfører elektrisk arbeid.",
        "Installatør/montør: følge FSE og bruke pålagt verneutstyr.",
        "Prosjektleder: verifisere at nødvendige tillatelser og kvalifikasjoner er på plass.",
      ],
      gjennomforing: [
        "Kun kvalifisert personell (jf. FSE § 5) utfører arbeid på spenningssatte anlegg.",
        "Gjennomfør risikovurdering før arbeid nær eksisterende elektriske installasjoner.",
        "Bruk spenningsprøver og jording ved arbeid på frakoblede anlegg.",
        "Merk kabler og koblinger tydelig etter NEK 400 og gjeldende standarder.",
        "Bruk isolert verktøy og personlig verneutstyr (isolerende hansker, vernebriller).",
        "Sørg for tilgjengelig førstehjelpsutstyr tilpasset elektriske skader.",
      ],
      dokumentasjon: [
        "FSE-sertifikater og fagbrev for alt personell.",
        "Samsvarserklæring for utførte installasjoner.",
        "Inspeksjons- og vedlikeholdslogg.",
      ],
      avvikOppfolging: [
        "Elektriske hendelser og nestenulykker meldes umiddelbart.",
        "DSB varsles ved alvorlige elektriske ulykker.",
      ],
      revisjon: "Revideres årlig og ved endring i forskrifter eller utstyrspark.",
      kilder: [
        "FSE – Forskrift om sikkerhet ved arbeid i og drift av elektriske anlegg",
        "NEK 400 – Elektroteknisk norm",
        "AML § 3-2 – opplæring",
      ],
    }),
  },

  // ── Renhold ────────────────────────────────────────────────────────────
  {
    title: "Kjemikaliehåndtering og HMS-datablad i renhold",
    description: "Rutine for sikker håndtering, oppbevaring og merking av kjemikalier brukt i renholdsarbeid.",
    category: "KJEMIKALIER",
    legalReference: "Forskrift om utførelse av arbeid kap. 3, AML § 3-2, IK-HMS § 5",
    industryScope: ["cleaning"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre trygg bruk av rengjøringsmidler og kjemikalier, og forebygge helseskader ved eksponering.",
      omfang: "Gjelder alle renholdsarbeidere og alt kjemikalierelatert arbeid.",
      ansvar: [
        "Arbeidsgiver: holde oppdatert stoffkartotek og sørge for opplæring.",
        "HMS-ansvarlig: gjennomgå sikkerhetsdatablad og risikovurderinger.",
        "Renholdsarbeider: følge bruksanvisninger og bruke pålagt verneutstyr.",
      ],
      gjennomforing: [
        "Før stoffkartotek med sikkerhetsdatablad for alle kjemikalier i bruk.",
        "Gi opplæring i lesing og bruk av sikkerhetsdatablad ved ansettelse.",
        "Bruk verneutstyr som angitt i datablad: hansker, vernebriller, åndedrettsvern.",
        "Oppbevar kjemikalier i originalemballasje med tydelig merking – aldri i matbeholdere.",
        "Forbud mot blanding av kjemikalier uten skriftlig godkjenning.",
        "Sørg for god ventilasjon ved bruk av sterke rengjøringsmidler.",
      ],
      dokumentasjon: [
        "Stoffkartotek – oppdatert og tilgjengelig for alle ansatte.",
        "Opplæringslogg for kjemikaliehåndtering.",
        "Risikovurdering ved innføring av nye produkter.",
      ],
      avvikOppfolging: [
        "Uhell med kjemikalier meldes umiddelbart og registreres i avvikssystemet.",
        "Førstehjelp iverksettes iht. sikkerhetsdatablad.",
      ],
      revisjon: "Revideres årlig og ved innføring av nye kjemikalier.",
      kilder: [
        "Forskrift om utførelse av arbeid kap. 3 – kjemisk og biologisk helsefare",
        "AML § 3-2 – opplæring",
        "IK-HMS § 5 – krav til internkontroll",
      ],
    }),
  },
  {
    title: "Alenearbeid og biologisk risiko i renhold",
    description: "Rutine for håndtering av alenearbeid, smittevern og nødprosedyrer for renholdsarbeidere.",
    category: "ALENEARBEID",
    legalReference: "AML § 4-1, AML § 4-3, IK-HMS § 5",
    industryScope: ["cleaning"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Ivareta sikkerheten til renholdsarbeidere som jobber alene, og forebygge biologisk smitterisiko.",
      omfang: "Gjelder alle renholdsoppdrag hvor ansatte arbeider alene eller utenfor ordinær arbeidstid.",
      ansvar: [
        "Arbeidsgiver: risikovurdere alenearbeid og etablere innsjekksrutiner.",
        "Driftsleder: følge opp at innsjekk gjennomføres.",
        "Ansatt: følge inn-/utsjekksrutiner og melde avvik.",
      ],
      gjennomforing: [
        "Gjennomfør risikovurdering av alle arbeidsplasser med alenearbeid.",
        "Etabler inn- og utsjekkssystem: SMS, app eller telefonsamtale ved start og slutt.",
        "Sørg for at ansatte har mobiltelefon og kjenner nødnumre.",
        "Gi opplæring i smittevern: bruk av hansker, munnbind ved behov, håndvask.",
        "Sørg for tilgang til førstehjelpsutstyr på alle arbeidsplasser.",
        "Etabler rutine for varsling ved manglende innsjekk – eskaleringsprosedyre.",
      ],
      dokumentasjon: [
        "Risikovurdering for alenearbeid – per arbeidsplass.",
        "Logg over inn- og utsjekkinger.",
        "Opplæringsdokumentasjon for smittevern.",
      ],
      avvikOppfolging: [
        "Manglende innsjekk følges opp umiddelbart.",
        "Hendelser ved alenearbeid registreres i avvikssystemet.",
      ],
      revisjon: "Revideres årlig eller ved endring av oppdrag/arbeidssted.",
      kilder: [
        "AML § 4-1 – krav til arbeidsmiljøet",
        "AML § 4-3 – psykososialt arbeidsmiljø",
        "IK-HMS § 5",
        "Arbeidstilsynet: alenearbeid",
      ],
    }),
  },

  // ── Vakt og sikkerhet ──────────────────────────────────────────────────
  {
    title: "Vold, trusler og nattarbeid i vaktvirksomhet",
    description: "Rutine for håndtering av vold og trusler, konfliktsituasjoner og nattarbeid for vektere og sikkerhetspersonell.",
    category: "VAKT_SIKKERHET",
    legalReference: "AML § 4-3 (3), AML § 10-11, Vaktvirksomhetsloven",
    industryScope: ["security"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forebygge vold og trusler mot vektere, og sikre forsvarlige arbeidsforhold ved nattarbeid.",
      omfang: "Gjelder alle ansatte som utfører vakt- og sikkerhetsoppdrag.",
      ansvar: [
        "Arbeidsgiver: risikovurdere oppdrag og sørge for opplæring i konflikthåndtering.",
        "Oppdragsleder: fordele oppdrag etter risikonivå og kompetanse.",
        "Vekter: følge konflikthåndteringsprosedyrer og rapportere hendelser.",
      ],
      gjennomforing: [
        "Gjennomfør risikovurdering for hvert oppdrag – kategoriser etter trusselnivå.",
        "Gi alle vektere opplæring i konflikthåndtering og deeskaleringsteknikker.",
        "Alenearbeid på natt: sørg for kommunikasjonsutstyr og innsjekksrutine.",
        "Overhold arbeidstidsregler for nattarbeid (AML § 10-11): maks 8 timer per 24 timer.",
        "Etabler prosedyre ved voldshendelse: trekk deg unna, varsle, dokumenter.",
        "Tilby ettervern etter alvorlige hendelser: debriefing, psykologbistand, fri.",
      ],
      dokumentasjon: [
        "Risikovurdering per oppdrag.",
        "Opplæringsbevis i konflikthåndtering (Vaktvirksomhetsloven krav).",
        "Hendelsesrapporter for vold og trusler.",
        "Arbeidstidsregistrering med nattarbeidsoversikt.",
      ],
      avvikOppfolging: [
        "Alle volds- og trusselhendelser meldes umiddelbart og registreres.",
        "Ettervern iverksettes innen 24 timer for berørte.",
      ],
      revisjon: "Revideres årlig og etter alvorlige hendelser.",
      kilder: [
        "AML § 4-3 (3) – vold og trusler",
        "AML § 10-11 – nattarbeid",
        "Vaktvirksomhetsloven",
        "Arbeidstilsynet: vold og trusler i arbeidslivet",
      ],
    }),
  },

  // ── Bemanning og vikarbyrå ─────────────────────────────────────────────
  {
    title: "HMS-opplæring og ansvarsfordeling for innleid personell",
    description: "Rutine for HMS-opplæring, ansvarsfordeling og dokumentasjon ved utleie av arbeidskraft.",
    category: "INNLEIE",
    legalReference: "AML § 2-2, AML § 3-2, Forskrift om systematisk HMS § 5",
    industryScope: ["staffing"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre at innleid personell får nødvendig HMS-opplæring og at ansvaret mellom utleier og innleier er tydelig.",
      omfang: "Gjelder alle ansatte som leies ut til oppdrag hos innleiebedrifter.",
      ansvar: [
        "Bemanningsbyrå (utleier): gi generell HMS-opplæring og sikre at ansatte er kvalifisert.",
        "Innleiebedrift: gi arbeidsplassspesifikk HMS-opplæring og inkludere innleid i vernerunder.",
        "Den ansatte: delta i opplæring og følge gjeldende HMS-rutiner på arbeidsplassen.",
      ],
      gjennomforing: [
        "Gi grunnleggende HMS-opplæring til alle ansatte før første oppdrag.",
        "Avklar ansvarsfordeling skriftlig med innleiebedrift: hvem dekker hva.",
        "Sørg for at innleid personell får stedspesifikk opplæring: rømningsveier, verneombud, førstehjelp.",
        "Følg opp at innleiebedriften ivaretar innleids arbeidsmiljø (AML § 2-2).",
        "Dokumenter all opplæring og sertifikater som kreves for oppdraget.",
        "Gjennomfør oppfølgingssamtaler med utleid personell om arbeidsmiljøet.",
      ],
      dokumentasjon: [
        "Opplæringslogg – generell og oppdragsspesifikk.",
        "Skriftlig avtale om ansvarsfordeling mellom utleier og innleier.",
        "Kopi av nødvendige sertifikater og kvalifikasjonsbevis.",
      ],
      avvikOppfolging: [
        "Avvik og HMS-hendelser hos innleiebedriften varsles umiddelbart til utleier.",
        "Begge parter behandler avviket i sine respektive systemer.",
      ],
      revisjon: "Revideres årlig og ved endring av oppdragstyper.",
      kilder: [
        "AML § 2-2 – arbeidsgivers plikter overfor innleid",
        "AML § 3-2 – opplæring",
        "Forskrift om systematisk HMS § 5",
      ],
    }),
  },

  // ── Arkitektur / design ────────────────────────────────────────────────
  {
    title: "HMS ved befaring og byggeplassbesøk",
    description: "Rutine for sikker gjennomføring av befaringer og byggeplassbesøk for arkitekter og rådgivere.",
    category: "BEFARING",
    legalReference: "Byggherreforskriften § 13, AML § 3-2",
    industryScope: ["architecture"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre at ansatte i arkitekt- og rådgivningsfirma er trygge ved befaring og besøk på byggeplasser.",
      omfang: "Gjelder alle ansatte som besøker byggeplasser, anleggsområder eller prosjektlokaliteter.",
      ansvar: [
        "Arbeidsgiver: sørge for verneutstyr og opplæring i HMS ved befaring.",
        "Prosjektleder: innhente informasjon om SHA-plan og stedlige regler før besøk.",
        "Den ansatte: bruke pålagt verneutstyr og følge byggeplassens regler.",
      ],
      gjennomforing: [
        "Innhent gjeldende SHA-plan og stedlige HMS-regler før befaring.",
        "Sørg for at alle som besøker bygge-/anleggsplass har godkjent verneutstyr: hjelm, vernesko, synlighetsvest.",
        "Gjennomfør kort risikovurdering før befaring – identifiser farer på stedet.",
        "Gi nyansatte opplæring i HMS ved befaring som del av onboarding.",
        "Meld fra til prosjektleder eller byggeleder om observerte farlige forhold.",
        "Dokumenter befaring med dato, deltakere og eventuelle observasjoner.",
      ],
      dokumentasjon: [
        "Befaringslogg med dato, sted og deltakere.",
        "Oversikt over utlevert verneutstyr.",
        "Opplæringsdokumentasjon for HMS ved befaring.",
      ],
      avvikOppfolging: [
        "Farlige forhold observert under befaring meldes til byggeleder og registreres i avvikssystemet.",
        "Manglende verneutstyr – befaring utsettes.",
      ],
      revisjon: "Revideres årlig eller ved endring av forskrifter.",
      kilder: [
        "Byggherreforskriften § 13 – koordinators plikter",
        "AML § 3-2 – opplæring",
        "Arbeidstilsynet: byggherreforskriften",
      ],
    }),
  },

  // ── Kultur, idrett og underholdning ────────────────────────────────────
  {
    title: "Rigging, scenearbeid og publikumssikkerhet",
    description: "Rutine for sikker rigging, scenearbeid og ivaretakelse av publikumssikkerhet ved arrangementer.",
    category: "ARRANGEMENT",
    legalReference: "AML § 3-1, Forskrift om utførelse av arbeid, Brann- og eksplosjonsvernloven",
    industryScope: ["culture_sport"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Sikre trygg gjennomføring av rigging og scenearbeid, og ivareta publikums sikkerhet ved arrangementer.",
      omfang: "Gjelder alt arbeid knyttet til opprigging, gjennomføring og nedrigging av arrangementer.",
      ansvar: [
        "Arrangør/produsent: overordnet ansvar for HMS og publikumssikkerhet.",
        "Riggansvarlig: lede rigging, gjennomføre SJA og sikre at utstyr er kontrollert.",
        "Alle riggearbeidere: følge sikkerhetsregler og bruke verneutstyr.",
      ],
      gjennomforing: [
        "Gjennomfør SJA (Sikker Jobb Analyse) før all rigging og nedrigging.",
        "Bruk fallsikring ved alt arbeid i høyden – truss, rigg, lysbroer.",
        "Kontroller tunge løft: bruk løfteutstyr, maks løftevekt, riktig løfteteknikk.",
        "Gjennomfør støyvurdering for personell nær scene – bruk hørselsvern over 85 dB.",
        "Etabler publikumsbarrierer, nødutganger og skilting i samarbeid med brannvesen.",
        "Utarbeid og øv på evakueringsplan – alle ansatte skal kjenne sin rolle.",
        "Sørg for at brannslokningsutstyr og førstehjelpsutstyr er tilgjengelig og bemannet.",
      ],
      dokumentasjon: [
        "SJA-skjema for rigging og nedrigging.",
        "Evakueringsplan godkjent av brannmyndighet.",
        "Sertifikater for løfteutstyr og riggpersonell.",
        "Støymålinger ved relevante arrangementer.",
      ],
      avvikOppfolging: [
        "Hendelser under arrangementet meldes umiddelbart til arrangøransvarlig.",
        "Alvorlige hendelser meldes til Arbeidstilsynet og politiet.",
      ],
      revisjon: "Revideres etter hvert større arrangement og ellers årlig.",
      kilder: [
        "AML § 3-1 – systematisk HMS-arbeid",
        "Forskrift om utførelse av arbeid – arbeid i høyden, tunge løft",
        "Brann- og eksplosjonsvernloven",
        "Arbeidstilsynet: arrangement og festivaler",
      ],
    }),
  },

  // ── Frisør, velvære og personlig tjenesteyting ─────────────────────────
  {
    title: "Kjemisk eksponering og allergihåndtering i frisør/velvære",
    description: "Rutine for sikker håndtering av kjemikalier, forebygging av allergi og ivaretakelse av ventilasjon i frisør- og velværevirksomhet.",
    category: "KJEMIKALIER",
    legalReference: "Forskrift om utførelse av arbeid kap. 3, AML § 4-5, REACH",
    industryScope: ["personal_services"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forebygge kjemisk eksponering, allergier og hudskader hos ansatte i frisør- og velværebransjen.",
      omfang: "Gjelder all håndtering av hårfarger, permanentvæske, desinfeksjonsmidler og andre kjemiske produkter.",
      ansvar: [
        "Arbeidsgiver: opprettholde stoffkartotek, sørge for ventilasjon og verneutstyr.",
        "HMS-ansvarlig: gjennomføre risikovurdering ved nye produkter.",
        "Ansatte: bruke verneutstyr og melde allergiske reaksjoner.",
      ],
      gjennomforing: [
        "Før stoffkartotek med oppdaterte sikkerhetsdatablad for alle kjemiske produkter.",
        "Gjennomfør risikovurdering før innføring av nye produkter (REACH-vurdering).",
        "Bruk vernehansker (nitril) ved all kjemisk behandling – bytt hansker mellom kunder.",
        "Sørg for punktavsug/avtrekk ved blandestasjoner for hårfarge og permanentvæske.",
        "Gi opplæring i allergisymptomer og førstehjelp ved kjemisk eksponering.",
        "Tilby helseundersøkelse for ansatte med hyppig kjemikaliekontakt.",
      ],
      dokumentasjon: [
        "Stoffkartotek – tilgjengelig digitalt og fysisk.",
        "Risikovurdering for kjemiske produkter.",
        "Logg over helseundersøkelser og eventuelle allergidiagnoser.",
      ],
      avvikOppfolging: [
        "Allergiske reaksjoner og kjemikaliehendelser meldes og registreres.",
        "Produkt erstattes med mindre skadelig alternativ der mulig (substitusjonsplikten).",
      ],
      revisjon: "Revideres årlig og ved innføring av nye produkter.",
      kilder: [
        "Forskrift om utførelse av arbeid kap. 3 – kjemisk helsefare",
        "AML § 4-5 – kjemisk og biologisk helsefare",
        "REACH-forordningen – kjemikalieregulering",
        "Arbeidstilsynet: frisørarbeid og kjemikalier",
      ],
    }),
  },
  {
    title: "Ergonomi og belastningsforebygging i frisør/velvære",
    description: "Rutine for forebygging av belastningsskader ved stående arbeid og repetitive bevegelser i frisør- og velværebransjen.",
    category: "ERGONOMI",
    legalReference: "AML § 4-4, Forskrift om utforming og innretning av arbeidsplasser",
    industryScope: ["personal_services"],
    reviewIntervalMonths: 12,
    content: createContent({
      formaal: "Forebygge muskel- og skjelettplager hos frisører og velværearbeidere gjennom ergonomisk tilpasning.",
      omfang: "Gjelder alle ansatte som utfører stående arbeid, klipping, behandlinger og massasje.",
      ansvar: [
        "Arbeidsgiver: tilby ergonomisk utstyr og tilrettelegge for variasjon.",
        "HMS-ansvarlig: gjennomføre arbeidsplassvurdering.",
        "Ansatte: melde plager tidlig og følge ergonomiske anbefalinger.",
      ],
      gjennomforing: [
        "Tilby justerbare stoler for kunder og arbeidsstoler/sadelseter for ansatte.",
        "Sørg for riktig arbeidshøyde – juster kundestoler fremfor å bøye seg.",
        "Varier arbeidsoppgaver gjennom dagen – unngå langvarig repetitivt arbeid.",
        "Gjennomfør ergonomisk opplæring ved ansettelse og årlig oppfriskning.",
        "Legg inn pauser og tøyeøvelser – minimum 10 min per 2 timers arbeid.",
        "Tilby bedriftshelsetjeneste for ansatte med muskel-/skjelettplager.",
      ],
      dokumentasjon: [
        "Arbeidsplassvurdering – signert.",
        "Opplæringslogg for ergonomi.",
        "Eventuell tilretteleggingsdokumentasjon.",
      ],
      avvikOppfolging: [
        "Plager meldes tidlig via avvikssystemet eller til leder.",
        "Tilpasning iverksettes innen 14 dager.",
      ],
      revisjon: "Revideres årlig eller ved endring av arbeidsoppgaver/utstyr.",
      kilder: [
        "AML § 4-4 – fysisk arbeidsmiljø",
        "Forskrift om utforming og innretning av arbeidsplasser",
        "Arbeidstilsynet: ergonomi i frisørbransjen",
      ],
    }),
  },
];

export const GLOBAL_ROUTINE_TEMPLATE_LIBRARY: ReadonlyArray<RoutineTemplateLibraryEntry> = [
  ...commonTemplates,
  ...industrySpecificTemplates,
  ...newIndustryTemplates,
  ...hotelRestaurantTemplates,
];

export function getGlobalRoutineTemplateLibrary(): RoutineTemplateLibraryEntry[] {
  return [...GLOBAL_ROUTINE_TEMPLATE_LIBRARY];
}
