/**
 * HMS Nova SEO-konfigurasjon.
 * Offentlig tekst skal beskrive produktet: ferdige håndbøker, 300 kr/mnd eks. mva.
 */

import { AI_ADDON_NET_MONTHLY_NOK } from "./ai-addon";
import { PUBLIC_FEATURE_NAMES } from "./public-feature-catalog";

const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hmsnova.no";
const normalizedBaseUrl = rawBaseUrl.startsWith("http") ? rawBaseUrl : `https://${rawBaseUrl}`;

export const SITE_CONFIG = {
  name: "HMS Nova",
  tagline: "HMS-systemet er allerede skrevet",
  description:
    "Hele HMS-systemet er allerede skrevet. KS-, HMS- og personalhåndbok med standardtekst etter ISO 9001, ISO 45001 og internkontrollforskriften. 300 kr/mnd eks. mva, ubegrenset antall brukere.",
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
  logo: `${SITE_CONFIG.url}/logo-nova.png`,
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
          description: "Bedriftshelsetjeneste gjennom Dr.Dropin. HMS Nova er ikke selv godkjent BHT.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "HMS-kurs",
          description: "Dokumentert opplæring i HMS Nova. Sertifiserte kurs hos KKS AS.",
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
    highPrice: "349",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "300",
      priceCurrency: "NOK",
      unitText: "MONTH",
    },
  },
  featureList: PUBLIC_FEATURE_NAMES,
  description:
    "HMS-system med ferdige KS-, HMS- og personalhåndbøker. 300 kr/mnd eks. mva per bedrift, ubegrenset antall brukere. Valgfritt AI-tillegg 49 kr/mnd eks. mva.",
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
        text: "HMS Nova er et HMS-system der KS-, HMS- og personalhåndboken allerede er skrevet. Standardteksten følger ISO 9001, ISO 45001 og internkontrollforskriften. Bedriften fyller inn egne opplysninger, risikovurdering og ansatte.",
      },
    },
    {
      "@type": "Question",
      name: "Hva koster HMS Nova?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HMS Nova koster 300 kr/mnd eks. mva (3 600 kr/år) per bedrift. Ubegrenset antall brukere er inkludert. AI-tillegg er 49 kr/mnd eks. mva og er av som standard. 14 dagers angrefrist, deretter 12 måneders binding og 3 måneders oppsigelse.",
      },
    },
    {
      "@type": "Question",
      name: "Er HMS Nova en godkjent bedriftshelsetjeneste?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nei. HMS Nova er et HMS-system. Bedriftshelsetjeneste tilbys gjennom Dr.Dropin. Håndbøkene følger ISO 9001, ISO 45001, internkontrollforskriften og arbeidsmiljøloven.",
      },
    },
    {
      "@type": "Question",
      name: "Tilbyr HMS Nova bedriftshelsetjeneste?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HMS Nova er ikke en godkjent bedriftshelsetjeneste. BHT tilbys gjennom Dr.Dropin, som er eneste samarbeidspartner. Pris og avtale avtales med Dr.Dropin. Sertifiserte kurs leveres av KKS AS.",
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
      name: "Hva er inkludert i prisen?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Prisen er 300 kr/mnd eks. mva per bedrift, med ubegrenset antall brukere og digital signatur inkludert. Håndbøkene ligger inne med standardtekst. AI er et tillegg på 49 kr/mnd eks. mva og er av til den slås på.",
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
    title: "HMS-systemet er allerede skrevet | HMS Nova",
    description:
      "Hele HMS-systemet er allerede skrevet. KS-, HMS- og personalhåndbok med standardtekst etter ISO 9001, ISO 45001 og internkontrollforskriften. 300 kr/mnd eks. mva. AI 49 kr/mnd.",
    keywords: [...PRIMARY_KEYWORDS, ...SECONDARY_KEYWORDS.slice(0, 10)].join(", "),
  },
  priser: {
    title: "HMS-system pris – 300 kr/mnd",
    description: `300 kr/mnd eks. mva (3 600 kr/år) per bedrift, ubegrenset brukere. Valgfritt AI-tillegg ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd eks. mva. 0 kr i oppstart.`,
    keywords: "hms system pris, hms programvare kostnad, billig hms system, hms system alle bedrifter, beste hms system pris",
  },
  kurs: {
    title: "HMS-kurs og dokumentert opplæring",
    description: "HMS Nova dokumenterer opplæring og kompetanse. Sertifiserte kurs bestilles hos KKS AS. Ingen egne kurspriser på denne siden.",
    keywords: "hms kurs, dokumentert opplæring, kompetansematrise, kks as, lovpålagt hms opplæring",
  },
  bht: {
    title: "Bedriftshelsetjeneste via Dr.Dropin",
    description: "HMS Nova er ikke godkjent BHT. Bedriftshelsetjeneste tilbys gjennom Dr.Dropin. Pris og avtale avtales med Dr.Dropin.",
    keywords: "bedriftshelsetjeneste, BHT, Dr.Dropin, arbeidsmiljøloven § 3-3",
  },
  komplettPakke: {
    title: "Bedriftshelsetjeneste via Dr.Dropin",
    description: "HMS Nova er ikke godkjent BHT. Bedriftshelsetjeneste tilbys gjennom Dr.Dropin. Pris og avtale avtales med Dr.Dropin.",
    keywords: "bedriftshelsetjeneste, BHT, Dr.Dropin",
  },
  handbook: {
    title: "HMS-håndbok - Digital & Oppdatert",
    description: "Ferdig HMS-håndbok tilpasset din bedrift. Alltid oppdatert med lovkrav, digital signatur og versjonskontroll. Spar uker med arbeid. Registrer bedrift.",
    keywords: "hms håndbok, digital hms håndbok, hms dokumentasjon, arbeidsmiljøhåndbok",
  },
  risikovurdering: {
    title: "Risikovurdering - 5x5 Matrise & Analyse",
    description: "Profesjonell risikovurdering med 5x5 matrise (ISO 9001). Enkelt å bruke med automatisk oppfølging. Bestå revisjoner med glans. 14 dagers angrefrist, deretter 12 måneders binding.",
    keywords: "risikovurdering, risikoanalyse, 5x5 matrise, risikostyring, hms risikovurdering",
  },
  vernerunde: {
    title: "Vernerunde-guide - Digital Vernerunde på Mobil",
    description: "Digital vernerunde på mobil som fungerer offline. Automatisk rapportering, perfekt for byggeplasser. Spar timer hver uke. Registrer bedrift.",
    keywords: "vernerunde, digital vernerunde, vernerunde mal, sikkerhetsinspeksjon, bygningsvernerunde",
  },
  lover: {
    title: "HMS Lover & Regler - Arbeidsmiljøloven & ISO 9001",
    description: "Komplett oversikt over HMS-lover i Norge. Arbeidsmiljøloven, internkontrollforskriften og ISO 9001. Oppdatert 2026. Les mer om dine plikter.",
    keywords: "arbeidsmiljøloven, internkontrollforskriften, iso 9001, hms lovverk, arbeidstilsynet regler",
  },
  iso: {
    title: "ISO 9001 Sjekkliste - Gratis Last Ned",
    description: "Gratis ISO 9001 sjekkliste for full compliance med kvalitetsstyringsstandarden. HMS Nova har innebygd ISO 9001-støtte. Last ned nå.",
    keywords: "iso 9001 sjekkliste, iso 9001 compliance, kvalitetsstyring, iso sertifisering",
  },
  psykososialt: {
    title: "Psykososialt arbeidsmiljø - Pulsundersøkelse og trivselskartlegging",
    description: "Kartlegg psykososialt arbeidsmiljø med anonyme pulsundersøkelser. Oppfyll AML § 4-3 med digital trivselsmåling, trendrapporter og handlingsplaner.",
    keywords: "psykososialt arbeidsmiljø, arbeidsmiljøundersøkelse, trivselsmåling, pulsundersøkelse, AML 4-3, medarbeiderundersøkelse",
  },
  stoffkartotek: {
    title: "Stoffkartotek og eksponeringsregister - Digital kjemikaliestyring",
    description: "Digitalt stoffkartotek med sikkerhetsdatablad og lovpålagt eksponeringsregister. Oppfyll forskrift om tiltaksverdier og AML § 4-5.",
    keywords: "stoffkartotek, eksponeringsregister, sikkerhetsdatablad, kjemikalieregister, SDS, AML 4-5, tiltaksverdier",
  },
  varsling: {
    title: "Varsling - Anonym varslingskanal for arbeidsplassen",
    description: "Lovpålagt varslingskanal etter AML kapittel 2A. Anonym og trygg varsling av kritikkverdige forhold. Sporbar saksbehandling.",
    keywords: "varsling, varslingskanal, whistleblowing, anonym varsling, AML 2A, kritikkverdige forhold, varslingsrutiner",
  },
  konsern: {
    title: "Konsern HMS-løsning - Administrer HMS på tvers av selskaper",
    description: "HMS-løsning for konsern og kjeder. Samlet HMS-score, innholdsdistribusjon og rapportering på tvers av datterselskaper.",
    keywords: "konsern HMS, HMS konsernløsning, HMS kjede, multi-tenant HMS, HMS flere selskaper, sentralisert HMS",
  },
  sja: {
    title: "SJA - Sikker Jobb Analyse | Digital SJA-skjema",
    description: "Digital Sikker Jobb Analyse (SJA) for risikofylte arbeidsoperasjoner. Identifiser farer, vurder risiko og dokumenter tiltak før arbeidet starter.",
    keywords: "SJA, sikker jobb analyse, SJA skjema, SJA mal, risikovurdering enkeltoppgave, SJA bygg, farlig arbeid",
  },
} as const;

// Open Graph defaults
function withSiteName(title: string) {
  if (title.includes(SITE_CONFIG.name)) return title;
  return `${title} | ${SITE_CONFIG.name}`;
}

export const getOpenGraphDefaults = (
  title: string,
  description: string,
  path: string = ""
) => ({
  title: withSiteName(title),
  description,
  url: `${SITE_CONFIG.url}${path}`,
  siteName: SITE_CONFIG.name,
  locale: SITE_CONFIG.locale,
  type: "website" as const,
});

export const getTwitterDefaults = (title: string, description: string) => ({
  card: "summary_large_image" as const,
  title: withSiteName(title),
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

