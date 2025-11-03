import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "HMS-kurs & Førstehjelp | 20% rabatt for medlemmer | KKS AS",
  description:
    "HMS Nova-medlemmer får 20% rabatt på alle HMS-kurs! Lovpålagte kurs for alle bransjer via HMS Nova. Diisocyanater-kurs hos KKS AS. Egen spesialist på førstehjelp. Godkjent kursleverandør med 15+ års erfaring. Over 500 gjennomførte kurs, 2000+ fornøyde deltakere. ISO 9001.",
  keywords: [
    "HMS-kurs 20% rabatt",
    "HMS Nova medlemsfordel",
    "KKS AS",
    "HMS-kurs",
    "godkjent kursleverandør",
    "førstehjelp barn",
    "førstehjelp voksne",
    "lovpålagt HMS-opplæring",
    "verneombud kurs",
    "40-timers HMS",
    "AMO-kurs",
    "arbeidsmiljøopplæring",
    "HMS kurs for ledere",
    "psykososialt arbeidsmiljø kurs",
    "fallsikring kurs",
    "asbest opplæring",
    "diisocyanater kurs",
    "maskinsikkerhet",
    "vold og trusler kurs",
    "truck sertifikat",
    "førstehjelp sertifikat",
    "HLR kurs",
    "godkjent HMS-instruktør",
    "kompetansestyring",
    "HMS Nova kurs",
    "ISO 9001 kurs",
    "bestill HMS-kurs",
    "BHT HMS Nova",
  ],
  authors: [{ name: "HMS Nova" }],
  creator: "HMS Nova",
  publisher: "HMS Nova",
  openGraph: {
    title: "HMS-kurs & Førstehjelp | 20% rabatt for medlemmer | KKS AS",
    description:
      "HMS Nova-medlemmer får 20% rabatt på alle HMS-kurs! Lovpålagte kurs via HMS Nova. Diisocyanater-kurs hos KKS AS. 500+ gjennomførte kurs, 2000+ fornøyde deltakere. ISO 9001.",
    url: "https://hmsnova.com/hms-kurs",
    siteName: "HMS Nova",
    locale: "nb_NO",
    type: "website",
    images: [
      {
        url: "/og-image-kurs.png",
        width: 1200,
        height: 630,
        alt: "HMS Nova HMS-kurs og Førstehjelp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HMS-kurs & Førstehjelp | 20% rabatt for medlemmer",
    description:
      "HMS Nova-medlemmer får 20% rabatt på alle HMS-kurs! Lovpålagte kurs via HMS Nova. Diisocyanater-kurs hos KKS AS. 500+ gjennomførte kurs.",
    images: ["/og-image-kurs.png"],
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
    canonical: "https://hmsnova.com/hms-kurs",
  },
};

export default function HMSKursLayout({
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

