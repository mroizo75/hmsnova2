import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/seo-config";
import { PLAN_PRICES } from "@/features/hms-tavle/lib/tavle-plan-limits";

const title = "Digital HMS Tavle – for bygg, hotell, reiseliv og alle bransjer";
const description =
  "Digital HMS-tavle med QR-tilgang, elektronisk oversiktsliste, avvik og gjesteservice med serviceløfte. Gjesten skanner QR på rommet, melder fra på eget språk og følger saken på privat lenke. Bygget på dokumentasjonskravene i Byggherreforskriften, internkontrollforskriften § 5 og GDPR. Ingen HMS Nova-abonnement nødvendig.";
const url = `${SITE_CONFIG.url}/digital-hms-tavle`;

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "digital hms tavle",
    "hms tavle byggeplass",
    "elektronisk mannskapsliste",
    "digital hms tavle hotell",
    "hms system hotell",
    "gjesteklager system",
    "avvikssystem restaurant",
    "ik-mat dokumentasjon",
    "hms reiseliv",
    "qr melding rom",
  ],
  alternates: { canonical: url },
  openGraph: {
    title,
    description,
    url,
    type: "website",
    locale: SITE_CONFIG.locale,
    siteName: SITE_CONFIG.name,
  },
  twitter: { card: "summary_large_image", title, description },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Digital HMS Tavle",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description,
      url,
      provider: { "@type": "Organization", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
      offers: {
        "@type": "Offer",
        price: String(PLAN_PRICES.ENKEL),
        priceCurrency: "NOK",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: String(PLAN_PRICES.ENKEL),
          priceCurrency: "NOK",
          unitText: "MONTH",
        },
      },
      audience: {
        "@type": "Audience",
        audienceType:
          "Bygg og anlegg, hotell og overnatting, restaurant og servering, attraksjon, turoperatør, turisttransport, helse, skole, lager, industri og butikk",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Trenger vi et HMS Nova-abonnement?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `Nei. Digital HMS Tavle kan kjøpes som selvstendig produkt per lokasjon eller prosjekt fra kr ${PLAN_PRICES.ENKEL} per måned. Eksisterende HMS Nova-kunder aktiverer det som tillegg fra kr ${PLAN_PRICES.ADDON} per måned.`,
          },
        },
        {
          "@type": "Question",
          name: "Fungerer det for andre bransjer enn bygg og anlegg?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ja. Tavlen brukes av hoteller, restauranter, attraksjoner, turoperatører, turisttransport, eiendomsselskaper, borettslag, sykehus, skoler, barnehager, lager og logistikk, industri, verksteder og butikkjeder. Seksjonstekster og lovkrav-referanser tilpasses valgt bransje.",
          },
        },
        {
          "@type": "Question",
          name: "Kan andre gjester se klagen min?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nei. Klager og avvik er alltid konfidensielle. Den offentlige tavlen viser kun anonymiserte tall, aldri saksinnhold, navn eller romnummer. Gjesten får en privat sporingslenke som bare viser egen sak.",
          },
        },
        {
          "@type": "Question",
          name: "Hvilke lovkrav støttes?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tavlen er et verktøy for å vise og dokumentere HMS-informasjon – virksomheten er selv ansvarlig for at innholdet er korrekt og oppdatert. For bygg og anlegg: SHA-planen (Byggherreforskriften § 7 og § 8), forhåndsmeldingen som skal stå synlig på plassen (§ 10), elektronisk oversiktsliste med navn, fødselsdato, arbeidsgiver og HMS-kortnummer (§ 15 bokstav e) og informasjon til arbeidstakere og verneombud (§ 19). For hotell og reiseliv: en dokumentert avviksrutine etter internkontrollforskriften § 5 og IK-mat § 5 nr. 4 og 5. Personopplysninger behandles etter GDPR artikkel 5, 6 og 9. HACCP, temperaturkontroll og allergenoversikt ligger i IK-mat-modulen i HMS Nova, ikke i tavlen.",
          },
        },
        {
          "@type": "Question",
          name: "Hva skjer hvis en gjest melder om matforgiftning?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Saken settes automatisk til kritisk prioritet, resepsjonen får varsel i dashboard, push og SMS, og svarfristen er som standard én time. Slike saker er helseopplysninger etter GDPR artikkel 9 og vises aldri på tavlen.",
          },
        },
        {
          "@type": "Question",
          name: "Må gjesten laste ned en app?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nei. Gjesten skanner QR-koden på rommet eller bordet med mobilkameraet og melder fra i nettleseren. Ingen innlogging og ingen app.",
          },
        },
      ],
    },
  ],
};

export default function DigitalHmsTavleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
