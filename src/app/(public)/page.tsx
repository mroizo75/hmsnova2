import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/scroll-reveal";
import { RegisterDialog } from "@/components/register-dialog";
import { RingMegDialog } from "@/components/ring-meg-dialog";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import { FAQSection } from "@/components/faq-section";
import { getFAQsForPage } from "@/lib/faq-data";
import { TrustBadges } from "@/components/trust-badges";
import { ProductShowcase } from "@/components/product-showcase";
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
  ArrowRight,
  Clock,
  ClipboardCheck,
  Star,
  ChevronRight,
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

        {/* ═══════════════════════════════════════════
            HERO — 5-sekunders-testen:
            HVA er dette? HVEM er det for? HVA koster det? HVA gjør jeg nå?
        ═══════════════════════════════════════════ */}
        <section className="container mx-auto px-4 pt-16 pb-20 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex -space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
              ))}
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Brukt av 500+ norske bedrifter
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">Få komplett HMS-system</span>
            <br />
            <span className="text-primary">klar til bruk i dag</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
            Alt du trenger for å oppfylle kravene fra Arbeidstilsynet – avvik, risiko,
            vernerunder, dokumenter og HMS-håndbok – samlet i ett enkelt system.
          </p>

          <p className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
            Fra <span className="text-primary">300 kr/mnd</span>
            <span className="text-base font-normal text-muted-foreground ml-2">+ mva – alt inkludert</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <RegisterDialog>
              <Button size="lg" className="text-lg px-8 h-14 bg-green-700 hover:bg-green-800 text-white shadow-lg shadow-green-700/20">
                Registrer bedrift
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </RegisterDialog>
            <RingMegDialog />
          </div>

          <p className="text-sm text-muted-foreground">
            14 dagers angrefrist. Deretter 12 måneders binding og 3 måneders oppsigelse.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
              ISO 9001-kompatibel
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
              GDPR-trygg
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
              EU/EØS-servere
            </span>
            <span className="flex items-center gap-1.5">
              <HeartHandshake className="h-4 w-4 text-primary" aria-hidden="true" />
              Arbeidsmiljøloven
            </span>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            PROBLEM — «Kjenner du deg igjen?»
        ═══════════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-20 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Kjenner du deg igjen?
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                De fleste bedrifter vi snakker med sliter med det samme
              </p>
            </ScrollReveal>
            <div className="grid md:grid-cols-3 gap-8">
              <ScrollReveal delay={100}>
                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white h-full">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                      <span className="text-2xl" role="img" aria-label="Dokument">📄</span>
                    </div>
                    <CardTitle>HMS i Excel og permer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Dokumenter spredd over e-post, mapper og permer.
                      Ingen vet hva som er siste versjon eller hva som mangler.
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white h-full">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                      <span className="text-2xl" role="img" aria-label="Klokke">⏰</span>
                    </div>
                    <CardTitle>Redd for Arbeidstilsynet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Du vet HMS må være på plass, men er usikker på om
                      dere faktisk oppfyller alle kravene hvis tilsynet kommer.
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>

              <ScrollReveal delay={300}>
                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white h-full">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                      <span className="text-2xl" role="img" aria-label="Bekymret">😰</span>
                    </div>
                    <CardTitle>Ingen bruker systemet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Ansatte gidder ikke fylle ut skjemaer. Avvik blir ikke meldt.
                      HMS-arbeid stopper opp fordi verktøyet er for tungvint.
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SLIK FUNGERER DET — 3 steg til komplett HMS
        ═══════════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal direction="fade">
              <div className="text-center mb-14">
                <Badge variant="default" className="mb-4">
                  Enkelt å komme i gang
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Fra ingenting til komplett HMS-system på 2 timer
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Du trenger ikke HMS-erfaring. Vi har gjort forarbeidet for deg.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-8">
              <ScrollReveal delay={100}>
                <div className="text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold mb-5">
                    1
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Opprett konto</h3>
                  <p className="text-sm text-muted-foreground">
                    Registrer bedriften med org.nr. Vi henter info fra Brønnøysund automatisk. Ferdig på 2 minutter.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <div className="text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold mb-5">
                    2
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Velg bransje</h3>
                  <p className="text-sm text-muted-foreground">
                    Vi setter opp ferdige maler, risikovurderinger og sjekklister tilpasset din bransje.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={300}>
                <div className="text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold mb-5">
                    3
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Alt er klart</h3>
                  <p className="text-sm text-muted-foreground">
                    Avvikssystem, vernerunder og dokumentstyring – ferdig satt opp. HMS-håndbok kan du bygge selv, eller vi setter den opp for deg.
                  </p>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={400} direction="fade">
              <div className="text-center mt-12">
                <RegisterDialog>
                  <Button size="lg" className="bg-green-700 hover:bg-green-800 text-white">
                    Registrer bedrift
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Button>
                </RegisterDialog>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SE SYSTEMET — Skjermbilder av produktet
        ═══════════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-20 bg-muted/30">
          <ScrollReveal direction="fade">
            <div className="text-center mb-10">
              <Badge variant="default" className="mb-4">
                Se systemet i aksjon
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Slik ser det ut innenfra
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Et ekte HMS-system du faktisk vil bruke. Oversiktlig, enkelt og bygget for norske bedrifter.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <ProductShowcase />
          </ScrollReveal>
        </section>

        {/* ═══════════════════════════════════════════
            FUNKSJONER — Alt du trenger, samlet
        ═══════════════════════════════════════════ */}
        <section id="funksjoner" className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ett system for alt HMS-arbeid
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Slutt med separate verktøy. HMS Nova samler alt du trenger i én plattform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: ClipboardCheck,
                title: "Avvik og hendelser",
                desc: "Meld avvik fra mobil eller PC. Automatisk oppfølging, rotårsaksanalyse og korrigerende tiltak.",
                href: "/hms-system/avvikshandtering",
              },
              {
                icon: Shield,
                title: "Risikovurdering",
                desc: "5x5-matrise med ferdige maler per bransje. Tiltaksoppfølging og revisjonshistorikk inkludert.",
                href: "/hms-system/risikovurdering",
              },
              {
                icon: FileText,
                title: "Dokumentstyring",
                desc: "Versjonskontroll, digital signatur og automatisk arkivering. Alle dokumenter samlet og sporbare.",
                href: "/hms-system/dokumenter",
              },
              {
                icon: Users,
                title: "Vernerunder",
                desc: "Gjennomfør vernerunder fra mobilen med ferdige sjekklister. Funn og tiltak følges opp automatisk.",
                href: "/hms-system/vernerunde",
              },
              {
                icon: Zap,
                title: "HMS-håndbok",
                desc: "Ferdig HMS-håndbok tilpasset din bedrift og bransje. Automatisk oppdatert og alltid tilgjengelig.",
                href: "/hms-handbok",
              },
              {
                icon: TrendingUp,
                title: "Opplæring og kompetanse",
                desc: "Kompetansematrise, kurs-oppfølging og automatiske påminnelser når sertifikater utløper.",
                href: "/hms-system",
              },
            ].map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 50}>
                <Link href={feature.href} className="block h-full">
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-base">{feature.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={400} direction="fade">
            <div className="text-center mt-10">
              <p className="text-sm text-muted-foreground mb-4">
                Pluss varsling, stoffkartotek, SJA, pulsundersøkelse, konsern-portal, revisjon, brannøvelser og mer
              </p>
              <Button asChild variant="outline" size="lg">
                <Link href="/hms-system">
                  Se alle {11} funksjoner
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </section>

        {/* ═══════════════════════════════════════════
            RESULTATER — Hva skjer når HMS fungerer
        ═══════════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-20">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Hva skjer når HMS faktisk fungerer?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Ikke bare bedre dokumentasjon – bedre arbeidsmiljø, tryggere folk og mer tid til det som betyr noe.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <ScrollReveal delay={100}>
              <div className="text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Clock className="h-8 w-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-semibold mb-2 text-lg">Spar 10+ timer i uka</h3>
                <p className="text-sm text-muted-foreground">
                  Automatiske påminnelser, ferdig struktur og rapporter på knappen. Mindre administrasjon, mer drift.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-semibold mb-2 text-lg">Alltid klar for revisjon</h3>
                <p className="text-sm text-muted-foreground">
                  Alt er dokumentert, sporbart og oppdatert. Bestå revisjoner fra Arbeidstilsynet uten stress.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Users className="h-8 w-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-semibold mb-2 text-lg">Ansatte som deltar</h3>
                <p className="text-sm text-muted-foreground">
                  Mobilapp gjør det enkelt å melde avvik og delta i vernerunder. Folk bruker det fordi det er lettvint.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            COMPLIANCE — Bygget for norsk lov
        ═══════════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <ScrollReveal direction="fade">
              <Badge variant="default" className="mb-4 bg-green-700 text-white border-green-800">
                Lovpålagt HMS
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Bygget for norsk lovverk
              </h2>
              <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
                HMS Nova oppfyller kravene i Arbeidsmiljøloven, Internkontrollforskriften og ISO-standardene – slik at du slipper å lure.
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Globe className="h-8 w-8 text-primary mb-2 mx-auto" aria-hidden="true" />
                  <CardTitle className="text-center">ISO 9001 / 14001 / 45001</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                  Strukturert etter alle tre ISO-standardene for kvalitet, miljø og arbeidsmiljø
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-primary mb-2 mx-auto" aria-hidden="true" />
                  <CardTitle className="text-center">Internkontrollforskriften</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                  Oppfyller alle 8 krav i IK-HMS § 5 – dokumentasjon, avvik, risiko og oppfølging
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <HeartHandshake className="h-8 w-8 text-primary mb-2 mx-auto" aria-hidden="true" />
                  <CardTitle className="text-center">Arbeidsmiljøloven</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                  Støtter krav til systematisk HMS-arbeid, varslingsplikter og hendelsesregistrering
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <TrustBadges variant="default" />
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            PRIS — Enkelt og ærlig
        ═══════════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal direction="fade">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Enkel pris. Alt inkludert.
                </h2>
                <p className="text-muted-foreground">
                  Ingen overraskelser. Ingen moduler å kjøpe separat.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <Card className="border-primary/20 shadow-lg">
                <CardContent className="p-8 sm:p-10">
                  <div className="text-center mb-8">
                    <p className="text-5xl sm:text-6xl font-bold text-foreground">
                      300 <span className="text-2xl font-normal text-muted-foreground">kr/mnd</span>
                    </p>
                    <p className="text-muted-foreground mt-2">+ mva · per bedrift – uansett antall brukere</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mb-8 max-w-lg mx-auto">
                    {[
                      "Ubegrenset brukere",
                      "Alle moduler inkludert",
                      "Mobilapp (iOS + Android)",
                      "Digital signatur",
                      "Automatiske påminnelser",
                      "Bransjetilpassede maler",
                      "Norsk support",
                      "12 mnd binding etter 14 dager",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <RegisterDialog>
                      <Button size="lg" className="text-lg px-10 h-14 bg-green-700 hover:bg-green-800 text-white shadow-lg shadow-green-700/20">
                        Registrer bedrift
                        <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                      </Button>
                    </RegisterDialog>
                    <p className="text-sm text-muted-foreground mt-4">
                      14 dagers angrefrist. Deretter 12 måneders binding.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </section>

        {/* FAQ */}
        <FAQSection
          faqs={getFAQsForPage("home")}
          title="Ofte stilte spørsmål"
          description="Svar på de vanligste spørsmålene om HMS Nova"
          enableSchema={true}
        />

        {/* ═══════════════════════════════════════════
            URGENCY + FINAL CTA
        ═══════════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-20">
          <ScrollReveal direction="fade" delay={200}>
            <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
              <CardContent className="p-10 sm:p-12 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                  Hvis Arbeidstilsynet kommer i morgen – er du klar?
                </h2>
                <p className="text-lg mb-8 text-primary-foreground/90 max-w-xl mx-auto">
                  Med HMS Nova har du dokumentasjon, risikovurderinger og avvikssystem på plass.
                  Start i dag – det tar bare 2 minutter.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <RegisterDialog>
                    <Button size="lg" className="text-lg px-8 h-14 bg-white text-green-800 hover:bg-white/90 font-semibold shadow-lg">
                      Registrer bedrift
                      <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                    </Button>
                  </RegisterDialog>
                  <Link href="/registrer-bedrift">
                    <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                      Registrer bedrift
                    </Button>
                  </Link>
                </div>
                <p className="text-sm mt-6 text-primary-foreground/70">
                  Over 500 norske bedrifter bruker HMS Nova til å holde HMS-arbeidet i orden
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </section>

      </div>
    </>
  );
}
