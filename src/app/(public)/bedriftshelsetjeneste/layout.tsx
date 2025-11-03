import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Bedriftshelsetjeneste (BHT) | HMS Nova + Dr. Dropin | 10% Rabatt",
  description:
    "Få komplett bedriftshelsetjeneste gjennom HMS Nova sin partner Dr. Dropin. HMS Nova-kunder får 10% rabatt på alle BHT-pakker inkl. AMO-kurs. Lovpålagt for bedrifter med 5+ ansatte (2024-regelverk). Digital integrasjon, fleksible løsninger og fullverdig BHT-leverandør godkjent av Arbeidstilsynet.",
  keywords: [
    "bedriftshelsetjeneste",
    "BHT",
    "Dr. Dropin BHT",
    "bedriftshelsetjeneste pris",
    "BHT lovpålagt",
    "BHT 5 ansatte",
    "BHT 2024 regelverk",
    "AMO-kurs",
    "arbeidsmiljøopplæring",
    "AMO kurs pris",
    "arbeidsmiljøloven BHT",
    "bedriftshelse Norge",
    "arbeidsplassvurdering",
    "sykefravær reduksjon",
    "HMS og BHT",
    "digital BHT",
    "beste BHT-leverandør",
    "AMO kurs online",
    "AMO kurs digital",
  ],
  authors: [{ name: "HMS Nova" }],
  creator: "HMS Nova",
  publisher: "HMS Nova",
  openGraph: {
    title: "Bedriftshelsetjeneste (BHT) | 10% Rabatt | HMS Nova + Dr. Dropin",
    description:
      "HMS Nova-kunder får 10% rabatt på BHT hos Dr. Dropin. Fullverdig bedriftshelsetjeneste integrert i ditt HMS-system. Oppfyll lovkravene og reduser sykefravær.",
    url: "https://hmsnova.com/bedriftshelsetjeneste",
    siteName: "HMS Nova",
    locale: "nb_NO",
    type: "website",
    images: [
      {
        url: "/og-image-bht.png",
        width: 1200,
        height: 630,
        alt: "HMS Nova Bedriftshelsetjeneste",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bedriftshelsetjeneste (BHT) | HMS Nova + Dr. Dropin",
    description:
      "Få 10% rabatt på BHT hos Dr. Dropin som HMS Nova-kunde. Komplett integrasjon og moderne digital løsning.",
    images: ["/og-image-bht.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://hmsnova.com/bedriftshelsetjeneste",
  },
};

export default function BHTLayout({
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

