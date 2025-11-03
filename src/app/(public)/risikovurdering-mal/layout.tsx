import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Gratis risikovurdering-mal | 5x5 matrise | HMS Nova",
  description:
    "Last ned gratis risikovurdering-mal i Excel-format. 5x5 risikomatrise med automatisk fargekoding, tiltaksplan og veiledning. Oppfyller krav fra Arbeidsmiljøloven §3-1. Eller få digital risikovurdering med HMS Nova gratis.",
  keywords: [
    "gratis risikovurdering mal",
    "risikomatrise",
    "5x5 risikomatrise",
    "risikovurdering excel",
    "HMS risikovurdering",
    "arbeidsmiljøloven §3-1",
    "risikovurdering skjema",
    "farekartlegging",
    "risikoanalyse",
  ],
  openGraph: {
    title: "Gratis risikovurdering-mal | 5x5 matrise | HMS Nova",
    description:
      "Profesjonell risikovurdering-mal med 5x5 matrise. Last ned gratis eller få digital risikovurdering med HMS Nova.",
    url: "https://hmsnova.com/risikovurdering-mal",
    siteName: "HMS Nova",
    locale: "nb_NO",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hmsnova.com/risikovurdering-mal",
  },
};

export default function RisikovurderingMalLayout({
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

