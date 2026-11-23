import type { Metadata } from "next";
import Link from "next/link";
import { FeatureCatalog } from "@/components/feature-catalog";
import { RegisterDialog } from "@/components/register-dialog";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import { AI_ADDON_NET_MONTHLY_NOK } from "@/lib/ai-addon";
import { featurePublicPath, PUBLIC_FEATURE_COUNT, PUBLIC_FEATURE_GROUPS } from "@/lib/public-feature-catalog";
import {
  getBreadcrumbSchema,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  ROBOTS_CONFIG,
  SITE_CONFIG,
} from "@/lib/seo-config";

const title = "Alle funksjoner i HMS-systemet";
const description = `Hele funksjonslisten i HMS Nova: ${PUBLIC_FEATURE_COUNT} funksjoner for avvik, risiko, håndbøker, personal og konsern. 300 kr/mnd eks. mva. AI ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd.`;

export const metadata: Metadata = {
  title,
  description,
  keywords:
    "hms system funksjoner, hms programvare, avvikssystem, risikovurdering, hms håndbok, stoffkartotek, konsern hms",
  alternates: { canonical: getCanonicalUrl("/funksjoner") },
  robots: ROBOTS_CONFIG,
  openGraph: getOpenGraphDefaults(title, description, "/funksjoner"),
  twitter: getTwitterDefaults(title, description),
};

export default function FunksjonerPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Funksjoner i HMS Nova",
    numberOfItems: PUBLIC_FEATURE_COUNT,
    itemListElement: PUBLIC_FEATURE_GROUPS.flatMap((group) => group.features).map((feature, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: feature.name,
      url: `${SITE_CONFIG.url}${featurePublicPath(feature)}`,
    })),
  };

  return (
    <>
      <MultipleStructuredData
        dataArray={[
          itemList,
          getBreadcrumbSchema([
            { name: "Hjem", url: "/" },
            { name: "Funksjoner", url: "/funksjoner" },
          ]),
        ]}
      />
      <div className="bg-[#F6F5F1] text-[#101C18]">
        <section className="container mx-auto max-w-3xl px-4 py-16">
          <p className="text-sm text-[#101C18]/55">
            <Link href="/" className="hover:text-[#0B6E4F]">Hjem</Link>
            <span className="mx-2">/</span>
            Funksjoner
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {PUBLIC_FEATURE_COUNT} funksjoner. Én pris.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[#101C18]/75">
            HMS Nova er et HMS-system for norske bedrifter. Alt under er med i 300 kr/mnd eks. mva,
            med ubegrenset antall brukere. AI-assistent og tale-til-tekst koster {AI_ADDON_NET_MONTHLY_NOK} kr/mnd
            ekstra og er av til en administrator slår dem på.
          </p>
          <div className="mt-6">
            <RegisterDialog>
              <button type="button" className="h-12 rounded-full bg-[#0B6E4F] px-6 font-semibold text-white">
                Registrer bedrift
              </button>
            </RegisterDialog>
          </div>
        </section>
        <section className="container mx-auto px-4 pb-20">
          <FeatureCatalog />
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-[#101C18]/60">
            Konsern med flere selskaper bruker{" "}
            <Link href="/hms-system/konsern" className="font-medium text-[#0B6E4F]">
              konsernportalen
            </Link>
            . Hver bedrift koster 300 kr/mnd.
          </p>
        </section>
      </div>
    </>
  );
}
