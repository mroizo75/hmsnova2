/**
 * Bransjespesifikke HMS-risikoer
 * 
 * Forhåndsdefinerte risikoer som automatisk legges inn i risikovurderingen
 * basert på bedriftens bransje.
 * 
 * Format:
 * - hazard: Fare/risiko
 * - severity: Alvorlighetsgrad (1-5)
 * - probability: Sannsynlighet (1-5)
 * - riskScore: S x P (beregnes automatisk)
 * - riskLevel: LAV (1-3), MIDDELS (4-9), HØY (10-15), KRITISK (16-25)
 * - measures: Foreslåtte tiltak
 */

export type Risk = {
  hazard: string;
  severity: number;
  probability: number;
  riskScore: number;
  riskLevel: "LAV" | "MIDDELS" | "HØY" | "KRITISK";
  measures: string[];
};

export type IndustryRisks = {
  [key: string]: Risk[];
};

// Helper function to calculate risk level
function getRiskLevel(score: number): Risk["riskLevel"] {
  if (score <= 3) return "LAV";
  if (score <= 9) return "MIDDELS";
  if (score <= 15) return "HØY";
  return "KRITISK";
}

function createRisk(hazard: string, severity: number, probability: number, measures: string[]): Risk {
  const riskScore = severity * probability;
  return {
    hazard,
    severity,
    probability,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    measures,
  };
}

export const INDUSTRY_RISKS: IndustryRisks = {
  // ═══════════════════════════════════════════════════════════════
  // BYGG OG ANLEGG (25 risikoer)
  // ═══════════════════════════════════════════════════════════════
  CONSTRUCTION: [
    createRisk("Fall fra høyde", 5, 3, [
      "Bruk fallsikring ved arbeid over 2 meter",
      "Sikre alle åpninger med rekkverk eller nett",
      "Opplæring i bruk av sikringsutstyr",
      "Daglig inspeksjon av sikringsutstyr",
    ]),
    createRisk("Maskinklemming", 4, 2, [
      "Opplæring i maskinsikkerhet",
      "Vedlikehold av sikkerhetsutstyr på maskiner",
      "Bruk vernehansker",
      "Aldri omgå sikkerhetssperrer",
    ]),
    createRisk("Elektriske anlegg", 5, 2, [
      "Kun autorisert elektropersonell arbeider med elektriske anlegg",
      "Spenningssøking før arbeid",
      "Bruk isolert verktøy",
      "Skilting av elektriske anlegg",
    ]),
    createRisk("Tungt løft og ergonomi", 3, 4, [
      "Opplæring i riktig løfteteknikk",
      "Bruk hjelpemidler (kran, truck, etc.)",
      "To-manns løft over 25 kg",
      "Varierte arbeidsoppgaver",
    ]),
    createRisk("Støy", 2, 5, [
      "Bruk hørselsvern ved støynivå over 80 dB",
      "Støymåling på arbeidsplassen",
      "Velg stillegående verktøy når mulig",
      "Begrens eksponeringstid",
    ]),
    createRisk("Støv og partikler", 3, 4, [
      "Bruk åndedrettsvern (P3-maske ved sliping/boring)",
      "Våtsliping når mulig",
      "God ventilasjon",
      "Opprydding med støvsuger (ikke feie)",
    ]),
    createRisk("Kjemikalier", 4, 3, [
      "Bruk vernehansker og eventuelt åndedrettsvern",
      "Les databladet (SDS) før bruk",
      "God ventilasjon",
      "Oppbevaring i godkjente beholdere",
    ]),
    createRisk("Trafikk på byggeplass", 4, 3, [
      "Skilting og avgrensning av farlige områder",
      "Refleksvest for alle",
      "Bakkemann ved rygging",
      "Fartsbegrensning på byggeplass",
    ]),
    createRisk("Graving - sammenrasing", 5, 2, [
      "Sperring av grøftekant minimum 1 meter",
      "Skråning eller avstiving av grøft",
      "Kontroll av undergrunn før graving",
      "Ikke opphold i grøft uten sikring",
    ]),
    createRisk("Arbeid med varmt arbeid", 5, 2, [
      "Varmt arbeid-tillatelse før oppstart",
      "Brannslokkingsutstyr tilgjengelig",
      "Brannovervåking under og etter arbeid (1 time)",
      "Fjern brennbart materiale",
    ]),
    createRisk("Fallende gjenstander", 4, 3, [
      "Bruk hjelm i området",
      "Sikring av verktøy og materiell i høyden",
      "Avgrensning under arbeid i høyden",
      "Materiell nedsenking med kran/tau",
    ]),
    createRisk("Sammenrasing av konstruksjoner", 5, 2, [
      "Faglig kontroll av bærekonstruksjoner",
      "Midlertidig avstiving",
      "Varsling ved fare for ras",
      "Kompetent personell på arbeidet",
    ]),
    createRisk("Asbest", 5, 2, [
      "Asbestkartotek før riving/rehabilitering",
      "Kun sertifisert firma fjerner asbest",
      "Markering av asbestområder",
      "Personlig verneutstyr (åndedrettsvern, dress)",
    ]),
    createRisk("Vær og føre - vinter", 3, 4, [
      "Strøing og måking av ferdselsveier",
      "Fjern is fra stilas og arbeidsdekk",
      "Ekstra forsiktighet ved glatte forhold",
      "Varmepauser ved kulde",
    ]),
    createRisk("Arbeid alene", 3, 3, [
      "Unngå arbeid alene ved risikofylte oppgaver",
      "Sjekk inn/ut rutine",
      "Mobil tilgjengelig",
      "Nødrutiner på plass",
    ]),
    createRisk("Stillas", 5, 3, [
      "Kun fagpersonell monterer/endrer stillas",
      "Grønt kort (godkjenning) før bruk",
      "Inspeksjon etter vær/påkjørsel",
      "Rekkverk på alle frie kanter",
    ]),
    createRisk("Klatring på stige", 4, 3, [
      "Stige skal sikres mot utglidning",
      "Tre-punkts kontakt ved klatring",
      "Ikke arbeid fra stige - bruk stillas/lift",
      "Inspeksjon av stige før bruk",
    ]),
    createRisk("Vibrasjon", 2, 4, [
      "Bruk antivibrasjonsverktøy",
      "Begrens eksponeringstid",
      "Varme pauser (bedre blodsirkulasjon)",
      "Riktig vedlikehold av verktøy",
    ]),
    createRisk("Dårlig belysning", 2, 4, [
      "God arbeidsbelysning (minimum 200 lux)",
      "Hodely kt ved behov",
      "Ekstra belysning ved kritiske oppgaver",
      "Jevnlig vask av vinduer/lamper",
    ]),
    createRisk("Skarpe gjenstander - kutt/stikk", 3, 4, [
      "Bruk skjærebeskyttende hansker",
      "Forsiktig håndtering av skarpe kanter",
      "Ryddig arbeidsplass",
      "Førstehjelpsutstyr tilgjengelig",
    ]),
    createRisk("Brann", 4, 2, [
      "Røykvarsler og slokkeutstyr på plass",
      "Rømningsveier merket og fri",
      "Varmt arbeid-tillatelse",
      "Opprydding av brennbart materiale",
    ]),
    createRisk("Orden og ryddighet", 2, 5, [
      "Daglig opprydding",
      "Materiell stablet forsvarlig",
      "Ferdselsveier fri",
      "Avfallshåndtering",
    ]),
    createRisk("Arbeid i kalde/varme omgivelser", 3, 3, [
      "Temperaturmåling på arbeidsplassen",
      "Varmepauser ved kulde",
      "Tilstrekkelig væskeinntak ved varme",
      "Riktig arbeidsklær etter temperatur",
    ]),
    createRisk("Begrenset plass - klemfare", 4, 2, [
      "Planlegging av arbeid i trange rom",
      "Sikring av maskiner/utstyr",
      "Kommunikasjon ved flermannsbetjening",
      "Varsku ved bevegelse",
    ]),
    createRisk("Psykososialt - stress og belastning", 2, 3, [
      "Realistiske tidsfrister",
      "Mulighet for medvirkning",
      "Støtte fra leder",
      "Gode pauseforhold",
    ]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // HELSEVESEN (18 risikoer)
  // ═══════════════════════════════════════════════════════════════
  HEALTHCARE: [
    createRisk("Smitterisiko", 4, 4, [
      "Bruk smittevernutstyr (hansker, munnbind, frakk)",
      "Håndhygiene etter hver pasientkontakt",
      "Vaksinering mot relevante sykdommer",
      "Rutiner for smitteisolering",
    ]),
    createRisk("Ergonomi - tunge løft av pasienter", 3, 5, [
      "Opplæring i riktig løfteteknikk",
      "Bruk hjelpemidler (lifter, glidematter)",
      "To-manns løft ved behov",
      "Pasienter skal bidra så mye som mulig",
    ]),
    createRisk("Vold og trusler", 4, 3, [
      "Opplæring i konflikthåndtering",
      "Risikovurdering av pasienter",
      "Alarmordning tilgjengelig",
      "To personer ved risikosituasjoner",
    ]),
    createRisk("Stikkskader - nåler og skarpe instrumenter", 4, 3, [
      "Bruk sikkerhetsprodukter (retraksjonsnål)",
      "Aldri sett lokk på brukt nål",
      "Kanylebøtte lett tilgjengelig",
      "Vaksinering mot hepatitt B",
    ]),
    createRisk("Arbeidstid - skift og nattarbeid", 2, 5, [
      "Jevnlig vurdering av bemanningsplan",
      "Begrens antall nattevakter på rad",
      "Mulighet for hvile under vakt",
      "Tilrettelegging ved behov",
    ]),
    createRisk("Kjemikalier - desinfeksjon og legemidler", 3, 3, [
      "Bruk vernehansker",
      "God ventilasjon ved bruk",
      "Les databladet (SDS)",
      "Lukket håndtering av cytostatika",
    ]),
    createRisk("Psykososialt - høyt tempo og emosjonelle belastninger", 2, 5, [
      "Tilstrekkelig bemanning",
      "Kollegastøtte og veiledning",
      "Debriefing etter vanskelige hendelser",
      "Tilgang til bedriftshelsetjeneste",
    ]),
    createRisk("Allergener - latex, desinfeksjon", 3, 2, [
      "Bruk lateksfrie hansker",
      "Alternativ til parfymert desinfeksjon",
      "Kartlegging av allergi hos ansatte",
      "Tilrettelegging ved allergi",
    ]),
    createRisk("Biologisk materiale - blod, kroppsv æsker", 4, 4, [
      "Bruk hansker og eventuelt vernebriller",
      "Forsiktig håndtering",
      "Rutine ved eksponering",
      "Vaksinering",
    ]),
    createRisk("Støy - alarmer og utstyr", 2, 4, [
      "Justering av alarmvolum",
      "Hørselsvern ved spesielt støyende oppgaver",
      "Rolige pauserom",
      "Reduksjon av unødvendig støy",
    ]),
    createRisk("Glatte gulv - fall", 3, 3, [
      "Forsvarlig fottøy",
      "Umiddelbar opprydding ved søl",
      "Skilting ved vått gulv",
      "Jevnlig vedlikehold av gulv",
    ]),
    createRisk("Belastning - statisk arbeidsstilling", 2, 4, [
      "Varierte arbeidsoppgaver",
      "Ergonomisk arbeidsplass",
      "Pauser med tøying/mobilisering",
      "Riktig arbeidshøyde",
    ]),
    createRisk("Arbeid med skjerm - dataarbeid", 2, 4, [
      "Ergonomisk arbeidsstasjon",
      "Varierte arbeidsoppgaver",
      "Pauser fra skjermarbeid",
      "Synstest ved behov",
    ]),
    createRisk("Isolasjon og ensomhet - hjemmebaserte tjenester", 2, 3, [
      "Jevnlig kontakt med kollegaer",
      "Teammøter og fagsamlinger",
      "Sosiale arrangementer",
      "Varslingsrutiner ved behov for støtte",
    ]),
    createRisk("Brann og røykutvikling", 4, 2, [
      "Røykvarsler og slokkeutstyr",
      "Rømningsveier merket og fri",
      "Evakueringsplan for pasienter",
      "Brannøvelser minimum 1x/år",
    ]),
    createRisk("Medikamentfeil", 4, 2, [
      "Dobbeltsjekk av medisiner",
      "Tydelig merking",
      "Rutiner for rapportering av avvik",
      "Opplæring i medikamenthåndtering",
    ]),
    createRisk("Pasientfall", 3, 3, [
      "Risikovurdering av fallfare",
      "Bruk hjelpemidler (gerl ender, rullatorer)",
      "Sengehest ved behov",
      "Alarm ved senga",
    ]),
    createRisk("Mangel på samhandling - kommunikasjonsfeil", 3, 3, [
      "Systematisk rapportoverlevering",
      "Tydelig dokumentasjon",
      "Teammøter og samarbeid",
      "Tilbakemeldingskultur",
    ]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // TRANSPORT OG LOGISTIKK (15 risikoer)
  // ═══════════════════════════════════════════════════════════════
  TRANSPORT: [
    createRisk("Trafikkulykker", 5, 3, [
      "Kjøretrening og opplæring",
      "Fartsbegrensning og defensive kjøring",
      "Vedlikehold av kjøretøy",
      "Hviletid og pauseregler",
    ]),
    createRisk("Tretthet - lange kjøreturer", 3, 4, [
      "Overholdelse av kjøre- og hviletidsregler",
      "Planlagt pauser hver 2. time",
      "Unngå nattekjøring når mulig",
      "Søvnhygiene og helse",
    ]),
    createRisk("Lasting og lossing - tungt løft", 4, 3, [
      "Opplæring i riktig løfteteknikk",
      "Bruk hjelpemidler (tralle, stabler)",
      "To-manns løft over 25 kg",
      "Planlegging av last",
    ]),
    createRisk("Ryggskader", 3, 4, [
      "Varierte arbeidsoppgaver",
      "Treningsprogram for rygg",
      "Ergonomisk arbeidsteknikk",
      "Tilrettelegging ved plager",
    ]),
    createRisk("Vær og føre", 4, 4, [
      "Tilpasset hastighet etter vær",
      "Vinterutstyr på kjøretøy",
      "Opplæring i vinterkjøring",
      "Utsettelse av tur ved svært dårlig vær",
    ]),
    createRisk("Lasting av farlig gods", 5, 2, [
      "ADR-sertifisering for sjåfør",
      "Riktig merking av farlig gods",
      "Sikring av last",
      "Beredskapsplan ved ulykke",
    ]),
    createRisk("Fall fra lastebil - av/på lessing", 4, 2, [
      "Bruk tre-punkts kontakt ved klatring",
      "God belysning",
      "Anti-skli belegg på trinn",
      "Unngå hopp ned fra lastebil",
    ]),
    createRisk("Klemskader - lasting", 4, 2, [
      "Varsku før lukking av dører",
      "Hold avstand til bevegelige deler",
      "Sikring av last som kan forskyve seg",
      "Bruk vernehansker",
    ]),
    createRisk("Støy i førerhus", 2, 3, [
      "Velg stillegående kjøretøy",
      "Vedlikehold av kjøretøy (eksos, motor)",
      "Hørselsvern ved behov",
      "Audiometre ved behov",
    ]),
    createRisk("Vibrasjon", 2, 4, [
      "Godt vedlikeholdt kjøretøy (dempere)",
      "Ergonomisk førersete med luftfjæring",
      "Pauser fra kjøring",
      "Varierte arbeidsoppgaver",
    ]),
    createRisk("Ensomhet og isolasjon", 2, 3, [
      "Jevnlig kontakt med kollegaer/base",
      "Sosialesamlinger",
      "Støtte ved behov",
      "Varslingsrutiner",
    ]),
    createRisk("Stress og tidspress", 2, 4, [
      "Realistiske tidsfrister for leveranser",
      "Buffer-tid i ruteplaner",
      "Støtte fra leder",
      "Fleksibilitet ved forsinkelser",
    ]),
    createRisk("Vold og trusler - møte med publikum", 3, 2, [
      "Opplæring i konflikthåndtering",
      "Alarmordning i kjøretøy",
      "To personer ved risikoutkjøring",
      "Rutiner for rapportering",
    ]),
    createRisk("Arbeid alene", 3, 3, [
      "Sjekk inn/ut rutine",
      "Mobil tilgjengelig",
      "GPS-sporing av kjøretøy",
      "Nødrutiner på plass",
    ]),
    createRisk("Brann i kjøretøy", 4, 2, [
      "Brannslokkingsutstyr i kjøretøy",
      "Vedlikehold av elektrisk anlegg",
      "Røykforbud",
      "Evakueringsplan",
    ]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // Kortere lister for andre bransjer (placeholder)
  // ═══════════════════════════════════════════════════════════════
  
  MANUFACTURING: [
    createRisk("Maskinklemming", 5, 3, ["Sikkerhetssperrer på maskiner", "Opplæring", "Verneutstyr"]),
    createRisk("Støy", 3, 5, ["Hørselsvern", "Støyreduserende tiltak"]),
    createRisk("Kjemikalier", 4, 3, ["Verneutstyr", "God ventilasjon", "SDS tilgjengelig"]),
    // ... flere risikoer
  ],

  RETAIL: [
    createRisk("Ran og tyveri", 4, 2, ["Alarm", "To personer ved åpning/stenging", "Opplæring"]),
    createRisk("Tunge løft", 3, 4, ["Hjelpemidler", "To-manns løft"]),
    // ... flere risikoer
  ],

  HOSPITALITY: [
    createRisk("Brannsikkerhet", 5, 2, ["Røykvarsler", "Slokkeutstyr", "Brannøvelser"]),
    createRisk("Kjøkkenskader - kutt/forbrenning", 3, 4, ["Verneutstyr", "Opplæring", "Førstehjelpsutstyr"]),
    // ... flere risikoer
  ],

  EDUCATION: [
    createRisk("Vold og trusler", 3, 2, ["Opplæring i konflikthåndtering", "Alarmordning"]),
    createRisk("Psykososialt - stress", 2, 4, ["Støtte fra leder", "Tilstrekkelig ressurser"]),
    // ... flere risikoer
  ],

  TECHNOLOGY: [
    createRisk("Ergonomi - skjermarbeid", 2, 5, ["Ergonomisk arbeidsplass", "Pauser", "Varierte oppgaver"]),
    createRisk("Psykososialt - stress og tidspress", 2, 4, ["Realistiske frister", "Støtte"]),
    // ... flere risikoer
  ],

  AGRICULTURE: [
    createRisk("Maskinklemming", 5, 3, ["Opplæring", "Sikkerhetsutstyr", "Aldri omgå sperrer"]),
    createRisk("Dyr - spark/bitt", 4, 3, ["Forsiktig håndtering", "Kunnskap om dyreadferd"]),
    // ... flere risikoer
  ],

  OTHER: [
    createRisk("Ergonomi", 2, 4, ["Ergonomisk arbeidsplass", "Varierte oppgaver"]),
    createRisk("Psykososialt", 2, 3, ["Støtte", "Godt arbeidsmiljø"]),
    createRisk("Brann", 3, 2, ["Røykvarsler", "Slokkeutstyr", "Rømningsveier"]),
    // ... flere risikoer
  ],

  // ═══════════════════════════════════════════════════════════════
  // KONTOR (8 risikoer)
  // ═══════════════════════════════════════════════════════════════
  OFFICE: [
    createRisk("Ergonomi – skjermarbeid", 2, 5, ["Ergonomisk arbeidsstasjon", "Hev/senk-pult", "Pauser fra skjerm hvert 45. minutt", "Synsundersøkelse annethvert år"]),
    createRisk("Inneklima – dårlig ventilasjon", 2, 4, ["Jevnlig kontroll av ventilasjonsanlegg", "Temperaturmåling", "Tilgang til frisk luft"]),
    createRisk("Psykososialt – stress og tidspress", 2, 4, ["Realistiske tidsfrister", "Medarbeidersamtaler", "Tilgang til støtteapparat"]),
    createRisk("Brann – kontorlokaler", 4, 2, ["Røykvarsler og slokkeutstyr", "Merket rømningsveier", "Brannøvelse årlig"]),
    createRisk("Fall – glatt gulv, kabler", 2, 3, ["Kabelkanaler og ryddige gangveier", "Sklisikring ved inngangspartier"]),
    createRisk("Støy – kontorlandskap", 2, 4, ["Stillerom tilgjengelig", "Støyskjerming", "Retningslinjer for støy"]),
    createRisk("Informasjonssikkerhet – datalekkasje", 3, 3, ["Tilgangsstyring og passordpolicy", "Opplæring i personvern", "Kryptering av sensitiv data"]),
    createRisk("Ensomhet og isolasjon – hjemmekontor", 2, 3, ["Jevnlig sosialt samvær", "Hybridkontor-retningslinjer", "Leder følger opp"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // RÅDGIVNING (6 risikoer)
  // ═══════════════════════════════════════════════════════════════
  CONSULTING: [
    createRisk("Ergonomi – skjermarbeid", 2, 5, ["Ergonomisk arbeidsplass", "Varierte oppgaver", "Pauser"]),
    createRisk("Psykososialt – høy arbeidsbelastning", 2, 4, ["Realistisk prosjektplanlegging", "Lederoppfølging", "Fleksibel arbeidstid"]),
    createRisk("Reiserelatert risiko", 2, 3, ["Reisepolicy", "Forsikring", "Hvile etter lange reiser"]),
    createRisk("Informasjonssikkerhet – klientdata", 3, 3, ["Tilgangsstyring", "Kryptering", "Opplæring"]),
    createRisk("Brann – kontorbygg", 4, 2, ["Røykvarsler", "Slokkeutstyr", "Rømningsveier"]),
    createRisk("Inneklima", 2, 3, ["Ventilasjonskontroll", "Temperaturmåling"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // JURIDISK (7 risikoer)
  // ═══════════════════════════════════════════════════════════════
  LEGAL: [
    createRisk("Psykososialt – krevende saker og tidspress", 3, 4, ["Sakshåndteringssystem med kapasitetsplanlegging", "Kollegastøtte", "Tilgang til bedriftshelsetjeneste"]),
    createRisk("Konfidensialitet – brudd på taushetsplikt", 4, 2, ["Sikker dokumenthåndtering", "Tilgangsstyring", "Opplæring i taushetspliktsregler"]),
    createRisk("Ergonomi – langvarig skjermarbeid", 2, 5, ["Hev/senk-pult", "Skjermpauser", "Synsundersøkelse"]),
    createRisk("Klientkonflikter og trusler", 3, 2, ["Rutiner for håndtering av truende klienter", "Alarmsystem", "Opplæring"]),
    createRisk("Informasjonssikkerhet – sensitiv data", 4, 3, ["Kryptering", "Sikker e-post", "Clean desk-policy"]),
    createRisk("Brann – kontorlokaler", 4, 2, ["Røykvarsler", "Slokkeutstyr", "Rømningsveier"]),
    createRisk("Inneklima og belysning", 2, 3, ["Ventilasjonskontroll", "Tilstrekkelig belysning"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // REGNSKAP (6 risikoer)
  // ═══════════════════════════════════════════════════════════════
  ACCOUNTING: [
    createRisk("Psykososialt – sesongstress (årsoppgjør)", 2, 5, ["Bemanningsplanlegging i høysesong", "Overtidsbegrensning", "Lederoppfølging"]),
    createRisk("Ergonomi – intensivt skjermarbeid", 2, 5, ["Ergonomisk arbeidsplass", "Regelmessige pauser", "Synsundersøkelse"]),
    createRisk("Informasjonssikkerhet – regnskapsdata", 3, 3, ["Tilgangsstyring", "Sikker lagring", "Revisjonsspor"]),
    createRisk("Brann – kontorlokaler", 4, 2, ["Røykvarsler", "Slokkeutstyr", "Rømningsveier"]),
    createRisk("Inneklima", 2, 3, ["Ventilasjonskontroll", "Temperaturregulering"]),
    createRisk("Fall – kontor", 2, 2, ["Ryddig arbeidsplass", "Kabelkanaler"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // FINANS (8 risikoer)
  // ═══════════════════════════════════════════════════════════════
  FINANCE: [
    createRisk("Ran og ransforsøk", 5, 2, ["Tidsforsinket safe", "Alarmknapp", "Ransinstruks og opplæring", "Ettervern"]),
    createRisk("Psykososialt – stressende kundesituasjoner", 2, 4, ["Konflikthåndteringsopplæring", "Debriefing", "Lederoppfølging"]),
    createRisk("Ergonomi – skjermarbeid", 2, 5, ["Ergonomisk arbeidsstasjon", "Pauser", "Varierte oppgaver"]),
    createRisk("Informasjonssikkerhet – finansdata", 4, 3, ["Sterk tilgangskontroll", "Kryptering", "Tofaktorautentisering"]),
    createRisk("Brann – forretningslokaler", 4, 2, ["Røykvarsler", "Slokkeutstyr", "Rømningsveier"]),
    createRisk("Vold og trusler fra kunder", 3, 2, ["Alarmordning", "Opplæring", "Fysisk sikring av kundemottak"]),
    createRisk("Inneklima", 2, 3, ["Ventilasjonskontroll", "Temperaturregulering"]),
    createRisk("Hvitvasking og compliance-stress", 2, 3, ["Tydelige rutiner", "Opplæring", "Verktøystøtte"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // AV-INSTALLASJON (8 risikoer)
  // ═══════════════════════════════════════════════════════════════
  AV_INSTALLATION: [
    createRisk("Fall fra høyde – stige og lift", 5, 3, ["Fallsikring", "Opplæring i bruk av stige/lift", "SJA før arbeid i høyden", "Aldri arbeid alene i høyden"]),
    createRisk("Elektrisk støt – kabling og tilkobling", 4, 3, ["Spenningsfri verifisering", "Isolert verktøy", "FSE-opplæring"]),
    createRisk("Tunge løft – AV-utstyr og rack", 3, 4, ["Hjelpemidler ved tunge løft", "To-manns løft", "Ergonomisk opplæring"]),
    createRisk("Klemskader – montering i trange rom", 3, 3, ["Planlegging av arbeidsområde", "Kommunikasjon mellom montører", "Vernehansker"]),
    createRisk("Støy – testing av lydutstyr", 2, 4, ["Hørselsvern ved testing", "Begrens eksponeringstid"]),
    createRisk("Arbeid alene – kundeinstallasjoner", 3, 3, ["Sjekk inn/ut-rutine", "Mobiltelefon", "Nødprosedyre"]),
    createRisk("Trafikk – kjøring til oppdrag", 3, 3, ["Sikker kjøring", "Vedlikehold av firmabil", "Pauser ved lang kjøring"]),
    createRisk("Støv og partikler – boring og kabling", 2, 3, ["Åndedrettsvern ved boring", "Støvavsug", "Opprydding"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // TELEKOMMUNIKASJON (8 risikoer)
  // ═══════════════════════════════════════════════════════════════
  TELECOM: [
    createRisk("Fall fra høyde – master og stolper", 5, 3, ["Fallsikring og klatresele", "Sertifisert opplæring", "SJA obligatorisk", "To-manns arbeid"]),
    createRisk("Elektrisk fare – kabler og utstyr", 4, 3, ["Spenningskontroll", "Isolert verktøy", "FSE-prosedyrer"]),
    createRisk("Graving – kabelgrøfter", 4, 2, ["Påvisning av eksisterende kabler", "Graveregler", "Sikring av grøft"]),
    createRisk("Tunge løft – utstyr og kabler", 3, 4, ["Hjelpemidler", "To-manns løft", "Ergonomi"]),
    createRisk("Alenearbeid – feltoppdrag", 3, 3, ["Sjekk inn/ut", "GPS-sporing", "Nødprosedyre"]),
    createRisk("Trafikk – arbeid langs vei", 4, 3, ["Skilting og varsling", "Refleksvest", "Trafikksikringsplan"]),
    createRisk("Vær og vind – utendørs arbeid", 3, 3, ["Værsjekk før oppdrag", "Avbryt ved sterk vind", "Riktig arbeidsklær"]),
    createRisk("Ergonomi – repetitivt arbeid", 2, 4, ["Varierte oppgaver", "Pauser", "Riktig arbeidshøyde"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // RENHOLD (8 risikoer)
  // ═══════════════════════════════════════════════════════════════
  CLEANING: [
    createRisk("Kjemikalieeksponering – rengjøringsmidler", 3, 4, ["Les sikkerhetsdatablad", "Bruk vernehansker og -briller", "Aldri bland produkter", "God ventilasjon"]),
    createRisk("Biologisk risiko – blod og kroppsvæsker", 4, 3, ["Smittevernutstyr", "Vaksinering", "Rutine ved eksponering"]),
    createRisk("Ergonomi – tunge løft og repetitivt arbeid", 3, 4, ["Hjelpemidler (mopp, tralle)", "Variasjon i oppgaver", "Opplæring i løfteteknikk"]),
    createRisk("Fall – glatte gulv og trapper", 3, 3, ["Sklisikkert fottøy", "Varsling ved vått gulv", "Forsiktighet i trapper"]),
    createRisk("Alenearbeid – kveld/natt", 3, 3, ["Sjekk inn/ut-rutine", "Kommunikasjonsmiddel", "Nødprosedyre"]),
    createRisk("Allergi og hudreaksjoner", 2, 3, ["Lateksfrie hansker", "Milde produkter", "Kartlegging av allergi"]),
    createRisk("Psykososialt – isolasjon", 2, 3, ["Jevnlig kontakt med arbeidsgiver", "Teammøter", "Sosiale samlinger"]),
    createRisk("Arbeid i kalde/varme omgivelser", 2, 3, ["Riktig arbeidsklær", "Pauser", "Væskeinntak"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // SIKKERHET/VAKTHOLD (7 risikoer)
  // ═══════════════════════════════════════════════════════════════
  SECURITY: [
    createRisk("Vold og trusler", 4, 4, ["Opplæring i konflikthåndtering", "Alarmordning", "To-manns patrulje ved høyrisiko", "Ettervern"]),
    createRisk("Nattarbeid – utmattelse", 3, 4, ["Begrenset antall nattevakter på rad", "Hvilepauser", "Helsesjekk ved nattarbeid"]),
    createRisk("Alenearbeid", 3, 4, ["Sjekk inn/ut", "GPS-sporing", "Nødknapp", "Kommunikasjonsrutine"]),
    createRisk("Kjøring – patruljebil", 3, 3, ["Sikker kjøring", "Vedlikehold", "Hvile mellom skift"]),
    createRisk("Psykososialt – belastende situasjoner", 3, 3, ["Debriefing", "Kollegastøtte", "Bedriftshelsetjeneste"]),
    createRisk("Brann – vaktlokaler", 4, 2, ["Røykvarsler", "Slokkeutstyr", "Rømningsveier"]),
    createRisk("Ergonomi – statisk arbeid", 2, 4, ["Varierte oppgaver", "Pauser", "Tilpasset arbeidsstasjon"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // BEMANNING (6 risikoer)
  // ═══════════════════════════════════════════════════════════════
  STAFFING: [
    createRisk("Mangelfull HMS-opplæring hos innleid", 4, 3, ["HMS-opplæring før oppdragsstart", "Dokumentert gjennomgang", "Ansvar utleier + innleier"]),
    createRisk("Ukjent arbeidsmiljø – varierende oppdrag", 3, 3, ["Risikovurdering per oppdrag", "Informasjon om arbeidssted", "Kontaktperson hos innleier"]),
    createRisk("Psykososialt – tilhørighet og isolasjon", 2, 3, ["Jevnlig oppfølging fra arbeidsgiver", "Inkludering hos innleier"]),
    createRisk("Ergonomi – varierende arbeidsplasser", 2, 3, ["Sjekk av arbeidsplass", "Tilpasning", "Opplæring"]),
    createRisk("Uklart ansvarsforhold", 3, 3, ["Tydelig avtale mellom utleier og innleier", "Dokumentert ansvarsfordeling"]),
    createRisk("Språkbarrierer – utenlandske vikarer", 3, 3, ["HMS-informasjon på relevant språk", "Visuell merking", "Tolk ved behov"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // ARKITEKTUR (6 risikoer)
  // ═══════════════════════════════════════════════════════════════
  ARCHITECTURE: [
    createRisk("Ergonomi – langvarig skjermarbeid", 2, 5, ["Hev/senk-pult", "Pauser", "Ergonomisk mus/tastatur"]),
    createRisk("Byggeplassbesøk – fall og fallende gjenstander", 4, 2, ["Hjelm, vernesko, refleksvest", "Følge SHA-plan", "Opplæring"]),
    createRisk("Psykososialt – prosjektpress og tidsfrister", 2, 4, ["Realistisk planlegging", "Lederoppfølging"]),
    createRisk("Brann – kontor/atelier", 4, 2, ["Røykvarsler", "Slokkeutstyr", "Rømningsveier"]),
    createRisk("Inneklima – modelleringsrom", 2, 3, ["Ventilasjon", "Støvkontroll"]),
    createRisk("Reiserelatert risiko", 2, 2, ["Reisepolicy", "Forsikring"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // MEDIA OG KOMMUNIKASJON (7 risikoer)
  // ═══════════════════════════════════════════════════════════════
  MEDIA: [
    createRisk("Ergonomi – langvarig skjermarbeid", 2, 5, ["Ergonomisk arbeidsplass", "Pauser", "Varierte oppgaver"]),
    createRisk("Psykososialt – deadlines og tidspress", 2, 4, ["Realistisk planlegging", "Fleksibilitet", "Lederoppfølging"]),
    createRisk("Feltarbeid – ulykker og uforutsette situasjoner", 3, 2, ["Risikovurdering før oppdrag", "Verneutstyr", "Nødprosedyre"]),
    createRisk("Tungt utstyr – kamera, lyd, belysning", 3, 3, ["Hjelpemidler", "To-manns løft", "Ergonomi"]),
    createRisk("Støy – lydproduksjon", 2, 3, ["Hørselsvern", "Begrens eksponering"]),
    createRisk("Brann – studio/kontor", 4, 2, ["Røykvarsler", "Slokkeutstyr", "Rømningsveier"]),
    createRisk("Informasjonssikkerhet – kildebeskyttelse", 3, 2, ["Sikker lagring", "Tilgangsstyring"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // KULTUR OG SPORT (8 risikoer)
  // ═══════════════════════════════════════════════════════════════
  CULTURE_SPORT: [
    createRisk("Fall fra høyde – rigging og scenearbeid", 5, 3, ["Fallsikring", "Sertifisert rigger", "SJA før rigging"]),
    createRisk("Tunge løft – utstyr og sceneelementer", 3, 4, ["Hjelpemidler (kran, tralle)", "To-manns løft", "Ergonomi"]),
    createRisk("Støy – konserter og arrangementer", 3, 4, ["Hørselsvern obligatorisk", "Støymåling", "Begrens eksponering"]),
    createRisk("Publikumssikkerhet – trengsel og panikk", 5, 2, ["Evakueringsplan", "Opplært vaktstyrke", "Kapasitetsstyring"]),
    createRisk("Brann – arrangement og lokaler", 5, 2, ["Røykvarsler", "Slokkeutstyr", "Merket rømningsveier", "Brannvakt"]),
    createRisk("Arbeidstid – lange arbeidsdager ved arrangement", 2, 4, ["Skiftplanlegging", "Pauser", "Hvilebestemmelser"]),
    createRisk("Elektrisk fare – midlertidige installasjoner", 4, 2, ["Kvalifisert elektriker", "Inspeksjon", "Jordfeilbryter"]),
    createRisk("Psykososialt – uregelmessig arbeid", 2, 3, ["Forutsigbar turnus", "Lederoppfølging", "Sosiale tiltak"]),
  ],

  // ═══════════════════════════════════════════════════════════════
  // PERSONLIGE TJENESTER (7 risikoer)
  // ═══════════════════════════════════════════════════════════════
  PERSONAL_SERVICES: [
    createRisk("Kjemisk eksponering – hårfarge og produkter", 3, 4, ["Bruk hansker ved fargelegging", "God ventilasjon", "Les sikkerhetsdatablad", "Allergitest ved nye produkter"]),
    createRisk("Allergiske reaksjoner – hud og luftveier", 3, 3, ["Bruk hypoallergene produkter", "Ventilasjon", "Kartlegging av allergi hos ansatte"]),
    createRisk("Ergonomi – stående arbeid og repetitive bevegelser", 2, 5, ["Regulerbar arbeidshøyde", "Ergonomisk stol", "Pauser", "Tøyeøvelser"]),
    createRisk("Hudkontakt – vann, såpe, desinfeksjon", 2, 4, ["Bruk fuktighetskrem", "Hansker ved behov", "Hudpleierutine"]),
    createRisk("Fall – vått gulv i salongen", 2, 3, ["Sklisikkert fottøy", "Umiddelbar opprydding ved søl"]),
    createRisk("Smitterisiko – kundekontakt", 3, 2, ["Hygieneregler", "Desinfeksjon av utstyr mellom kunder"]),
    createRisk("Brann – elektrisk utstyr", 4, 2, ["Kontroll av utstyr", "Røykvarsler", "Slokkeutstyr"]),
  ],
};

