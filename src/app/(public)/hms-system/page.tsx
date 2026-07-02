import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  ClipboardCheck,
  FileCheck,
  TrendingUp,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { TrustBadges } from "@/components/trust-badges";

export const metadata: Metadata = {
  title: "HMS-system - Komplett guide og oversikt | HMS Nova",
  description: "Alt du trenger å vite om HMS-systemer. Lær om risikovurdering, vernerunde, avvikshåndtering, digital signatur og ISO 9001. Komplett guide fra HMS Nova.",
  keywords: "hms-system, hms system norge, hms programvare, hms software, digitalt hms, hms løsning",
  openGraph: {
    title: "HMS-system - Komplett guide og oversikt",
    description: "Alt om HMS-systemer: Funksjoner, fordeler og hvordan velge riktig løsning for din bedrift.",
  },
};

// Content clusters - disse sidene skal lenke hit og tilbake
const HMS_SYSTEM_TOPICS = [
  {
    title: "Risikovurdering",
    description: "Identifiser, vurder og håndter risiko i arbeidsplassen. Strukturert og systematisk.",
    icon: AlertTriangle,
    href: "/hms-system/risikovurdering",
    badge: "Kritisk",
  },
  {
    title: "Digital signatur",
    description: "Elektronisk godkjenning av HMS-dokumenter. Spar tid og øk etterlevelse.",
    icon: FileCheck,
    href: "/hms-system/digital-signatur",
    badge: "Populært",
  },
  {
    title: "Vernerunde",
    description: "Digitale vernerunder med automatiske påminnelser og enkel dokumentasjon.",
    icon: Users,
    href: "/hms-system/vernerunde",
    badge: "Lovpålagt",
  },
  {
    title: "Avvikshåndtering",
    description: "Registrer, følg opp og lær av avvik. Fra mobilapp til ferdig rapport.",
    icon: ClipboardCheck,
    href: "/hms-system/avvikshandtering",
    badge: "Essensielt",
  },
  {
    title: "ISO 9001 sertifisering",
    description: "Innebygd støtte for ISO 9001:2015. Alle krav dekket ut av boksen.",
    icon: CheckCircle2,
    href: "/hms-system/iso-9001",
    badge: "Sertifisering",
  },
  {
    title: "Dokumenthåndtering",
    description: "Sentral lagring av alle HMS-dokumenter. Versjonskontr og tilgangsstyring.",
    icon: FileText,
    href: "/hms-system/dokumenter",
    badge: "Organisering",
  },
];

const faqs = [
  {
    question: "Hva er et HMS-system?",
    answer: `Et HMS-system er et digitalt verktøy for å organisere og systematisere helse, miljø og sikkerhet (HMS) i bedrifter. 
    HMS Nova er Norges mest moderne HMS-system som digitaliserer hele HMS-arbeidet - fra risikovurdering til hendelsesrapportering.
    Systemet sikrer at bedriften oppfyller lovkrav i Arbeidsmiljøloven og Internkontrollforskriften.`,
  },
  {
    question: "Hvorfor trenger bedrifter et HMS-system?",
    answer: `Alle norske arbeidsgivere er pålagt å ha systematisk HMS-arbeid (internkontroll). 
    Et digitalt HMS-system gjør dette enkelt ved å:
    • Strukturere HMS-arbeidet
    • Automatisere påminnelser
    • Sikre dokumentasjon
    • Spare tid (10+ timer/uke)
    • Redusere risiko for bøter fra Arbeidstilsynet`,
  },
  {
    question: "Hva koster et HMS-system?",
    answer: `HMS Nova koster 300 kr/mnd + mva (3 600 kr/år + mva) med 12 måneders binding. 
    Ubegrenset antall brukere inkludert. Digital signatur, mobilapp og alle funksjoner er inkludert i prisen. 
    Ingen oppstartskostnader eller skjulte avgifter.`,
  },
  {
    question: "Hva er forskjellen på HMS Nova og konkurrentene?",
    answer: `HMS Nova skiller seg ut ved å være:
    • 100% digitalt og moderne (ikke legacy-system)
    • Betydelig billigere (300 kr/mnd + mva vs 500-1200 kr/mnd hos konkurrentene)
    • Ingen skjult ekstrakostnader for digital signatur
    • Forutsigbar prismodell med 12 måneders binding
    • Mobilapp med offline-støtte
    • Norsk kundeservice`,
  },
];

export default function HMSSystemPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4" variant="secondary">
          Pillar Guide
        </Badge>
        <h1 className="text-5xl font-bold mb-6">
          HMS-system: Komplett guide
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Alt du trenger å vite om HMS-systemer. Fra risikovurdering til ISO 9001 sertifisering.
          Lær hvordan HMS Nova bygger trygghet i norske bedrifter.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/registrer-bedrift">
              Kom i gang gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/priser">
              Se priser
            </Link>
          </Button>
        </div>
      </section>

      {/* Intro Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold mb-4">Hva er et HMS-system?</h2>
              <p>
                Et <strong>HMS-system</strong> er en digital plattform som hjelper bedrifter med å:
              </p>
              <ul>
                <li>Oppfylle lovkrav i Arbeidsmiljøloven og Internkontrollforskriften</li>
                <li>Systematisere HMS-arbeid (helse, miljø og sikkerhet)</li>
                <li>Forebygge ulykker og sykefravær</li>
                <li>Dokumentere alt HMS-arbeid på ett sted</li>
                <li>Spare tid på administrasjon (10+ timer per uke)</li>
              </ul>
              
              <p className="text-lg font-semibold text-primary mt-6">
                HMS Nova bygger trygghet ved å digitalisere hele HMS-arbeidet - fra små bedrifter til store konsern.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Topics Grid - Content Clusters */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            HMS-system funksjoner og moduler
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Utforsk de ulike delene av et moderne HMS-system. Klikk på hvert emne for å lære mer.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {HMS_SYSTEM_TOPICS.map((topic) => (
            <Link key={topic.href} href={topic.href}>
              <Card className="h-full hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <topic.icon className="h-10 w-10 text-primary" />
                    <Badge variant="secondary">{topic.badge}</Badge>
                  </div>
                  <CardTitle>{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between">
                    Les mer
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Digital HMS */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Hvorfor velge digitalt HMS-system?
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Spar tid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Fra 10+ timer/uke på HMS-administrasjon til bare noen få minutter. 
                  Automatisering og digitalisering frigjør tid til viktigere oppgaver.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Reduser risiko</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Systematisk HMS-arbeid reduserer ulykker og sykefravær. 
                  Dokumentasjon sikrer deg mot bøter fra Arbeidstilsynet.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Oppfyll lovkrav</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Innebygd støtte for Arbeidsmiljøloven, Internkontrollforskriften og ISO 9001. 
                  Alt du trenger på ett sted.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Full dokumentasjon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Alle HMS-dokumenter samlet digitalt. Versjonshistorikk, tilgangsstyring 
                  og enkel søk. Aldri gå glipp av viktig informasjon.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="container mx-auto px-4 py-12">
        <TrustBadges variant="default" />
      </section>

      {/* FAQ */}
      <FAQSection 
        faqs={faqs}
        title="Ofte stilte spørsmål om HMS-systemer"
        description="Svar på de vanligste spørsmålene om HMS-systemer"
      />

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Klar til å digitalisere HMS-arbeidet?
            </h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Test HMS Nova gratis i 14 dager. Se hvordan et moderne HMS-system 
              kan transformere din bedrift.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-gray-100">
                <Link href="/registrer-bedrift">
                  Kom i gang gratis
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                className="border-2 border-white text-white hover:bg-white/10"
              >
                <Link href="/registrer-bedrift">
                  Last ned gratis HMS-pakke
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
