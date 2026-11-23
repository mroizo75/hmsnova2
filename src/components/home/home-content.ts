export const HOME_FAQS = [
  {
    question: "Hvor lang tid tar det å komme i gang?",
    answer:
      "De fleste er ferdige på 1–2 timer. Håndbøkene er allerede skrevet, så du følger veiviseren, gjør risikovurderingen og inviterer de ansatte.",
  },
  {
    question: "Hva koster HMS Nova?",
    answer:
      "300 kr/mnd eks. mva, 3 600 kr i året, per bedrift. Ubegrenset antall brukere. AI-assistenten er 49 kr/mnd eks. mva og er av til en administrator slår den på. 14 dagers angrefrist, deretter 12 måneders binding og 3 måneders oppsigelse. Ingen oppstartskostnad.",
  },
  {
    question: "Følger håndbøkene ISO 9001 og ISO 45001?",
    answer:
      "KS-håndboken følger ISO 9001. HMS-håndboken følger ISO 45001 og internkontrollforskriften. Personalhåndboken følger arbeidsmiljøloven. Standardteksten ligger inne, og dere tilpasser det som er spesielt for bedriften.",
  },
  {
    question: "Må jeg bruke AI?",
    answer:
      "Nei. Uten AI bruker du ferdige maler og risikomatrisen selv. Med AI får du forslag til farer, tiltak, avvik og tekster. Du godkjenner, justerer eller forkaster. Tillegget koster 49 kr/mnd eks. mva.",
  },
  {
    question: "Finnes det en gratis prøveperiode?",
    answer:
      "Nei. Du har 14 dagers angrefrist fra registrering. Sier du opp skriftlig til post@hmsnova.no innen fristen, koster det ingenting.",
  },
  {
    question: "Hvor lagres dataene?",
    answer: "På servere i EU/EØS. Dataene er kryptert, og dere får databehandleravtale.",
  },
  {
    question: "Kan vi ta med HMS-arbeidet vi allerede har laget?",
    answer:
      "Ja. Risikovurdering kan lastes opp som PDF, Word eller Excel, og dere bekrefter punktene før de lagres. Ansatte importeres fra CSV eller Excel, og personaldata kan hentes fra PowerOffice. Egne dokumenter lastes opp i dokumentstyringen.",
  },
] as const;

export const HOME_STEPS = [
  {
    title: "Registrer bedriften",
    hint: "Org.nr. – resten hentes fra Brønnøysund",
    heading: "Registrer bedriften",
    body: "Skriv inn organisasjonsnummeret. Navn, adresse og bransjekode hentes automatisk fra Brønnøysundregistrene, og håndbøkene opprettes med en gang.",
    points: [
      "KS-, HMS- og Personalhåndbok opprettes ferdig utfylt",
      "Standardtekst etter ISO 9001, ISO 45001 og internkontrollforskriften",
      "Ingenting skal skrives fra bunnen",
    ],
  },
  {
    title: "Følg veiviseren",
    hint: "Bransje → lover, forskrifter og rutiner",
    heading: "Følg veiviseren",
    body: "Svar på et kort skjema om bransje og aktiviteter. Veiviseren legger inn lovene og forskriftene som gjelder dere, sammen med standard rutiner og sjekklister.",
    points: [
      "Lovregister tilpasset din bransje",
      "Standard rutiner og sjekklister",
      "Relevante bransjemoduler aktiveres",
    ],
  },
  {
    title: "Risikovurdering",
    hint: "Gjør den selv – eller med AI",
    heading: "Risikovurdering",
    body: "Fyll ut risikovurderingen på egen hånd med ferdige maler, eller aktiver AI som foreslår farer, risiko og tiltak for hver avdeling. Du godkjenner alt.",
    points: [
      "Ferdige maler og risikomatrise",
      "AI-forslag per avdeling og arbeidsoperasjon",
      "AI-tillegg: kun 49 kr/mnd",
    ],
  },
  {
    title: "Inviter ansatte",
    hint: "Systemet er klart til bruk",
    heading: "Inviter ansatte",
    body: "Legg inn avdelinger, ledere og ansatte – organisasjonskartet bygger seg selv. Inviter alle, så kan de melde avvik og signere rutiner fra mobilappen.",
    points: [
      "Organisasjonskart bygges automatisk",
      "Kan overstyres manuelt",
      "Ubegrenset antall brukere",
    ],
  },
] as const;

export const RISK_ROWS = [
  {
    fare: "Fall fra stillas",
    risiko: "Høy",
    tone: "bg-red-100 text-red-800",
    tiltak: "Daglig kontroll av stillas, sikringsutstyr ved arbeid over 2 m",
  },
  {
    fare: "Støy fra maskiner",
    risiko: "Middels",
    tone: "bg-amber-100 text-amber-800",
    tiltak: "Hørselvern påbudt, støymåling hvert år",
  },
  {
    fare: "Kjemikalier",
    risiko: "Middels",
    tone: "bg-amber-100 text-amber-800",
    tiltak: "Oppdater stoffkartotek, opplæring i sikkerhetsdatablad",
  },
  {
    fare: "Tunge løft",
    risiko: "Lav",
    tone: "bg-emerald-100 text-emerald-800",
    tiltak: "Løfteutstyr tilgjengelig, opplæring for nyansatte",
  },
] as const;

export const FEATURE_CARDS = [
  {
    id: "avvik",
    title: "Avvik og tiltak",
    chips: ["Avvik og hendelser", "Korrigerende tiltak", "Kundeklager", "Varsling"],
  },
  {
    id: "dokumentasjon",
    title: "Dokumentasjon",
    chips: ["HMS-håndbok", "Dokumentstyring", "Rutiner", "Lovregister", "Leverandører"],
  },
  {
    id: "risiko",
    title: "Risiko og arbeidsmiljø",
    chips: ["Risikovurdering", "Stoffkartotek", "Eksponeringsregister", "Vernerunder", "Psykososial kartlegging", "Beredskap"],
  },
  {
    id: "bransje",
    title: "Bransjemoduler",
    chips: ["Bygg og anlegg", "Utstyrskontroll", "El-kontroll", "Mattrygghet", "Skjenking", "Transport", "BHT og nattarbeid"],
  },
  {
    id: "organisasjon",
    title: "Organisasjon og personal",
    chips: ["Organisasjonskart", "Prosjekter", "Timeføring", "Kompetanse", "Møter", "Ledelsens gjennomgang", "Fravær", "On- og offboarding"],
  },
  {
    id: "oversikt",
    title: "Oversikt og konsern",
    chips: ["HMS-cockpit", "Digital HMS-tavle", "KPI-er", "Bransjesammenligning", "Konsernportal"],
  },
  {
    id: "plattform",
    title: "Med i plattformen",
    chips: ["Mobilapp (offline)", "Tripletex", "Påminnelser", "Tale-til-tekst (AI)", "API", "AI (tillegg)"],
  },
] as const;

export const PRICE_POINTS = [
  "Alle funksjonene",
  "KS-, HMS- og Personalhåndbok ferdig utfylt",
  "Veiviser med lover og forskrifter for din bransje",
  "Standard rutiner og sjekklister",
  "Automatisk organisasjonskart",
  "Ubegrenset antall brukere",
  "Mobilapp for iOS og Android",
  "Digital signatur",
  "Automatiske påminnelser",
  "Tripletex-integrasjon",
  "Norsk support",
] as const;
