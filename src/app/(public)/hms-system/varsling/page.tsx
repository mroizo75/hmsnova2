import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, CheckCircle2, Lock, Shield, ArrowRight, ArrowLeft, Eye } from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import { getBreadcrumbSchema, getCanonicalUrl, getOpenGraphDefaults, getTwitterDefaults } from "@/lib/seo-config";

export const metadata: Metadata = {
  title: "Varsling - Anonym varslingskanal for arbeidsplassen | HMS Nova",
  description: "Lovpålagt varslingskanal etter AML kapittel 2A. Anonym og trygg varsling av kritikkverdige forhold. Sporbar saksbehandling og full GDPR-compliance.",
  keywords: "varsling, varslingskanal, whistleblowing, anonym varsling, AML 2A, varsle om kritikkverdige forhold, varslingsrutiner, arbeidsmiljøloven varsling",
  alternates: { canonical: getCanonicalUrl("/hms-system/varsling") },
  openGraph: getOpenGraphDefaults(
    "Varsling - Anonym varslingskanal | HMS Nova",
    "Lovpålagt varslingskanal etter AML kapittel 2A. Anonym, trygg og sporbar.",
    "/hms-system/varsling"
  ),
  twitter: getTwitterDefaults(
    "Varsling - Anonym varslingskanal | HMS Nova",
    "Lovpålagt varslingskanal etter AML kapittel 2A. Anonym, trygg og sporbar."
  ),
};

const faqs = [
  {
    question: "Er varslingskanal lovpålagt?",
    answer: "Ja. Bedrifter med minst 5 ansatte er pålagt å ha rutiner for intern varsling etter Arbeidsmiljøloven § 2A-6. Rutinene skal gjøre det enkelt og trygt å varsle om kritikkverdige forhold.",
  },
  {
    question: "Hva er kritikkverdige forhold?",
    answer: "Kritikkverdige forhold inkluderer brudd på lov eller forskrift, brudd på etiske retningslinjer, fare for liv og helse, korrupsjon, diskriminering, trakassering og andre alvorlige forhold som strider mot allmenne interesser.",
  },
  {
    question: "Kan man varsle anonymt i HMS Nova?",
    answer: "Ja. HMS Nova tilbyr fullstendig anonym varsling. Varsleren kan kommunisere med saksbehandler gjennom en kryptert kanal uten å oppgi identitet. Varsleren får et sporingsnummer for å følge saken.",
  },
  {
    question: "Hvem behandler varslene?",
    answer: "Bedriften utpeker hvem som skal ha tilgang til varslene. Typisk er dette daglig leder, HMS-ansvarlig eller et eget varslingsutvalg. HMS Nova sikrer at kun autoriserte personer ser innholdet.",
  },
];

export default function VarslingPage() {
  return (
    <>
      <MultipleStructuredData dataArray={[
        getBreadcrumbSchema([
          { name: "Hjem", url: "/" },
          { name: "HMS-system", url: "/hms-system" },
          { name: "Varsling", url: "/hms-system/varsling" },
        ]),
      ]} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 pt-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Hjem</Link>
            <span>/</span>
            <Link href="/hms-system" className="hover:text-foreground">HMS-system</Link>
            <span>/</span>
            <span className="text-foreground">Varsling</span>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4" variant="secondary">Lovpålagt — AML kap. 2A</Badge>
            <h1 className="text-5xl font-bold mb-6">Varsling og varslingskanal</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Trygg, anonym og lovpålagt varslingskanal. La ansatte melde fra om kritikkverdige forhold
              uten frykt for represalier — med sporbar saksbehandling.
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
                <h2 className="text-3xl font-bold mb-4">Lovkrav for varsling</h2>
                <p>
                  Arbeidsmiljøloven kapittel 2A gir alle arbeidstakere rett til å varsle om kritikkverdige
                  forhold. Arbeidsgivere med 5 eller flere ansatte plikter å utarbeide rutiner for intern varsling.
                </p>
                <h3 className="text-xl font-semibold mt-6 mb-3">Relevante lovkrav</h3>
                <ul>
                  <li><strong>AML § 2A-1</strong> — Rett til å varsle om kritikkverdige forhold</li>
                  <li><strong>AML § 2A-3</strong> — Arbeidsgivers aktivitetsplikt ved mottak av varsel</li>
                  <li><strong>AML § 2A-4</strong> — Forbud mot gjengjeldelse</li>
                  <li><strong>AML § 2A-6</strong> — Plikt til å utarbeide rutiner for intern varsling</li>
                  <li><strong>AML § 2A-7</strong> — Taushetsplikt om varslerens identitet</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Slik fungerer varsling i HMS Nova</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><Flag className="h-10 w-10 text-primary mb-2" /><CardTitle>Anonym varsling</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Ansatte kan varsle helt anonymt via en egen varslingsportal. Ingen innlogging kreves — bare bedriftens varslingslenke.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><Lock className="h-10 w-10 text-primary mb-2" /><CardTitle>Kryptert kommunikasjon</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Varsleren kan kommunisere med saksbehandler via en kryptert kanal med sporingsnummer, uten å avsløre identitet.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><Eye className="h-10 w-10 text-primary mb-2" /><CardTitle>Sporbar saksbehandling</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Full audit trail: hvem mottok varselet, når ble det behandlet, hvilke tiltak ble iverksatt. Oppfyller AML § 2A-3.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><Shield className="h-10 w-10 text-primary mb-2" /><CardTitle>Vern mot gjengjeldelse</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Systemet sikrer taushetsplikt om varslerens identitet. Kun autoriserte saksbehandlere har tilgang.</p></CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">Del av HMS Nova HMS-system</h3>
            <p className="text-muted-foreground mb-6">Se også:</p>
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/hms-system/psykososialt-arbeidsmiljo"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Psykososialt arbeidsmiljø</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Trivselskartlegging →</p></CardContent></Card></Link>
              <Link href="/hms-system/avvikshandtering"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Avvikshåndtering</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Registrer og følg opp →</p></CardContent></Card></Link>
              <Link href="/hms-system/risikovurdering"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Risikovurdering</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">5x5 risikomatrise →</p></CardContent></Card></Link>
            </div>
          </div>
        </section>

        <FAQSection faqs={faqs} title="Ofte stilte spørsmål om varsling" />

        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Oppfyll varslingsplikten i dag</h2>
              <p className="text-lg mb-8 text-primary-foreground/90">Lovpålagt varslingskanal inkludert i HMS Nova. 14 dagers angrefrist.</p>
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
