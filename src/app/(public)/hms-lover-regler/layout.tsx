import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Gratis oversikt over HMS-lover og regler | HMS Nova",
  description:
    "Last ned gratis oversikt over de viktigste HMS-lovene og forskriftene. Forstå Arbeidsmiljøloven, HMS-forskriften og nye regler fra 2024. Inkluderer verneombud-plikten, BHT-krav og psykososialt arbeidsmiljø. Eller få HMS Nova som automatisk følger all lovgivning – gratis.",
  keywords: [
    "HMS-lover Norge",
    "arbeidsmiljøloven",
    "HMS-forskriften",
    "verneombud 2024",
    "BHT-plikt 5 ansatte",
    "psykososialt arbeidsmiljø lov",
    "HMS lovkrav",
    "arbeidsmiljø forskrift",
    "HMS regelveark",
  ],
  openGraph: {
    title: "Gratis oversikt over HMS-lover og regler | HMS Nova",
    description:
      "Komplett oversikt over HMS-lover og forskrifter. Last ned gratis eller få HMS-system som følger all lovgivning automatisk.",
    url: "https://hmsnova.com/hms-lover-regler",
    siteName: "HMS Nova",
    locale: "nb_NO",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hmsnova.com/hms-lover-regler",
  },
};

export default function HMSLoverReglerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="min-h-screen">{children}</main>
    </>
  );
}

