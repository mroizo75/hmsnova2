import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Gratis oversikt over HMS-lover og regler | HMS Nova",
  description:
    "Last ned oversikt over de viktigste HMS-lovene og forskriftene. Forstå Arbeidsmiljøloven, HMS-forskriften og nye regler. Inkluderer verneombud-plikten, BHT-krav og psykososialt arbeidsmiljø. HMS Nova følger lovgivningen – 14 dagers angrefrist, deretter 12 måneders binding.",
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
      "Komplett oversikt over HMS-lover og forskrifter. HMS Nova følger lovgivningen – 14 dagers angrefrist, deretter 12 måneders binding.",
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

