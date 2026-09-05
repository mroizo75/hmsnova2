/**
 * HMS Nova SEO Configuration
 * 
 * Fokusområder:
 * - "HMS Nova bygger trygghet" som kjerneverdi
 * - Overgå konkurrenter (Grønn Jobb, Avonova, Kuba)
 * - Optimalisert for både tradisjonelle søkemotorer og AI (ChatGPT, Perplexity, etc.)
 */

const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hmsnova.no";
const normalizedBaseUrl = rawBaseUrl.startsWith("http") ? rawBaseUrl : `https://${rawBaseUrl}`;

export const SITE_CONFIG = {
  name: "HMS Nova",
  tagline: "HMS Nova bygger trygghet",
  description: "Norges mest moderne HMS-system. Byggjer trygghet gjennom digitalisering, automatisering og ISO 9001 compliance. Fra små bedrifter til store konsern.",
  url: normalizedBaseUrl,
  locale: "nb_NO",
  contactPhone: "+47 41 87 40 10",
  contactEmail: "post@hmsnova.no",
  socialMedia: {
    linkedin: "https://www.linkedin.com/company/hmsnova",
    facebook: "https://www.facebook.com/hmsnova",
  },
} as const;

// Keywords som overgår konkurrentene
export const PRIMARY_KEYWORDS = [
  "HMS-system",
  "HMS system Norge",
  "HMS Nova",
  "bedriftshelsetjeneste",
  "BHT",
  "ISO 9001",
  "risikovurdering",
  "HMS håndbok",
  "vernerunde",
  "arbeidsmiljø",
  "internkontroll",
  "HMS compliance",
  "digital HMS",
  "HMS automation",
  "trygt arbeidsmiljø",
  "varsling",
  "eksponeringsregister",
  "stoffkartotek",
  "psykososialt arbeidsmiljø",
  "SJA",
  "konsern HMS",
] as const;

// Sekundære keywords for long-tail SEO
export const SECONDARY_KEYWORDS = [
  "hms system pris",
  "beste hms system",
  "hms programvare",
  "hms digitalisering",
  "hms app",
  "mobil hms løsning",
  "billig hms system",
  "hms system små bedrifter",
  "godkjent bedriftshelsetjeneste",
  "arbeidstilsynet krav",
  "internkontrollforskriften",
  "arbeidsmiljøloven",
  "hms kurs",
  "verneombud opplæring",
  "5 whys analyse",
  "hendelsesrapportering",
  "avviksbehandling",
  "stoffkartotek",
  "sikkerhetsdatablad",
  "kompetansematrise",
  "hms dokumentasjon",
] as const;

// Strukturerte data for søkemotorer
export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_CONFIG.name,
  slogan: SITE_CONFIG.tagline,
  url: SITE_CONFIG.url,
  logo: `${SITE_CONFIG.url}/opengraph-image`,
  description: SITE_CONFIG.description,
  telephone: SITE_CONFIG.contactPhone,
  email: SITE_CONFIG.contactEmail,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Baneveien 290",
    addressLocality: "Sylling",
    postalCode: "3410",
    addressRegion: "Lier",
    addressCountry: "NO",
  },
  sameAs: [
    SITE_CONFIG.socialMedia.linkedin,
    SITE_CONFIG.socialMedia.facebook,
  ],
  areaServed: {
    "@type": "Country",
    name: "Norway",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "HMS-tjenester",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "HMS-system",
          description: "Komplett digitalt HMS-system for norske bedrifter",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Bedriftshelsetjeneste",
          description: "HMS Nova etablerer seg som godkjent bedriftshelsetjeneste med minimum krav, tilleggstjenester og kurs.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "HMS-kurs",
          description: "Lovpålagte HMS-kurs og førstehjelp",
        },
      },
    ],
  },
} as const;

// Software Product Schema for HMS Nova systemet
export const SOFTWARE_PRODUCT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "HMS Nova",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "NOK",
    lowPrice: "300",
    highPrice: "300",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "300",
      priceCurrency: "NOK",
      unitText: "MONTH",
    },
  },
  featureList: [
    "Digital signatur",
    "Risikovurdering 5x5 matrise",
    "Hendelsesrapportering",
    "5 Whys analyse",
    "Automatiske påminnelser",
    "Mobilapp (offline)",
    "ISO 9001 compliance",
    "Dokumenthåndtering",
    "Kompetansematrise",
    "Stoffkartotek",
    "Revisjoner og audits",
    "Mål og KPI-oppfølging",
    "Psykososial arbeidsmiljøundersøkelse",
    "Eksponeringsregister",
    "Varsling/whistleblowing",
    "SJA - Sikker Jobb Analyse",
    "Konsern-HMS",
    "HMS Tavle",
  ],
  description: "HMS Nova bygger trygghet. Norges mest moderne HMS-system med full ISO 9001 compliance, digital signatur og mobilapp.",
  screenshot: `${SITE_CONFIG.url}/opengraph-image`,
} as const;

// FAQ Schema for bedre synlighet i søk
export const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Hva er HMS Nova?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HMS Nova er Norges mest moderne HMS-system. Vi bygger trygghet gjennom digitalisering av HMS-arbeid. Med HMS Nova får bedrifter et komplett verktøy for risikovurdering, hendelsesrapportering, dokumenthåndtering og ISO 9001 compliance.",
      },
    },
    {
      "@type": "Question",
      name: "Hva koster HMS Nova?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HMS Nova koster 300 kr/mnd (3 600 kr/år) med 12 måneders abonnement. Ubegrenset antall brukere inkludert. Ingen oppstartskostnader, alt inkludert.",
      },
    },
    {
      "@type": "Question",
      name: "Er HMS Nova godkjent av Arbeidstilsynet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HMS Nova følger alle krav i Arbeidsmiljøloven, Internkontrollforskriften og ISO 9001:2015. Systemet er bygget for å sikre full compliance med norsk lov og internasjonale standarder.",
      },
    },
    {
      "@type": "Question",
      name: "Tilbyr HMS Nova bedriftshelsetjeneste?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HMS Nova etablerer seg som godkjent bedriftshelsetjeneste (BHT) og vil tilby minimum lovkrav, tilleggstjenester og et bredt kursutbud inkludert Diisocyanater. HMS-system og BHT vil være under ett tak.",
      },
    },
    {
      "@type": "Question",
      name: "Fungerer HMS Nova på mobil og offline?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja! HMS Nova har full mobilstøtte og fungerer offline. Perfekt for byggeplasser, verksteder og feltarbeid. Synkronisering skjer automatisk når du er tilbake online.",
      },
    },
    {
      "@type": "Question",
      name: "Hvordan skiller HMS Nova seg fra Grønn Jobb, Avonova og Kuba?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HMS Nova er 100% digitalt og moderne. Vi har digital signatur inkludert (ikke ekstrakostnad), 12 måneders abonnement (300 kr/mnd), mobilapp med offline-støtte, og betydelig lavere priser. Vår visjon er enkel: HMS Nova bygger trygghet - ikke byråkrati.",
      },
    },
  ],
} as const;

// BreadcrumbList for bedre navigasjon i søkeresultater
export const getBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${SITE_CONFIG.url}${item.url}`,
  })),
});

// Page-spesifikke metadata templates
export const PAGE_METADATA = {
  home: {
    title: "HMS Nova - Norges Mest Moderne HMS-system | HMS Nova Bygger Trygghet",
    description: "HMS Nova bygger trygghet. 300 kr/mnd, ubegrenset brukere, digital signatur inkludert, ISO 9001-støtte og 14 dagers angrefrist. Registrer bedrift i dag.",
    keywords: [...PRIMARY_KEYWORDS, ...SECONDARY_KEYWORDS.slice(0, 10)].join(", "),
  },
  priser: {
    title: "Priser - HMS Nova | 300 kr/mnd | Ingen Skjulte Kostnader",
    description: "Transparente priser: 300 kr/mnd (3 600 kr/år) med 12 mnd abonnement. Ubegrenset brukere, digital signatur inkludert og 0 kr oppstart. Se alle priser.",
    keywords: "hms system pris, hms programvare kostnad, billig hms system, hms system alle bedrifter, beste hms system pris",
  },
  kurs: {
    title: "HMS-kurs - Lovpålagte Kurs & Førstehjelp | HMS Nova",
    description: "20% rabatt på HMS-kurs for medlemmer. Verneombud, førstehjelp og diisocyanater. Fysisk, digitalt eller hybrid. Bestill kurs hos HMS Nova i dag.",
    keywords: "hms kurs, verneombud kurs, førstehjelp kurs, hms opplæring, lovpålagt hms kurs",
  },
  bht: {
    title: "Bedriftshelsetjeneste (BHT) - HMS Nova blir BHT-organ | Minimum krav + kurs",
    description: "HMS Nova etablerer seg som godkjent BHT · Minimum lovkrav + tilleggstjenester + Diisocyanater og HMS-kurs · Ett sted for HMS og BHT · Registrer interesse →",
    keywords: "bedriftshelsetjeneste, BHT, godkjent bedriftshelsetjeneste, arbeidstilsynet bht, diisocyanater kurs, AMO-kurs",
  },
  komplettPakke: {
    title: "Komplett HMS-pakke - BHT + HMS Nova fra 6 900 kr/år | HMS Nova",
    description: "Lovpålagt BHT + HMS Nova. START 6 900 kr/år (1-5 ansatte), PRO 14 900 kr/år (6-20), PREMIUM fra 29 900 kr/år (20+). Tilleggstjenester til fast pris. Ring salg eller venteliste.",
    keywords: "komplett hms pakke, bht pakke, hms oppsett, implementering hms, hms nova pakke, bht pris",
  },
  handbook: {
    title: "HMS-håndbok - Digital & Oppdatert | HMS Nova",
    description: "Ferdig HMS-håndbok tilpasset din bedrift. Alltid oppdatert med lovkrav, digital signatur og versjonskontroll. Spar uker med arbeid. Registrer bedrift.",
    keywords: "hms håndbok, digital hms håndbok, hms dokumentasjon, arbeidsmiljøhåndbok",
  },
  risikovurdering: {
    title: "Risikovurdering - 5x5 Matrise & Analyse | HMS Nova",
    description: "Profesjonell risikovurdering med 5x5 matrise (ISO 9001). Enkelt å bruke med automatisk oppfølging. Bestå revisjoner med glans. 14 dagers angrefrist, deretter 12 måneders binding.",
    keywords: "risikovurdering, risikoanalyse, 5x5 matrise, risikostyring, hms risikovurdering",
  },
  vernerunde: {
    title: "Vernerunde-guide - Digital Vernerunde på Mobil | HMS Nova",
    description: "Digital vernerunde på mobil som fungerer offline. Automatisk rapportering, perfekt for byggeplasser. Spar timer hver uke. Registrer bedrift.",
    keywords: "vernerunde, digital vernerunde, vernerunde mal, sikkerhetsinspeksjon, bygningsvernerunde",
  },
  lover: {
    title: "HMS Lover & Regler - Arbeidsmiljøloven & ISO 9001 | HMS Nova",
    description: "Komplett oversikt over HMS-lover i Norge. Arbeidsmiljøloven, internkontrollforskriften og ISO 9001. Oppdatert 2026. Les mer om dine plikter.",
    keywords: "arbeidsmiljøloven, internkontrollforskriften, iso 9001, hms lovverk, arbeidstilsynet regler",
  },
  iso: {
    title: "ISO 9001 Sjekkliste - Gratis Last Ned | HMS Nova",
    description: "Gratis ISO 9001 sjekkliste for full compliance med kvalitetsstyringsstandarden. HMS Nova har innebygd ISO 9001-støtte. Last ned nå.",
    keywords: "iso 9001 sjekkliste, iso 9001 compliance, kvalitetsstyring, iso sertifisering",
  },
  psykososialt: {
    title: "Psykososialt arbeidsmiljø - Pulsundersøkelse og trivselskartlegging | HMS Nova",
    description: "Kartlegg psykososialt arbeidsmiljø med anonyme pulsundersøkelser. Oppfyll AML § 4-3 med digital trivselsmåling, trendrapporter og handlingsplaner.",
    keywords: "psykososialt arbeidsmiljø, arbeidsmiljøundersøkelse, trivselsmåling, pulsundersøkelse, AML 4-3, medarbeiderundersøkelse",
  },
  stoffkartotek: {
    title: "Stoffkartotek og eksponeringsregister - Digital kjemikaliestyring | HMS Nova",
    description: "Digitalt stoffkartotek med sikkerhetsdatablad og lovpålagt eksponeringsregister. Oppfyll forskrift om tiltaksverdier og AML § 4-5.",
    keywords: "stoffkartotek, eksponeringsregister, sikkerhetsdatablad, kjemikalieregister, SDS, AML 4-5, tiltaksverdier",
  },
  varsling: {
    title: "Varsling - Anonym varslingskanal for arbeidsplassen | HMS Nova",
    description: "Lovpålagt varslingskanal etter AML kapittel 2A. Anonym og trygg varsling av kritikkverdige forhold. Sporbar saksbehandling.",
    keywords: "varsling, varslingskanal, whistleblowing, anonym varsling, AML 2A, kritikkverdige forhold, varslingsrutiner",
  },
  konsern: {
    title: "Konsern HMS-løsning - Administrer HMS på tvers av selskaper | HMS Nova",
    description: "HMS-løsning for konsern og kjeder. Samlet HMS-score, innholdsdistribusjon og rapportering på tvers av datterselskaper.",
    keywords: "konsern HMS, HMS konsernløsning, HMS kjede, multi-tenant HMS, HMS flere selskaper, sentralisert HMS",
  },
  sja: {
    title: "SJA - Sikker Jobb Analyse | Digital SJA-skjema | HMS Nova",
    description: "Digital Sikker Jobb Analyse (SJA) for risikofylte arbeidsoperasjoner. Identifiser farer, vurder risiko og dokumenter tiltak før arbeidet starter.",
    keywords: "SJA, sikker jobb analyse, SJA skjema, SJA mal, risikovurdering enkeltoppgave, SJA bygg, farlig arbeid",
  },
} as const;

// Open Graph defaults
export const getOpenGraphDefaults = (
  title: string,
  description: string,
  path: string = ""
) => ({
  title,
  description,
  url: `${SITE_CONFIG.url}${path}`,
  siteName: SITE_CONFIG.name,
  locale: SITE_CONFIG.locale,
  type: "website" as const,
});

// Twitter Card defaults
export const getTwitterDefaults = (title: string, description: string) => ({
  card: "summary_large_image" as const,
  title,
  description,
  creator: "@hmsnova",
});

// Robots meta tags
export const ROBOTS_CONFIG = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
  },
} as const;

// Canonical URL helper
export const getCanonicalUrl = (path: string) => {
  return `${SITE_CONFIG.url}${path}`;
};

