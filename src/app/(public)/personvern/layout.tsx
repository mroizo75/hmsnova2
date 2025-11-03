import type { Metadata } from "next";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Personvernerklæring | GDPR | KKS AS & HMS Nova",
  description:
    "Les hvordan KKS AS behandler personopplysninger i HMS Nova. GDPR-compliant personvernerklæring som forklarer dine rettigheter, hvordan vi samler inn og bruker data, og hvordan du kan kontakte oss.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hmsnova.com/personvern",
  },
};

export default function PersonvernLayout({
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

