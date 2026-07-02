"use client";

import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
import { RingMegDialog } from "@/components/ring-meg-dialog";
import { PRICING_SCHEMA } from "@/lib/seo-schemas";
import { getBreadcrumbSchema } from "@/lib/seo-config";
import { 
  CheckCircle2, 
  X,
  ArrowRight,
  Download,
  Shield,
  Users,
  Zap,
  Clock,
  HeartHandshake,
  Phone,
  GraduationCap,
  Award,
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
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Transparent prising.<br />Ingen overraskelser.
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Velg planen som passer din bedrift. Alle planer inkluderer 14 dagers gratis prøveperiode, 
          full tilgang og norsk support.
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

      {/* Medlemsfordeler */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardContent className="p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <Award className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold mb-4">🎁 Ekstra medlemsfordeler inkludert!</h2>
              <p className="text-lg text-muted-foreground">
                Som HMS Nova-medlem får du ikke bare et komplett HMS-system – du får også <strong className="text-green-600">ekskl usive rabatter</strong> på viktige tjenester:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-white border-green-200">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <GraduationCap className="h-12 w-12 text-green-600" />
                    <h3 className="font-bold text-lg">20% rabatt på alle HMS-kurs</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✅ Lovpålagte HMS-kurs (verneombud, ledelse, etc.)</li>
                      <li>✅ Førstehjelp for barn og voksne</li>
                      <li>✅ Spesialkurs fra HMS Nova AS (inkl. diisocyanater)</li>
                      <li>✅ Fysisk, digitalt eller hybrid format</li>
                    </ul>
                    <Link href="/hms-kurs">
                      <Button size="sm" variant="outline" className="mt-4">
                        Se alle kurs
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-green-200">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <HeartHandshake className="h-12 w-12 text-green-600" />
                    <h3 className="font-bold text-lg">BHT fra HMS Nova (kommende)</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✅ Vi blir godkjent BHT-organ i løpet av året</li>
                      <li>✅ Minimum krav + tilleggstjenester + kurs</li>
                      <li>✅ Diisocyanater og spesialkurs via sertifisert partner</li>
                      <li>✅ Ett sted for HMS og BHT</li>
                    </ul>
                    <Link href="/bedriftshelsetjeneste">
                      <Button size="sm" variant="outline" className="mt-4">
                        Les mer om BHT
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 border-green-200">
              <h4 className="font-bold text-center mb-3">💰 Total verdi av medlemsfordeler:</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-700">HMS-kurs (årlig)</p>
                  <p className="text-2xl font-bold text-green-600">~ 2.000-5.000 kr</p>
                  <p className="text-xs text-muted-foreground">Avhengig av antall kurs</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-700">BHT fra HMS Nova</p>
                  <p className="text-2xl font-bold text-green-600">Kommende</p>
                  <p className="text-xs text-muted-foreground">Ett leverandørforhold for HMS + BHT + kurs</p>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <strong>Totalt:</strong> Spar fra 2.000 kr årlig på kurs i tillegg til HMS Nova-abonnementet!<br />
                <span className="text-xs">(Basert på minimum 2 HMS-kurs per år med 20% medlemsrabatt)</span>
              </p>
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                <strong>Hvordan aktivere?</strong> Kursrabatt aktiveres automatisk når du registrerer deg som HMS Nova-medlem. <br />
                Oppgi ditt org.nr eller medlemsnummer ved bestilling av kurs. For BHT: registrer interesse på BHT-siden.
              </p>
            </div>
          </CardContent>
        </Card>
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
                <CardTitle className="text-lg">Hva skjer etter gratis prøveperioden?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Etter 14 dager blir du automatisk fakturert for planen du har valgt. Du kan 
                  si opp når som helst før prøveperioden utløper uten å bli belastet.
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
                  I 14 dagers gratis prøveperiode kan du laste opp egne dokumenter og sette opp HMS Nova. 
                  Vi tilbyr også gratis onboarding-samtaler for å komme i gang.
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
                  <li>• 14 dagers gratis prøveperiode med full tilgang</li>
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
                  Abonnementet løper i 12 måneder til 300 kr/mnd + mva (3 600 kr/år + mva). 
                  Full tilgang til alle funksjoner er inkludert. Etter 12 måneder fornyes abonnementet 
                  med 1 måneds oppsigelsestid.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Sammenlign med konkurrentene</h2>
            <p className="text-muted-foreground">
              Se hvordan HMS Nova står seg mot andre HMS-systemer
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-card rounded-lg">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4"></th>
                  <th className="text-center p-4">
                    <div className="font-bold text-primary">HMS Nova</div>
                    <div className="text-sm text-muted-foreground">300 kr/mnd + mva</div>
                  </th>
                  <th className="text-center p-4">
                    <div className="font-bold">Andre systemer</div>
                    <div className="text-sm text-muted-foreground">Varierende priser</div>
                  </th>
                  <th className="text-center p-4">
                    <div className="font-bold">Andre</div>
                    <div className="text-sm text-muted-foreground">Fra 500+ kr/mnd</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 text-sm">Oppstartskostnad</td>
                  <td className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-primary mx-auto" /></td>
                  <td className="p-4 text-center text-muted-foreground">0 kr</td>
                  <td className="p-4 text-center text-muted-foreground">20.000+ kr</td>
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-4 text-sm">Ferdig HMS-håndbok</td>
                  <td className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><X className="h-5 w-5 text-muted-foreground mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 text-sm">Digital signaturer</td>
                  <td className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><X className="h-5 w-5 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center text-muted-foreground">Ekstrakostnad</td>
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-4 text-sm">Risikovurdering (5x5 matrise)</td>
                  <td className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-primary mx-auto" /></td>
                  <td className="p-4 text-center text-muted-foreground">Varierer</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 text-sm">Brukere inkludert</td>
                  <td className="p-4 text-center text-muted-foreground">Ubegrenset</td>
                  <td className="p-4 text-center text-muted-foreground">Begrenset</td>
                  <td className="p-4 text-center text-muted-foreground">Ekstrakostnad</td>
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-4 text-sm">Norsk support</td>
                  <td className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-primary mx-auto" /></td>
                  <td className="p-4 text-center text-muted-foreground">Varierer</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 text-sm">Bindingstid</td>
                  <td className="p-4 text-center text-muted-foreground">12 mnd</td>
                  <td className="p-4 text-center text-muted-foreground">12 mnd krav</td>
                  <td className="p-4 text-center text-muted-foreground">12-36 mnd krav</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Klar til å komme i gang?</h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Prøv HMS Nova gratis i 14 dager. Ingen kredittkort. Ingen forpliktelser.
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
