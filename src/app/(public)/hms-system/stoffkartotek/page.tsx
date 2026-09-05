import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, CheckCircle2, FileText, Shield, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import { getBreadcrumbSchema, getCanonicalUrl, getOpenGraphDefaults, getTwitterDefaults } from "@/lib/seo-config";

export const metadata: Metadata = {
  title: "Stoffkartotek og eksponeringsregister - Digital kjemikaliestyring | HMS Nova",
  description: "Digitalt stoffkartotek med sikkerhetsdatablad og lovpålagt eksponeringsregister. Oppfyll forskrift om tiltaksverdier og AML § 4-5. Alle kjemikalier samlet i ett system.",
  keywords: "stoffkartotek, eksponeringsregister, sikkerhetsdatablad, kjemikalieregister, SDS, kjemisk helsefare, tiltaksverdier, grenseverdier, AML 4-5",
  alternates: { canonical: getCanonicalUrl("/hms-system/stoffkartotek") },
  openGraph: getOpenGraphDefaults(
    "Stoffkartotek og eksponeringsregister | HMS Nova",
    "Digitalt stoffkartotek med sikkerhetsdatablad og lovpålagt eksponeringsregister.",
    "/hms-system/stoffkartotek"
  ),
  twitter: getTwitterDefaults(
    "Stoffkartotek og eksponeringsregister | HMS Nova",
    "Digitalt stoffkartotek med sikkerhetsdatablad og lovpålagt eksponeringsregister."
  ),
};

const faqs = [
  {
    question: "Hva er et stoffkartotek?",
    answer: "Et stoffkartotek er en oversikt over alle kjemiske stoffer og produkter som brukes i bedriften. For hvert stoff skal det foreligge et oppdatert sikkerhetsdatablad (SDS). Alle norske bedrifter som håndterer kjemikalier er pålagt å ha stoffkartotek etter forskrift om utførelse av arbeid § 2-1.",
  },
  {
    question: "Hva er et eksponeringsregister?",
    answer: "Et eksponeringsregister er et lovpålagt register over arbeidstakere som eksponeres for helsefarlige stoffer, støv, stråling eller biologiske faktorer. Registeret skal oppbevares i minst 60 år etter at eksponeringen opphørte (AML § 4-5, forskrift om utførelse av arbeid kap. 31).",
  },
  {
    question: "Hvilke bedrifter trenger stoffkartotek?",
    answer: "Alle bedrifter som bruker, håndterer eller lagrer kjemiske stoffer trenger stoffkartotek. Dette gjelder alt fra rengjøringsmidler på kontoret til industrielle kjemikalier. Selv små mengder utløser plikten.",
  },
  {
    question: "Hvordan holder HMS Nova stoffkartoteket oppdatert?",
    answer: "HMS Nova gir deg digitalt stoffkartotek der du kan laste opp og organisere sikkerhetsdatablad, knytte dem til arbeidsoperasjoner og sette påminnelser for oppdatering. Eksponeringsregisteret loggfører automatisk hvem som ble eksponert, varighet og målte verdier.",
  },
];

export default function StoffkartotekPage() {
  return (
    <>
      <MultipleStructuredData dataArray={[
        getBreadcrumbSchema([
          { name: "Hjem", url: "/" },
          { name: "HMS-system", url: "/hms-system" },
          { name: "Stoffkartotek", url: "/hms-system/stoffkartotek" },
        ]),
      ]} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 pt-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Hjem</Link>
            <span>/</span>
            <Link href="/hms-system" className="hover:text-foreground">HMS-system</Link>
            <span>/</span>
            <span className="text-foreground">Stoffkartotek og eksponeringsregister</span>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4" variant="secondary">Lovpålagt — AML § 4-5</Badge>
            <h1 className="text-5xl font-bold mb-6">Stoffkartotek og eksponeringsregister</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Samle alle sikkerhetsdatablad, kjemikalier og eksponeringsdata i ett digitalt system.
              Oppfyll lovkravene uten papirarbeid.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg"><Link href="/registrer-bedrift">Registrer bedrift<ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/hms-system"><ArrowLeft className="mr-2 h-5 w-5" />Tilbake til HMS-system</Link></Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-8 prose prose-lg max-w-none">
                <h2 className="text-3xl font-bold mb-4">Lovkrav for kjemikaliehåndtering</h2>
                <p>
                  Norske bedrifter har strenge krav til håndtering av kjemiske stoffer og dokumentasjon av eksponering.
                  HMS Nova hjelper deg å oppfylle alle kravene digitalt.
                </p>
                <h3 className="text-xl font-semibold mt-6 mb-3">Relevante lovkrav</h3>
                <ul>
                  <li><strong>AML § 4-5</strong> — Særlig om kjemisk og biologisk helsefare</li>
                  <li><strong>Forskrift om utførelse av arbeid § 2-1</strong> — Krav om stoffkartotek</li>
                  <li><strong>Forskrift om utførelse av arbeid kap. 31</strong> — Eksponeringsregister (60 års oppbevaring)</li>
                  <li><strong>Forskrift om tiltaks- og grenseverdier</strong> — Dokumentasjon av målte verdier vs. grenseverdier</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Slik fungerer det i HMS Nova</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><FlaskConical className="h-10 w-10 text-primary mb-2" /><CardTitle>Digitalt stoffkartotek</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Last opp sikkerhetsdatablad, kategoriser kjemikalier og knytt dem til arbeidsoperasjoner. Alt søkbart og tilgjengelig for alle ansatte.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><FileText className="h-10 w-10 text-primary mb-2" /><CardTitle>Eksponeringsregister</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Loggfør eksponering per arbeidstaker med stoff, varighet, målte verdier og beskyttelsestiltak. Oppbevares i 60 år som loven krever.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><AlertTriangle className="h-10 w-10 text-primary mb-2" /><CardTitle>Grenseverdier</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Sammenlign målte verdier mot tiltaks- og grenseverdier. Få varsler når verdier nærmer seg eller overskrider grensen.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><Shield className="h-10 w-10 text-primary mb-2" /><CardTitle>Revisjonsklart</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Generer rapport over alle kjemikalier, SDS-status og eksponeringsdata — klar for Arbeidstilsynet eller ISO-revisjon.</p></CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">Del av HMS Nova HMS-system</h3>
            <p className="text-muted-foreground mb-6">Se også:</p>
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/hms-system/sja"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">SJA</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Sikker Jobb Analyse →</p></CardContent></Card></Link>
              <Link href="/hms-system/risikovurdering"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Risikovurdering</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">5x5 risikomatrise →</p></CardContent></Card></Link>
              <Link href="/hms-system/vernerunde"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Vernerunde</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Digital vernerunde →</p></CardContent></Card></Link>
            </div>
          </div>
        </section>

        <FAQSection faqs={faqs} title="Ofte stilte spørsmål om stoffkartotek og eksponering" />

        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Få kontroll på kjemikaliene</h2>
              <p className="text-lg mb-8 text-primary-foreground/90">Digitalt stoffkartotek og eksponeringsregister fra dag 1. 14 dagers angrefrist.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-gray-100"><Link href="/registrer-bedrift">Registrer bedrift</Link></Button>
                <Button asChild size="lg" className="border-2 border-white text-white hover:bg-white/10"><Link href="/priser">Se priser</Link></Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
