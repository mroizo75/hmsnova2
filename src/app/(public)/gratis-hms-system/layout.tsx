import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gratis HMS-system | Komplett HMS-håndbok og Risikovurdering | HMS Nova",
  description: "Få et komplett HMS-system gratis! HMS-håndbok (42 sider), risikovurdering, opplæringsplan og vernerunde-mal. Generes automatisk basert på din bransje. Ingen kredittkort nødvendig.",
  keywords: "gratis HMS system, HMS håndbok gratis, risikovurdering mal, HMS dokumenter, HMS pakke, ISO 9001 gratis",
  openGraph: {
    title: "Gratis HMS-system - Komplett HMS-håndbok i 5 minutter",
    description: "Få 40+ siders HMS-håndbok, bransjespesifikk risikovurdering og opplæringsplan helt gratis. Ingen kredittkort.",
    type: "website",
  },
};

export default function GratisHMSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

