import type { Metadata } from "next";
import { SITE_CONFIG, getCanonicalUrl, ROBOTS_CONFIG } from "@/lib/seo-config";

export const metadata: Metadata = {
  title: "HMS-blogg - Artikler om HMS, arbeidsmiljø og sikkerhet",
  description:
    "Les fagartikler om HMS, arbeidsmiljø, risikovurdering, ISO 9001 og internkontroll. Oppdatert kunnskap fra HMS Nova sine eksperter.",
  keywords:
    "hms blogg, hms artikler, arbeidsmiljø, risikovurdering, iso 9001, internkontroll",
  alternates: {
    canonical: getCanonicalUrl("/blogg"),
  },
  robots: ROBOTS_CONFIG,
  openGraph: {
    title: "HMS-blogg | HMS Nova",
    description:
      "Fagartikler om HMS, arbeidsmiljø og sikkerhet fra HMS Nova sine eksperter.",
    url: `${SITE_CONFIG.url}/blogg`,
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HMS-blogg | HMS Nova",
    description:
      "Fagartikler om HMS, arbeidsmiljø og sikkerhet fra HMS Nova sine eksperter.",
    creator: "@hmsnova",
  },
};

export default function BloggLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
