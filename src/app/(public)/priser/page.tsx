"use client";

import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
import { RingMegDialog } from "@/components/ring-meg-dialog";
import { PRICING_SCHEMA } from "@/lib/seo-schemas";
import { FAQSection } from "@/components/faq-section";
import { AI_ADDON_NET_MONTHLY_NOK } from "@/lib/ai-addon";
import { getBreadcrumbSchema } from "@/lib/seo-config";
import { 
  CheckCircle2, 
  X,
  ArrowRight,
  Download,
  Phone,
  Settings
} from "lucide-react";

export default function PriserPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Hjem", url: "/" },
    { name: "Priser", url: "/priser" },
  ]);

  const bindingPlans = [
    {
      name: "12 mnd binding",
      description: "Full tilgang til HMS Nova",
      priceMonthly: 300,
      priceYearly: 3600,
      features: [
        "12 måneders abonnement",
        "Forutsigbar kostnad",
        "Alt inkludert",
      ],
    },
  ];

  const priceFaqs = [
  {
    question: "Hva koster et HMS-system?",
    answer:
      "HMS Nova koster 300 kr/mnd + mva, 3 600 kr/år + mva. Abonnementet er 12 måneder. Antall brukere er ubegrenset, og prisen er den samme enten bedriften har 5 eller 20 ansatte. AI-tillegg er 49 kr/mnd + mva og er av som standard.",
  },
  {
    question: "Hva koster HMS-system for 5 ansatte?",
    answer:
      "300 kr/mnd + mva. HMS Nova tar ikke betalt per ansatt. Fem brukere koster det samme som én bruker.",
  },
  {
    question: "Hva koster HMS-system for 20 ansatte?",
    answer:
      "300 kr/mnd + mva. Prisen endres ikke ved 20 ansatte. Ubegrenset antall brukere er inkludert.",
  },
  {
    question: "Hva er inkludert i 300 kr/mnd?",
    answer:
      "Avvik, risikovurdering, vernerunde, dokumenter, HMS-håndbok, stoffkartotek, varsling, SJA og digital signatur. Det er ingen oppstartsavgift i abonnementet. AI-tillegget på 49 kr/mnd + mva kommer bare når en administrator slår det på.",
  },
  {
    question: "Hva koster et system for HMS-onboarding på byggeplass?",
    answer:
      "Onboarding av ansatte er inkludert i HMS Nova til 300 kr/mnd + mva. Det er ingen egen pris for onboarding på byggeplass.",
  },
];

const allFeatures = [
    "Ubegrenset antall brukere",
    "Dokumenthåndtering med versjonskontroll",
    "Risikovurdering (5x5 matrise)",
    "Hendelsesrapportering & 5-Whys analyse",
    "Digital signaturer (pålogging)",
    "Ferdig HMS-håndbok",
    "Opplæringsmodul & kompetansematrise",
    "Revisjoner & Audits (ISO 9001)",
    "Mål & KPI-oppfølging",
    "Stoffkartotek med sikkerhetsdatablad",
    "HR & personaladministrasjon",
    "Onboarding & offboarding",
    "Konsern-portal (multi-selskap)",
    "Psykososial pulsundersøkelse",
    "Varsling (anonym varslingskanal)",
    "SJA – Sikker Jobb Analyse",
    "Vernerunder fra mobil",
    "Automatiske påminnelser & varsler",
    "Mobiloptimalisert løsning",
    "E-post og telefon support",
    "Ubegrenset lagring",
    "API-tilgang for integrasjoner",
  ];

  return (
    <>
      <Script
        id="pricing-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(PRICING_SCHEMA),
        }}
        strategy="beforeInteractive"
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
        strategy="beforeInteractive"
      />
      <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-6">
          Ingen skjulte kostnader
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          HMS-system koster 300 kr/mnd + mva
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Prisen er den samme for 5 og 20 ansatte. Ubegrenset antall brukere.
          Avvik, risikovurdering, vernerunde, stoffkartotek, varsling og digital
          signatur er inkludert. 3 600 kr/år + mva med 12 måneders abonnement.
          Valgfritt AI-tillegg {AI_ADDON_NET_MONTHLY_NOK} kr/mnd + mva.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/registrer-bedrift">
            <Button size="lg" variant="outline">
              <Download className="mr-2 h-5 w-5" />
              Registrer bedrift
            </Button>
          </Link>
          <Link href="#priser">
            <Button size="lg">
              Se priser
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Problem */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Hvorfor er andre HMS-systemer så dyre?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-semibold">Oppstartskostnader</h3>
                  <p className="text-sm text-muted-foreground">
                    20.000-50.000 kr for oppsett og konsulentbistand
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-semibold">Skjulte kostnader</h3>
                  <p className="text-sm text-muted-foreground">
                    Ekstra for brukere, moduler, lagring og support
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-semibold">Bindingstid</h3>
                  <p className="text-sm text-muted-foreground">
                    1-3 års binding med dyre exitkostnader
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Badge variant="default" className="mb-4">
            HMS Nova er annerledes
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            Én pris. Alt inkludert. Ingen overraskelser.
          </h2>
          <p className="text-muted-foreground">
            Vi tror på transparente priser som er enkle å forstå
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Alt inkludert</h3>
              <p className="text-xs text-muted-foreground mt-1">Alle funksjoner i prisen</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Gratis support</h3>
              <p className="text-xs text-muted-foreground mt-1">Norsk support inkludert</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Cards */}
      <section id="priser" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Én pakke – alt inkludert</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Full tilgang til HMS Nova. 300 kr/mnd + mva, 12 måneders abonnement.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            {bindingPlans.map((plan, index) => (
              <Card key={index} className="relative border-primary shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <div>
                      <span className="text-4xl font-bold">{plan.priceMonthly} kr</span>
                      <span className="text-2xl text-muted-foreground">/mnd</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Totalt {plan.priceYearly.toLocaleString("nb-NO")} kr/år
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <RegisterDialog>
                    <Button className="w-full" size="lg">
                      Kom i gang
                    </Button>
                  </RegisterDialog>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Vil du at vi setter opp HMS-systemet for deg? Vi tilbyr oppsett til en hyggelig pris – ta kontakt med selger.
            </p>
            <RingMegDialog
              trigger={
                <Button variant="link" className="text-primary font-medium p-0 h-auto">
                  Ta kontakt med selger
                </Button>
              }
            />
          </div>

          <div className="mt-10 max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Valgfritt AI-tillegg</CardTitle>
                <CardDescription>
                  Chat-hjelp, tale-til-tekst og forslag i avvik, SJA og risikovurdering
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{AI_ADDON_NET_MONTHLY_NOK} kr</span>
                  <span className="text-2xl text-muted-foreground">/mnd</span>
                  <span className="block text-sm text-muted-foreground mt-1">+ mva</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Alltid av som standard. Administrator aktiverer under Innstillinger.</p>
                <p>{AI_ADDON_NET_MONTHLY_NOK} kr/mnd + mva kommer ekstra på fakturaen når AI er slått på.</p>
              </CardContent>
            </Card>
          </div>

          {/* Lovpålagt HMS-håndbok til deres bedrift – gunstig fastpris */}
          <div className="mt-12 max-w-2xl mx-auto">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Settings className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-semibold text-base text-foreground">
                    Vi tar hele jobben med den lovpålagte HMS-håndboka til deres bedrift
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Vi leverer den komplette, lovpålagte HMS-håndboka og oppsettet i HMS Nova til deres bedrift til en svært gunstig fastpris. Du får et komplett, lovpålagt digitalt HMS-system – enkelt og rimelig – uten at dere må sette dere inn i maler og krav selv. Bare ta kontakt.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <RingMegDialog
                    trigger={
                      <Button variant="outline" className="border-primary">
                        <Phone className="mr-2 h-4 w-4" />
                        Ring meg
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All Features Section */}
          <div className="mt-16">
            <Card className="bg-gradient-to-br from-muted/50 to-muted/30">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-center mb-6">
                  Alt dette er inkludert:
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allFeatures.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price Note */}
          <div className="mt-12 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Alle priser er eks. mva. Faktureres månedlig eller årlig etter ønske.
            </p>
            <p className="text-sm text-muted-foreground">
              Vi tar hele jobben med den lovpålagte HMS-håndboka til deres bedrift til svært gunstig fastpris – <Link href="/" className="text-primary font-medium hover:underline">kontakt oss</Link> for tilbud.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Kurs og bedriftshelsetjeneste</h2>
            <p className="text-lg text-muted-foreground">
              Abonnementet over er prisen på HMS-systemet. Kurs og BHT prises av den som leverer tjenesten.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dokumentert opplæring og kurs</CardTitle>
                <CardDescription>
                  Kompetanse og kursbevis registreres i HMS Nova. Sertifiserte kurs bestilles hos KKS AS.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href="/hms-kurs">
                    Les om opplæring og kurs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bedriftshelsetjeneste</CardTitle>
                <CardDescription>
                  HMS Nova er ikke godkjent BHT. Tjenesten tilbys gjennom Dr.Dropin, og prisen avtales der.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href="/bedriftshelsetjeneste">
                    Les om BHT
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ofte stilte spørsmål</h2>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kan jeg bytte plan senere?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ja! Du kan oppgradere eller nedgradere når som helst. Ved oppgradering får du 
                  full tilgang med en gang. Ved nedgradering gjelder endringen fra neste faktureringsperiode.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hva skjer etter angrefristen?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Du har 14 kalenderdager til å si opp kostnadsfritt ved skriftlig e-post til post@hmsnova.no.
                  Dette er ikke en gratis prøveperiode. Sier du ikke opp innen fristen, er abonnementet
                  bindende i 12 måneder. Deretter gjelder 3 måneders skriftlig oppsigelse.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Er det noen brukergrense?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Nei! HMS Nova inkluderer ubegrenset antall brukere i alle planer. 
                  Du betaler samme pris uansett hvor mange ansatte du har.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Er implementering og opplæring inkludert?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Fra første dag kan du laste opp egne dokumenter og sette opp HMS Nova.
                  Du har 14 dagers angrefrist. Vi tilbyr også onboarding-samtaler for å komme i gang.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kan jeg få demonstrasjon før jeg bestemmer meg?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  Absolutt! Vi tilbyr både:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                  <li>• 14 dagers avtalt angrefrist med full tilgang</li>
                  <li>• Personlig demo via videomøte (30 min)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Er dataene mine trygge?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ja. Vi bruker bank-nivå kryptering (AES-256), har ISO 27001-sertifiserte 
                  servere i Norge, og tar daglige backups. Dine data eies 100% av deg.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hva innebærer 12 mnd binding?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Abonnementet løper i 12 måneder. Full tilgang til alle funksjoner er inkludert.
                  Etter 12 måneder fornyes abonnementet automatisk, med 3 måneders skriftlig oppsigelse.
                  Før binding starter har du 14 dagers avtalt angrefrist.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <FAQSection
        faqs={priceFaqs}
        title="Hva koster HMS-systemet?"
        description="Prisen er 300 kr/mnd + mva, uansett antall ansatte."
      />

      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ferdig HMS-system, med det dere allerede har</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modulene for norsk HMS ligger klare. Risikovurderingen i Excel leses rad for rad,
              og eksisterende avvik tar dere med som fil.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dette er med fra første dag</CardTitle>
                <CardDescription>
                  Arbeidsmiljøloven § 3-1 og internkontrollforskriften § 5 er dekket i modulene.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    HMS-håndbok tilpasset bransjen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Avvik, 5x5-risikovurdering og vernerunde
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Stoffkartotek, varsling, SJA og digital signatur
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risikovurdering fra Excel</CardTitle>
                <CardDescription>
                  Last opp .xlsx. Kolonnene i risikoregisteret leses inn.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-4">
                  <li>Last opp regnearket.</li>
                  <li>Se forhåndsvisningen og velg radene.</li>
                  <li>En godkjenner verifiserer før den kan godkjennes.</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-4">
                  Eldre .xls lagres som .xlsx først. PDF og Word blir et utkast som kontrolleres.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avvik fra filen dere har</CardTitle>
                <CardDescription>
                  Registrer avviket og last opp Excel- eller PDF-filen som kilde.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tittelen settes med en gang, og Excel- eller PDF-filen ligger på avviket
                  som kilde. Resten fylles inn under behandlingen.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Klar til å komme i gang?</h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Registrer bedrift. 14 dagers angrefrist, deretter 12 måneders binding.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <RegisterDialog>
                <Button size="lg" className="bg-green-700 hover:bg-green-800 text-white">
                  Kom i gang nå
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </RegisterDialog>
              <Link href="/registrer-bedrift">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  <Download className="mr-2 h-5 w-5" />
                  Registrer bedrift
                </Button>
              </Link>
            </div>
            <p className="text-sm mt-6 text-primary-foreground/70">
              Har du spørsmål? Ta kontakt.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
    </>
  );
}
