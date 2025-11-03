import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gratis HMS-håndbok | Last ned nå | HMS Nova",
  description:
    "Last ned gratis HMS-håndbok tilpasset din bransje. Over 50 sider med HMS-prosedyrer, maler og sjekklister. Oppfyller krav fra Arbeidsmiljøloven. Eller få hele HMS Nova-systemet gratis for bedrifter med 1-20 ansatte.",
  keywords: [
    "gratis HMS-håndbok",
    "HMS-håndbok mal",
    "HMS-manual",
    "HMS-prosedyrer",
    "systematisk HMS-arbeid",
    "HMS-dokumentasjon",
    "arbeidsmiljøloven krav",
    "HMS-policy",
    "HMS-rutiner",
    "bedriftens HMS-håndbok",
  ],
  openGraph: {
    title: "Gratis HMS-håndbok | Last ned nå | HMS Nova",
    description:
      "Komplett HMS-håndbok tilpasset din bransje. Over 50 sider med alt du trenger. Last ned gratis eller få hele HMS Nova-systemet.",
    url: "https://hmsnova.com/hms-handbok",
    siteName: "HMS Nova",
    locale: "nb_NO",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hmsnova.com/hms-handbok",
  },
};

export default function HMSHandbokLayout({
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

