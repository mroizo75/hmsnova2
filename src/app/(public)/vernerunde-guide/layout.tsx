import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Gratis vernerunde-guide | Sjekklister og maler | HMS Nova",
  description:
    "Last ned gratis vernerunde-guide med sjekklister, malerdokumenter og steg-for-steg veiledning. Gjennomfør effektive vernerunder og oppfyll krav til systematisk HMS-arbeid. Eller bruk digital vernerunde-modul i HMS Nova gratis.",
  keywords: [
    "gratis vernerunde guide",
    "vernerunde sjekkliste",
    "vernerunde mal",
    "hvordan gjennomføre vernerunde",
    "vernerunde rapport",
    "verneombud",
    "systematisk HMS",
    "HMS-runde",
    "arbeidsplassinspeksjon",
  ],
  openGraph: {
    title: "Gratis vernerunde-guide | Sjekklister og maler | HMS Nova",
    description:
      "Komplett guide til vernerunder med sjekklister for alle områder. Last ned gratis eller gjennomfør digitale vernerunder med HMS Nova.",
    url: "https://hmsnova.com/vernerunde-guide",
    siteName: "HMS Nova",
    locale: "nb_NO",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hmsnova.com/vernerunde-guide",
  },
};

export default function VernerundeGuideLayout({
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

