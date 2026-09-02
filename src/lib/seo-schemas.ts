/**
 * Additional SEO Schemas for specific pages
 * Ekstra strukturerte data for priser, kurs, BHT, etc.
 */

import { SITE_CONFIG } from "./seo-config";

// Pricing Schema for HMS Nova – én pakke 12 mnd binding
export const PRICING_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "HMS Nova Priser",
  description: "Transparente priser for HMS Nova HMS-system - 300 kr/mnd, 12 måneders abonnement",
  itemListElement: [
    {
      "@type": "Offer",
      position: 1,
      name: "12 mnd binding",
      description: "HMS Nova – full tilgang, 12 måneders abonnement",
      price: "300",
      priceCurrency: "NOK",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "300",
        priceCurrency: "NOK",
        unitText: "MONTH",
      },
      seller: {
        "@type": "Organization",
        name: SITE_CONFIG.name,
      },
      itemOffered: {
        "@type": "Service",
        name: "HMS Nova - 12 mnd binding",
        description: "Komplett HMS-system med ubegrenset brukere. 3 600 kr/år.",
      },
    },
  ],
} as const;

// Course Schema for HMS-kurs
export const COURSE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "HMS-kurs og Førstehjelp",
  description: "20% rabatt på alle HMS-kurs for HMS Nova-medlemmer",
  itemListElement: [
    {
      "@type": "Course",
      position: 1,
      name: "Verneombudkurs",
      description: "Lovpålagt 40-timers verneombudkurs",
      provider: {
        "@type": "Organization",
        name: "HMS Nova AS",
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: ["onsite", "online", "blended"],
        duration: "P40H",
      },
    },
    {
      "@type": "Course",
      position: 2,
      name: "Førstehjelp for voksne",
      description: "Grunnleggende førstehjelp med sertifikat",
      provider: {
        "@type": "Organization",
        name: "HMS Nova AS",
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: ["onsite"],
        duration: "P8H",
      },
    },
    {
      "@type": "Course",
      position: 3,
      name: "Førstehjelp for barn",
      description: "Førstehjelp spesielt tilpasset barn",
      provider: {
        "@type": "Organization",
        name: "HMS Nova AS",
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: ["onsite"],
        duration: "P4H",
      },
    },
  ],
} as const;

// BHT Service Schema
export const BHT_SERVICE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Bedriftshelsetjeneste (BHT)",
  description: "HMS Nova etablerer seg som godkjent bedriftshelsetjeneste. Minimum lovkrav, tilleggstjenester og bredt kursutbud inkludert Diisocyanater.",
  provider: {
    "@type": "Organization",
    name: SITE_CONFIG.name,
  },
  serviceType: "Bedriftshelsetjeneste",
  areaServed: {
    "@type": "Country",
    name: "Norway",
  },
  offers: {
    "@type": "Offer",
    description: "Grunnpakke BHT og tilleggstjenester. Kontakt for tilbud.",
  },
} as const;

// How-To Schema for registrering
export const GRATIS_HMS_HOWTO_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Slik registrerer du HMS Nova",
  description: "Registrer bedriften og få HMS-håndbok og dokumenter. 14 dagers angrefrist, deretter 12 måneders binding.",
  totalTime: "PT5M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Oppgi bedriftsinformasjon",
      text: "Fyll inn grunnleggende informasjon om din bedrift",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Velg bransje",
      text: "Velg din bransje for bransjespesifikke dokumenter",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Last ned pakken",
      text: "Last ned komplett HMS-pakke med håndbok, risikovurdering og maler",
    },
  ],
} as const;

// Review Schema — bør oppdateres med ekte kundeanmeldelser når de er tilgjengelige
export const REVIEW_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "HMS Nova",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "300",
    priceCurrency: "NOK",
  },
} as const;

// LocalBusiness schema — hovedkontor Sylling (flyttes til Lierbyen senere)
export const LOCAL_BUSINESS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE_CONFIG.name,
  image: `${SITE_CONFIG.url}/opengraph-image`,
  "@id": SITE_CONFIG.url,
  url: SITE_CONFIG.url,
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
  geo: {
    "@type": "GeoCoordinates",
    latitude: 59.7744,
    longitude: 10.2603,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "16:00",
  },
  sameAs: [
    SITE_CONFIG.socialMedia.linkedin,
    SITE_CONFIG.socialMedia.facebook,
  ],
  location: [
    {
      "@type": "Place",
      name: "HMS Nova - Lier/Sylling",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Baneveien 290",
        addressLocality: "Sylling",
        postalCode: "3410",
        addressRegion: "Lier",
        addressCountry: "NO",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 59.7744,
        longitude: 10.2603,
      },
    },
    {
      "@type": "Place",
      name: "HMS Nova - Ringsaker",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Næringsparkvegen 50",
        addressLocality: "Ingeberg",
        postalCode: "2323",
        addressRegion: "Ringsaker",
        addressCountry: "NO",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 60.8206,
        longitude: 10.9946,
      },
    },
  ],
} as const;

// WebSite schema
export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_CONFIG.name,
  url: SITE_CONFIG.url,
  description: SITE_CONFIG.description,
  publisher: {
    "@type": "Organization",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
  },
  inLanguage: "nb",
} as const;

