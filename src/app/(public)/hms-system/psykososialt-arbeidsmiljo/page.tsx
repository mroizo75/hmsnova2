import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, CheckCircle2, BarChart3, Shield, ArrowRight, ArrowLeft, Users } from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import { getBreadcrumbSchema, getCanonicalUrl, getOpenGraphDefaults, getTwitterDefaults } from "@/lib/seo-config";

export const metadata: Metadata = {
  title: "Psykososialt arbeidsmiljø - Pulsundersøkelse og trivselskartlegging | HMS Nova",
  description: "Kartlegg psykososialt arbeidsmiljø med anonyme pulsundersøkelser. Oppfyll AML § 4-3 med digital trivselsmåling, trendrapporter og handlingsplaner. Fra 300 kr/mnd.",
  keywords: "psykososialt arbeidsmiljø, arbeidsmiljøundersøkelse, trivselsmåling, pulsundersøkelse, AML 4-3, medarbeiderundersøkelse, psykososial risikovurdering",
  alternates: { canonical: getCanonicalUrl("/hms-system/psykososialt-arbeidsmiljo") },
  openGraph: getOpenGraphDefaults(
    "Psykososialt arbeidsmiljø - Pulsundersøkelse | HMS Nova",
    "Kartlegg trivsel og arbeidsmiljø med anonyme pulsundersøkelser. Oppfyll AML § 4-3.",
    "/hms-system/psykososialt-arbeidsmiljo"
  ),
  twitter: getTwitterDefaults(
    "Psykososialt arbeidsmiljø - Pulsundersøkelse | HMS Nova",
    "Kartlegg trivsel og arbeidsmiljø med anonyme pulsundersøkelser. Oppfyll AML § 4-3."
  ),
};

const faqs = [
  {
    question: "Hva er psykososialt arbeidsmiljø?",
    answer: "Psykososialt arbeidsmiljø handler om de mellommenneskelige forholdene på jobb — trivsel, stress, mobbing, arbeidsmengde, lederstøtte og sosiale relasjoner. Arbeidsmiljøloven § 4-3 krever at arbeidsgiver kartlegger og iverksetter tiltak for å sikre et forsvarlig psykososialt arbeidsmiljø.",
  },
  {
    question: "Hva er en pulsundersøkelse?",
    answer: "En pulsundersøkelse er en kort, anonym spørreundersøkelse som gjennomføres regelmessig (f.eks. kvartalsvis) for å måle ansattes trivsel, stressnivå og opplevelse av arbeidsmiljøet. HMS Nova sender ut undersøkelsen automatisk og gir ledelsen trendrapporter.",
  },
  {
    question: "Er det lovpålagt å kartlegge psykososialt arbeidsmiljø?",
    answer: "Ja. Arbeidsmiljøloven § 4-3 pålegger arbeidsgiver å sørge for at arbeidstakere ikke utsettes for uheldige psykiske belastninger. Internkontrollforskriften § 5 krever systematisk kartlegging av arbeidsmiljøet, inkludert psykososiale forhold.",
  },
  {
    question: "Er svarene i pulsundersøkelsen anonyme?",
    answer: "Ja, svarene er helt anonyme. HMS Nova viser kun aggregerte resultater per avdeling eller kategori. Enkeltpersoners svar kan ikke identifiseres, noe som er avgjørende for ærlige tilbakemeldinger.",
  },
];

export default function PsykososialtPage() {
  return (
    <>
      <MultipleStructuredData dataArray={[
        getBreadcrumbSchema([
          { name: "Hjem", url: "/" },
          { name: "HMS-system", url: "/hms-system" },
          { name: "Psykososialt arbeidsmiljø", url: "/hms-system/psykososialt-arbeidsmiljo" },
        ]),
      ]} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 pt-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Hjem</Link>
            <span>/</span>
            <Link href="/hms-system" className="hover:text-foreground">HMS-system</Link>
            <span>/</span>
            <span className="text-foreground">Psykososialt arbeidsmiljø</span>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4" variant="secondary">Lovpålagt — AML § 4-3</Badge>
            <h1 className="text-5xl font-bold mb-6">Psykososialt arbeidsmiljø</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Kartlegg trivsel, stress og arbeidsmiljø med anonyme pulsundersøkelser.
              Få trendrapporter og handlingsplaner som gjør det enkelt å oppfylle lovkravene.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg">
                <Link href="/registrer-bedrift">Registrer bedrift<ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/hms-system"><ArrowLeft className="mr-2 h-5 w-5" />Tilbake til HMS-system</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-8 prose prose-lg max-w-none">
                <h2 className="text-3xl font-bold mb-4">Hvorfor kartlegge psykososialt arbeidsmiljø?</h2>
                <p>
                  <strong>Arbeidsmiljøloven § 4-3</strong> krever at arbeidsgiver sørger for et fullt forsvarlig
                  psykososialt arbeidsmiljø. Det betyr at dere må kartlegge, vurdere og iverksette tiltak mot
                  uheldige psykiske belastninger som stress, mobbing, trakassering og for høy arbeidsmengde.
                </p>
                <h3 className="text-xl font-semibold mt-6 mb-3">Lovkrav som dekkes</h3>
                <ul>
                  <li><strong>AML § 4-3</strong> — Krav til det psykososiale arbeidsmiljøet</li>
                  <li><strong>AML § 3-1</strong> — Systematisk HMS-arbeid inkludert arbeidsmiljøkartlegging</li>
                  <li><strong>IK-HMS § 5</strong> — Internkontroll med dokumentasjon av kartlegging og tiltak</li>
                  <li><strong>AML § 4-1</strong> — Generelle krav til arbeidsmiljøet</li>
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
                <CardHeader><Heart className="h-10 w-10 text-primary mb-2" /><CardTitle>Anonym pulsundersøkelse</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Korte, anonyme spørreundersøkelser sendes ut automatisk. Ansatte svarer på 2-3 minutter fra mobil eller PC.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><BarChart3 className="h-10 w-10 text-primary mb-2" /><CardTitle>Trendrapporter</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Se utviklingen over tid. Identifiser avdelinger eller temaer som trenger oppmerksomhet før det blir et problem.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CheckCircle2 className="h-10 w-10 text-primary mb-2" /><CardTitle>Handlingsplaner</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Opprett tiltak basert på resultater. Følg opp med frister og ansvarlige — alt dokumentert i systemet.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><Shield className="h-10 w-10 text-primary mb-2" /><CardTitle>GDPR-trygg</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Kun aggregerte resultater vises. Ingen enkeltpersoner kan identifiseres. Data lagres trygt innenfor EU/EØS.</p></CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">Del av HMS Nova HMS-system</h3>
            <p className="text-muted-foreground mb-6">
              Psykososialt arbeidsmiljø er en del av vårt <Link href="/hms-system" className="text-primary hover:underline">komplette HMS-system</Link>. Se også:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/hms-system/varsling"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Varsling</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Anonym varslingskanal →</p></CardContent></Card></Link>
              <Link href="/hms-system/vernerunde"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Vernerunde</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Digital vernerunde →</p></CardContent></Card></Link>
              <Link href="/hms-system/risikovurdering"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Risikovurdering</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">5x5 risikomatrise →</p></CardContent></Card></Link>
            </div>
          </div>
        </section>

        <FAQSection faqs={faqs} title="Ofte stilte spørsmål om psykososialt arbeidsmiljø" />

        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Klar til å kartlegge arbeidsmiljøet?</h2>
              <p className="text-lg mb-8 text-primary-foreground/90">Start med HMS Nova i dag. 14 dagers angrefrist, deretter 12 måneders binding.</p>
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
