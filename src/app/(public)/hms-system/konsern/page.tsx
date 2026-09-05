import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, BarChart3, Send, Shield, ArrowRight, ArrowLeft, Users } from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import { getBreadcrumbSchema, getCanonicalUrl, getOpenGraphDefaults, getTwitterDefaults } from "@/lib/seo-config";

export const metadata: Metadata = {
  title: "Konsern HMS-løsning - Administrer HMS på tvers av selskaper | HMS Nova",
  description: "HMS-løsning for konsern og kjeder. Samlet HMS-score, innholdsdistribusjon, rapportering på tvers av datterselskaper og sentralisert styring. Fra 300 kr/mnd per bedrift.",
  keywords: "konsern HMS, HMS konsernløsning, HMS kjede, multi-tenant HMS, HMS flere selskaper, konsern rapportering, HMS datterselskap, sentralisert HMS",
  alternates: { canonical: getCanonicalUrl("/hms-system/konsern") },
  openGraph: getOpenGraphDefaults(
    "Konsern HMS-løsning | HMS Nova",
    "Administrer HMS på tvers av datterselskaper. Samlet rapportering og sentralisert styring.",
    "/hms-system/konsern"
  ),
  twitter: getTwitterDefaults(
    "Konsern HMS-løsning | HMS Nova",
    "Administrer HMS på tvers av datterselskaper. Samlet rapportering og sentralisert styring."
  ),
};

const faqs = [
  {
    question: "Hvem passer konsern-løsningen for?",
    answer: "Konsern-løsningen passer for organisasjoner med flere juridiske enheter som deler HMS-ansvar — konsern med datterselskaper, franchise-kjeder, hotellkjeder, entreprenører med underselskaper, og kommunale virksomheter med flere enheter.",
  },
  {
    question: "Hva er HMS-score?",
    answer: "HMS-score er en samlet indikator (0-100%) som måler hvor godt hver bedrift i konsernet presterer på HMS-arbeid. Scoren beregnes basert på rutineetterlevelse, risikovurderinger, dokumenter, vernerunder, opplæring og hendelseshåndtering.",
  },
  {
    question: "Kan vi distribuere rutiner og dokumenter til alle datterselskaper?",
    answer: "Ja. Konsern-portalen har innholdsdistribusjon som lar konsernledelsen sende ut rutiner, policyer, HMS-håndbøker og annet innhold til alle eller utvalgte datterselskaper. Mottakerne får varsling og kan bekrefte mottakelse.",
  },
  {
    question: "Koster det ekstra for konsern-funksjonen?",
    answer: "Konsern-portalen er inkludert for bedrifter som har HMS Nova. Hver bedrift i konsernet betaler 300 kr/mnd. Konsern-administrasjonen er gratis — det er en del av plattformen.",
  },
];

export default function KonsernPage() {
  return (
    <>
      <MultipleStructuredData dataArray={[
        getBreadcrumbSchema([
          { name: "Hjem", url: "/" },
          { name: "HMS-system", url: "/hms-system" },
          { name: "Konsern", url: "/hms-system/konsern" },
        ]),
      ]} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 pt-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Hjem</Link>
            <span>/</span>
            <Link href="/hms-system" className="hover:text-foreground">HMS-system</Link>
            <span>/</span>
            <span className="text-foreground">Konsern</span>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4" variant="secondary">For konsern og kjeder</Badge>
            <h1 className="text-5xl font-bold mb-6">HMS-løsning for konsern</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Administrer HMS på tvers av datterselskaper fra én portal. Samlet HMS-score,
              innholdsdistribusjon og rapportering — uten å miste kontroll.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg"><Link href="/registrer-bedrift">Registrer bedrift<ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/hms-system"><ArrowLeft className="mr-2 h-5 w-5" />Tilbake til HMS-system</Link></Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <Image
                  src="/images/konsern-losning.png"
                  alt="HMS Nova konsernportal — oversikt over bedrifter med HMS-score"
                  width={1200}
                  height={675}
                  className="w-full h-auto"
                  priority
                />
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Konsernportalen gir full oversikt over HMS-status i alle datterselskaper
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Funksjoner i konsern-portalen</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><BarChart3 className="h-10 w-10 text-primary mb-2" /><CardTitle>Samlet HMS-score</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Se HMS-score for hvert datterselskap i sanntid. Identifiser hvem som presterer godt og hvem som trenger oppfølging.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><Send className="h-10 w-10 text-primary mb-2" /><CardTitle>Innholdsdistribusjon</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Distribuer rutiner, policyer og HMS-håndbøker fra sentralt hold. Mottakerne bekrefter mottak med lesebekreftelse.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><Users className="h-10 w-10 text-primary mb-2" /><CardTitle>Tverrgående rapportering</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Samlet statistikk over avvik, risikovurderinger, vernerunder og kompetanse på tvers av alle selskaper.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><Shield className="h-10 w-10 text-primary mb-2" /><CardTitle>Rollebasert tilgang</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Konsern-admin, HMS-leder og lesetilgang. Hver rolle ser kun det som er relevant — full sporbarhet i revisjonsloggen.</p></CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">Del av HMS Nova HMS-system</h3>
            <p className="text-muted-foreground mb-6">Se også:</p>
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/hms-system/psykososialt-arbeidsmiljo"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Psykososialt arbeidsmiljø</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Kartlegg på tvers →</p></CardContent></Card></Link>
              <Link href="/hms-system/varsling"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Varsling</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Anonym varslingskanal →</p></CardContent></Card></Link>
              <Link href="/hms-system/risikovurdering"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Risikovurdering</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">5x5 risikomatrise →</p></CardContent></Card></Link>
            </div>
          </div>
        </section>

        <FAQSection faqs={faqs} title="Ofte stilte spørsmål om konsern-løsningen" />

        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Samle HMS-arbeidet i konsernet</h2>
              <p className="text-lg mb-8 text-primary-foreground/90">En portal for alle datterselskaper. Kontakt oss for en demo.</p>
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
