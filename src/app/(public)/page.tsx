import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/scroll-reveal";
import { RegisterDialog } from "@/components/register-dialog";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import {
  PAGE_METADATA,
  getOpenGraphDefaults,
  getTwitterDefaults,
  getCanonicalUrl,
  SOFTWARE_PRODUCT_SCHEMA,
  FAQ_SCHEMA,
  getBreadcrumbSchema,
  ROBOTS_CONFIG,
} from "@/lib/seo-config";
import { 
  CheckCircle2, 
  Shield, 
  Users, 
  FileText, 
  TrendingUp, 
  Lock,
  Zap,
  Globe,
  HeartHandshake,
  ArrowRight
} from "lucide-react";

export const metadata: Metadata = {
  title: PAGE_METADATA.home.title,
  description: PAGE_METADATA.home.description,
  keywords: PAGE_METADATA.home.keywords,
  alternates: {
    canonical: getCanonicalUrl("/"),
  },
  robots: ROBOTS_CONFIG,
  openGraph: getOpenGraphDefaults(
    PAGE_METADATA.home.title,
    PAGE_METADATA.home.description,
    "/"
  ),
  twitter: getTwitterDefaults(
    PAGE_METADATA.home.title,
    PAGE_METADATA.home.description
  ),
};

export default function HomePage() {
  const structuredDataArray = [
    SOFTWARE_PRODUCT_SCHEMA,
    FAQ_SCHEMA,
    getBreadcrumbSchema([{ name: "Hjem", url: "/" }]),
  ];

  return (
    <>
      <MultipleStructuredData dataArray={structuredDataArray} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section - StoryBrand: Character */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-6">
          🛡️ HMS Nova Bygger Trygghet
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold mb-8 relative z-10">
          <span className="bg-clip-text text-primary">
            Norges mest moderne<br />HMS-system
          </span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto relative z-0">
          HMS Nova bygger trygghet gjennom digitalisering. Slutt med Excel-ark og papirrot. 
          Få et komplett HMS-system med digital signatur, mobilapp og ISO 9001 compliance – 
          som faktisk fungerer i praksis.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <RegisterDialog>
            <Button size="lg" className="text-lg px-8">
              Kom i gang nå
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Button>
          </RegisterDialog>
          <Link href="/gratis-hms-system">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Få gratis HMS-pakke
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          ✓ Ingen kredittkort nødvendig  ✓ Full tilgang  ✓ Norsk support
        </p>
      </section>

      {/* Problem Section - StoryBrand: Problem */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Kjenner du deg igjen?
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-8">
            <ScrollReveal delay={100}>
              <Card className="border-destructive/20">
                <CardHeader>
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">📄</span>
                </div>
                <CardTitle>Papirrot overalt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Du bruker timer på å lete etter riktig versjon av dokumenter. 
                  Excel-ark forsvinner, og ingen vet hva som er gjeldende prosedyre.
                </p>
              </CardContent>
            </Card>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <span className="text-2xl">⏰</span>
                  </div>
                  <CardTitle>Revisjonsangst</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Hver revisjon er en mareritt. Du vet ikke om dere er compliant, 
                    og håper bare dere kommer gjennom uten merknader.
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <span className="text-2xl">😰</span>
                  </div>
                  <CardTitle>Ingen deltar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    De ansatte gidder ikke fylle ut skjemaer. HMS blir bare noe 
                    "du må gjøre", ikke noe som faktisk skaper verdi.
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Solution Section - StoryBrand: Guide & Plan */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal direction="fade">
            <Badge variant="default" className="mb-4">
              Løsningen
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ett system. Null stress. Full kontroll.
            </h2>
            <p className="text-xl text-muted-foreground mb-12">
              HMS Nova gjør HMS-arbeid så enkelt at alle faktisk <em>vil</em> bruke det.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6 text-left">
            <ScrollReveal delay={100} direction="left">
              <Card>
                <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>Digital signatur</CardTitle>
                </div>
              </CardHeader>
                <CardContent>
                <p className="text-muted-foreground">
                  Juridisk bindende signaturer direkte i systemet. Ingen utskrift, skanning eller papirrot.
                </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={200} direction="right">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>Automatiske påminnelser</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                <p className="text-muted-foreground">
                  Få varsel før sertifikater utløper, vernerunder skal gjennomføres eller dokumenter må revideres.
                </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={300} direction="left">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>Mobilapp for byggeplassen</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                <p className="text-muted-foreground">
                  Gjennomfør vernerunder og rapporter hendelser direkte fra mobilen. Fungerer offline.
                </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={400} direction="right">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>ISO 9001 compliance</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                <p className="text-muted-foreground">
                  Bygget etter ISO 9001-standarden. Bestå revisjoner med glans, helt automatisk.
                </p>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Alt du trenger for et trygt arbeidsmiljø
          </h2>
          <p className="text-muted-foreground">
            Én plattform. Alle HMS-behov. Ingen kompromisser.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" aria-hidden="true" />
              <CardTitle>Dokumenthåndtering</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Versjonskontroll og sporbarhet</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Godkjenningsflyt</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Automatisk arkivering</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" aria-hidden="true" />
              <CardTitle>Risikovurdering</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>5x5 matrise (ISO 9001)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Tiltaksoppfølging</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Revisjonshistorikk</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" aria-hidden="true" />
              <CardTitle>Hendelsesrapportering</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Mobil app for feltarbeid</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>5 Whys-analyse</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Automatisk oppfølging</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-primary mb-2" aria-hidden="true" />
              <CardTitle>Opplæring</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Kompetansematrise</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Kurs og sertifikater</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Fornyelsespåminnelser</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Lock className="h-8 w-8 text-primary mb-2" aria-hidden="true" />
              <CardTitle>Revisjoner</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Interne revisjoner</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Funn og avvik</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Korrigerende tiltak</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-primary mb-2" aria-hidden="true" />
              <CardTitle>Automatisering</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>E-post påminnelser</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Rapportgenerering</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Workflow-styring</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Section - StoryBrand: Success */}
      <section className="container mx-auto px-4 py-20">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Hva skjer når HMS faktisk fungerer?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ikke bare bedre dokumentasjon. Bedre arbeidsmiljø. Tryggere folk. Bedre lønnsomhet.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <ScrollReveal delay={100}>
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Zap className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">Spar 10 timer per uke</h3>
              <p className="text-sm text-muted-foreground">
                Mindre administrasjon. Mer tid til det som betyr noe: Å faktisk forbedre arbeidsmiljøet.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">Bestå revisjoner første gang</h3>
              <p className="text-sm text-muted-foreground">
                Ingen mer revisjonsangst. Alt er dokumentert, sporbart og compliant.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Users className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">Engasjerte ansatte</h3>
              <p className="text-sm text-muted-foreground">
                Når HMS er enkelt, deltar folk. Rapporter kommer inn. Tiltak blir fulgt opp.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="default" className="mb-4">
            100% Compliant
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Bygget for norsk lov og ISO 9001
          </h2>
          <p className="text-muted-foreground mb-12">
            HMS Nova følger alle krav i Arbeidsmiljøloven, Internkontrollforskriften og ISO 9001.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Globe className="h-8 w-8 text-primary mb-2 mx-auto" aria-hidden="true" />
                <CardTitle className="text-center">ISO 9001:2015</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                Full støtte for alle krav i ISO 9001-standarden
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2 mx-auto" />
                <CardTitle className="text-center">Internkontroll</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                Oppfyller kravene i Internkontrollforskriften
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <HeartHandshake className="h-8 w-8 text-primary mb-2 mx-auto" aria-hidden="true" />
                <CardTitle className="text-center">Arbeidsmiljøloven</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                Følger alle krav til systematisk HMS-arbeid
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - StoryBrand: Call to Action */}
      <section className="container mx-auto px-4 py-20">
        <ScrollReveal direction="fade" delay={200}>
          <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Klar til å komme i gang?</h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Test HMS Nova gratis i 14 dager. Ingen kredittkort. Ingen forpliktelser.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <RegisterDialog>
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Kom i gang nå
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </RegisterDialog>
              <Link href="/gratis-hms-system">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  Få gratis HMS-pakke
                </Button>
              </Link>
            </div>
            <p className="text-sm mt-6 text-primary-foreground/70">
              Over 500 norske bedrifter stoler på HMS Nova
            </p>
            </CardContent>
          </Card>
        </ScrollReveal>
      </section>
    </div>
    </>
  );
}
