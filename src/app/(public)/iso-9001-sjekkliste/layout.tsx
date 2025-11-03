import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Gratis ISO 9001-sjekkliste | Alle 27 krav | HMS Nova",
  description:
    "Last ned gratis ISO 9001-sjekkliste med alle 27 krav fra ISO 9001:2015. Sjekk om deres kvalitetssystem er klart for sertifisering. Inkluderer dokumentasjonsliste, tips til implementering og mal for internrevisjon. Eller få 100% ISO-kompatibelt system med HMS Nova gratis.",
  keywords: [
    "gratis ISO 9001 sjekkliste",
    "ISO 9001 krav",
    "ISO 9001 sertifisering",
    "kvalitetsstyringssystem",
    "ISO 9001:2015",
    "internrevisjon mal",
    "kvalitetssystem sjekkliste",
    "ISO dokumentasjon",
    "ISO 9001 Norge",
  ],
  openGraph: {
    title: "Gratis ISO 9001-sjekkliste | Alle 27 krav | HMS Nova",
    description:
      "Komplett sjekkliste for ISO 9001-sertifisering. Last ned gratis eller få 100% ISO-kompatibelt system med HMS Nova.",
    url: "https://hmsnova.com/iso-9001-sjekkliste",
    siteName: "HMS Nova",
    locale: "nb_NO",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hmsnova.com/iso-9001-sjekkliste",
  },
};

export default function ISO9001SjekklisteLayout({
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

