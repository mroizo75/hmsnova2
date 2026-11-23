/**
 * SEO-optimalisert content for HMS Nova
 * Offentlig tekst om HMS Nova. Pris: 300 kr/mnd eks. mva.
 */

export const SEO_CONTENT = {
  // Hero headlines - optimalisert for søk og konvertering
  headlines: {
    main: "Hele HMS-systemet er allerede skrevet",
    alternative: [
      "Digital HMS-løsning som Faktisk Fungerer i Praksis",
      "Fra Papirrot til Digital Trygghet på 5 Minutter",
      "HMS-system Bygget for Norske Bedrifter",
    ],
  },

  // Value propositions med keywords
  valueProps: {
    primary: "KS-, HMS- og personalhåndbok er allerede skrevet. 300 kr/mnd eks. mva per bedrift, ubegrenset antall brukere.",
    secondary: [
      "Erstatt Excel-ark og papirrot med et moderne HMS-system",
      "500+ norske bedrifter stoler på HMS Nova",
      "Fra 300 kr/mnd - ingen skjulte kostnader, 12 måneders binding etter 14 dagers angrefrist",
    ],
  },

  // SEO-optimaliserte benefits
  benefits: {
    safety: {
      title: "Trygghet først",
      description: "Risikovurdering, avvik og håndbøker ligger i samme system, med standardtekst som utgangspunkt.",
    },
    compliance: {
      title: "Full compliance",
      description: "Følg alle krav i Arbeidsmiljøloven, Internkontrollforskriften og ISO 9001. Bestå revisjoner med glans.",
    },
    automation: {
      title: "Automatisering som fungerer",
      description: "Automatiske påminnelser for sertifikater, vernerunder og dokumentrevisjon. Aldri gå glipp av viktige frister.",
    },
    mobile: {
      title: "Mobil & offline",
      description: "HMS Nova fungerer offline på byggeplassen. Synkroniserer automatisk når du er tilbake online.",
    },
  },

  // Competitive advantages vs Grønn Jobb, Avonova, Kuba
  competitiveAdvantages: [
    {
      feature: "Digital signatur",
      hmsnova: "Inkludert",
      competitors: "Ekstrakostnad eller ikke tilgjengelig",
      benefit: "Spar tid og penger på papirarbeid",
    },
    {
      feature: "Oppstartskostnad",
      hmsnova: "0 kr",
      competitors: "20.000-50.000 kr",
      benefit: "Kom i gang umiddelbart uten store investeringer",
    },
    {
      feature: "Bindingstid",
      hmsnova: "12 måneder etter 14 dagers angrefrist",
      competitors: "1-3 år påkrevd",
      benefit: "14 dagers angrefrist, deretter 12 måneders binding og 3 måneders oppsigelse",
    },
    {
      feature: "Mobilapp (offline)",
      hmsnova: "Full støtte",
      competitors: "Begrenset eller ikke tilgjengelig",
      benefit: "Perfekt for feltarbeid og byggeplasser",
    },
    {
      feature: "Pris",
      hmsnova: "300 kr/mnd eks. mva (3 600 kr/år)",
      competitors: "Fra 7.080-12.000 kr/år",
      benefit: "Best verdi for pengene - ubegrenset brukere",
    },
  ],

  // Trust builders
  trustSignals: [
    "500+ norske bedrifter stoler på HMS Nova",
    "Standardtekst etter ISO 9001, ISO 45001 og internkontrollforskriften",
    "Data lagres i EU/EØS",
    "14 dagers angrefrist",
    "Norsk kundesupport",
  ],

  // FAQ content optimalisert for featured snippets
  faqContent: {
    whatIsHmsNova:
      "HMS Nova er et HMS-system der KS-, HMS- og personalhåndboken allerede er skrevet. Standardteksten følger ISO 9001, ISO 45001 og internkontrollforskriften. Bedriften fyller inn egne opplysninger, risikovurdering og ansatte.",

    howMuchCost:
      "HMS Nova koster 300 kr/mnd eks. mva (3 600 kr/år) per bedrift. Ubegrenset antall brukere. Ingen oppstartskostnad. Sertifiserte kurs bestilles hos KKS AS. Bedriftshelsetjeneste tilbys gjennom Dr.Dropin.",

    howDifferent:
      "Prisen er 300 kr/mnd eks. mva per bedrift, med ubegrenset antall brukere og digital signatur inkludert. Håndbøkene ligger inne med standardtekst. AI er et tillegg på 49 kr/mnd eks. mva og er av til den slås på.",

    isItApproved:
      "HMS Nova følger kravene i arbeidsmiljøloven, internkontrollforskriften og ISO 9001:2015. Systemet er et HMS-verktøy. HMS Nova er ikke en godkjent bedriftshelsetjeneste.",
  },

  // Call-to-action variations
  ctas: {
    primary: "Kom i gang nå",
    secondary: "Registrer bedrift",
    tertiary: "Registrer bedrift",
    support: "Ring oss på +47 41 87 40 10",
  },

  // Social proof
  testimonials: [],

  // Meta descriptions for different pages
  metaDescriptions: {
    home: "Hele HMS-systemet er allerede skrevet. KS-, HMS- og personalhåndbok med standardtekst. 300 kr/mnd eks. mva, ubegrenset antall brukere.",
    priser: "Transparente HMS-priser: 300 kr/mnd (12 mnd abonnement). Ingen oppstartskostnader. Se alle priser.",
    kurs: "Dokumentert opplæring i HMS Nova. Sertifiserte kurs hos KKS AS. Kurspriser står på kksas.no.",
    bht: "Bedriftshelsetjeneste gjennom Dr.Dropin. HMS Nova er ikke godkjent BHT og oppgir ikke en egen BHT-pris.",
  },
} as const;

// Long-tail keyword phrases for content
export const LONG_TAIL_KEYWORDS = [
  "hms system for små bedrifter",
  "digital hms løsning for norske bedrifter",
  "hms system med mobilapp offline",
  "hms system 12 måneder binding",
  "hms system med digital signatur inkludert",
  "iso 9001 compliant hms system norge",
  "hms system bedre enn grønn jobb",
  "hms system alternativ til avonova",
  "moderne hms system ubegrenset brukere",
  "hms automatisering og påminnelser",
] as const;

// Content clusters for topical authority
export const CONTENT_CLUSTERS = {
  hmsSystem: {
    pillar: "HMS-system",
    supportingTopics: [
      "Hva er et HMS-system",
      "HMS-system for små bedrifter",
      "Digital HMS vs papir HMS",
      "HMS-system sammenlignet",
      "Velge riktig HMS-system",
    ],
  },
  compliance: {
    pillar: "HMS compliance",
    supportingTopics: [
      "Arbeidsmiljøloven krav",
      "Internkontrollforskriften",
      "ISO 9001 for HMS",
      "HMS-revisjon forberedelse",
      "Lovpålagt HMS-dokumentasjon",
    ],
  },
  implementation: {
    pillar: "HMS implementering",
    supportingTopics: [
      "Kom i gang med HMS",
      "Digitalisere HMS-arbeid",
      "HMS-håndbok mal",
      "Risikovurdering guide",
      "Vernerunde best practice",
    ],
  },
} as const;

