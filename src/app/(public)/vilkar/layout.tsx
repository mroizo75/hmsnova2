import type { Metadata } from "next";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Bruksvilkår | Terms of Service | KKS AS & HMS Nova",
  description:
    "Les bruksvilkårene for HMS Nova. Informasjon om priser, betaling, oppsigelse, brukerens plikter, ansvarsbegrensning og dine rettigheter som kunde hos KKS AS.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hmsnova.com/vilkar",
  },
};

export default function VilkarLayout({
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

