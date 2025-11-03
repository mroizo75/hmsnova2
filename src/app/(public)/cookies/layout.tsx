import type { Metadata } from "next";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Cookie-policy | Informasjonskapsler | KKS AS & HMS Nova",
  description:
    "Les hvordan HMS Nova bruker cookies (informasjonskapsler). GDPR-compliant oversikt over strengt nødvendige, funksjonelle, analyse- og markedsførings-cookies. Administrer dine cookie-preferanser.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hmsnova.com/cookies",
  },
};

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main className="min-h-screen">{children}</main>
      <PublicFooter />
    </>
  );
}

