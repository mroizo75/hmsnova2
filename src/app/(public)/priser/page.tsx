"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
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
  Award
} from "lucide-react";

export default function PriserPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly");

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Hjem", url: "/" },
    { name: "Priser", url: "/priser" },
  ]);

  const plans = [
    {
      name: "Små bedrifter",
      description: "1-20 ansatte",
      priceMonthly: 550,
      priceYearly: 6000,
      features: [
        "Opptil 20 brukere inkludert",
        "Dokumenthåndtering med versjonskontroll",
        "Risikovurdering (5x5 matrise)",
        "Hendelsesrapportering & 5-Whys analyse",
        "Digital signaturer (pålogging)",
        "Ferdig HMS-håndbok",
        "Opplæringsmodul & kompetansematrise",
        "Revisjoner & Audits (ISO 9001)",
        "Mål & KPI-oppfølging",
        "Stoffkartotek med sikkerhetsdatablad",
        "E-post support",
        "10 GB lagring",
      ],
    },
    {
      name: "Mellomstore bedrifter",
      description: "21-50 ansatte",
      priceMonthly: 750,
      priceYearly: 8000,
      popular: true,
      features: [
        "Alt i Små bedrifter, pluss:",
        "Opptil 50 brukere inkludert",
        "Automatiske påminnelser & varsler",
        "Avansert rapportering & analytics",
        "Prioritert support (telefon + e-post)",
        "Dedikert onboarding-samtale",
        "50 GB lagring",
        "API-tilgang for integrasjoner",
      ],
    },
    {
      name: "Store bedrifter",
      description: "51+ ansatte",
      priceMonthly: 1100,
      priceYearly: 12000,
      features: [
        "Alt i Mellomstore bedrifter, pluss:",
        "Ubegrenset brukere",
        "Ubegrenset lagring",
        "Dedikert kundekonsulent",
        "On-premise deployment (valgfritt)",
        "SLA med 99.9% oppetid",
        "24/7 prioritert support",
        "Egendefinerte integrasjoner",
        "Avansert bruker- og rollestyring",
        "Hvitelabeling (ekstra kostnad)",
        "Årlig revisjon av HMS-systemet",
      ],
    },
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (billingInterval === "monthly") {
      return {
        amount: plan.priceMonthly,
        label: "/mnd",
        total: `Totalt ${plan.priceMonthly * 12} kr/år`,
      };
    } else {
      return {
        amount: plan.priceYearly,
        label: "/år",
        total: "",
        savings: `Spar ${(plan.priceMonthly * 12 - plan.priceYearly).toLocaleString('nb-NO')} kr`,
      };
    }
  };

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
          Velg planen som passer din bedrift. Alle planer inkluderer 14 dagers gratis prøveperiod, 
          full tilgang og norsk support. Ingen bindingstid. Ingen oppstartskostnader.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/gratis-hms-system">
            <Button size="lg" variant="outline">
              <Download className="mr-2 h-5 w-5" />
              Få gratis HMS-pakke først
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

        <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Ingen oppsett</h3>
              <p className="text-xs text-muted-foreground mt-1">0 kr i oppstartskostnad</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Ingen binding</h3>
              <p className="text-xs text-muted-foreground mt-1">Si opp når du vil</p>
            </CardContent>
          </Card>

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
          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4 mb-12">
            <span className={`text-sm font-medium ${billingInterval === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
              Månedlig
            </span>
            <button
              onClick={() => setBillingInterval(billingInterval === "monthly" ? "yearly" : "monthly")}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                billingInterval === "yearly" ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  billingInterval === "yearly" ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingInterval === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
              Årlig
            </span>
            {billingInterval === "yearly" && (
              <Badge variant="default" className="ml-2">Spar opptil 20%</Badge>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const pricing = getPrice(plan);
              return (
                <Card
                  key={index}
                  className={`relative ${plan.popular ? "border-primary shadow-xl scale-105" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="px-4 py-1">Mest populær</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <div>
                        <span className="text-4xl font-bold">{pricing.amount.toLocaleString('nb-NO')} kr</span>
                        <span className="text-2xl text-muted-foreground">{pricing.label}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {pricing.total && (
                        <p className="text-xs text-muted-foreground">
                          {pricing.total}
                        </p>
                      )}
                      {pricing.savings && (
                        <p className="text-xs font-semibold text-primary">
                          {pricing.savings}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Inkludert:</h4>
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <RegisterDialog>
                      <Button
                        variant={plan.popular ? "default" : "outline"}
                        className="w-full"
                        size="lg"
                      >
                        Kom i gang
                      </Button>
                    </RegisterDialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Price Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Alle priser er eks. mva. {billingInterval === "yearly" && "Årlig betaling gir betydelig rabatt sammenlignet med månedlig."}
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
                      <li>✅ Spesialkurs fra KKS AS (inkl. diisocyanater)</li>
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
                    <h3 className="font-bold text-lg">10% rabatt på BHT (Dr. Dropin)</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✅ Godkjent av Arbeidstilsynet</li>
                      <li>✅ Digital integrasjon med HMS Nova</li>
                      <li>✅ Ingen bindingstid eller oppstartskostnader</li>
                      <li>✅ Over 3000 bedrifter bruker Dr. Dropin BHT</li>
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
                  <p className="font-semibold text-green-700">BHT Dr. Dropin (årlig)</p>
                  <p className="text-2xl font-bold text-green-600">Fra 648 kr</p>
                  <p className="text-xs text-muted-foreground">10% rabatt (eks: 5 ansatte spar 648 kr)</p>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <strong>Totalt:</strong> Spar fra 2.650 kr årlig i tillegg til HMS Nova-abonnementet!<br />
                <span className="text-xs">(Basert på BHT for 5 ansatte + minimum 2 HMS-kurs per år)</span>
              </p>
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                <strong>Hvordan aktivere?</strong> Rabattene aktiveres automatisk når du registrerer deg som HMS Nova-medlem. <br />
                Oppgi ditt org.nr eller medlemsnummer ved bestilling av kurs eller BHT.
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
                <CardTitle className="text-lg">Hva er brukergrensen for hver plan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Små bedrifter (1-20 brukere), Mellomstore bedrifter (21-50 brukere), og Store bedrifter (ubegrenset brukere). 
                  Hvis du vokser ut av din plan, kan du enkelt oppgradere når som helst.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Er implementering og opplæring inkludert?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ja! HMS Nova kommer med ferdig HMS-håndbok og er klar til bruk på timer. 
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
                  <li>• Gratis HMS-pakke for å teste dokumentene våre</li>
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
                <CardTitle className="text-lg">Hva er forskjellen på månedlig og årlig betaling?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Med årlig betaling får du betydelig rabatt (opptil 20%) sammenlignet med månedlig betaling. 
                  Årlig betaling faktureres én gang per år, mens månedlig faktureres hver måned. 
                  Begge alternativer har ingen bindingstid.
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
                    <div className="text-sm text-muted-foreground">Fra 500 kr/mnd</div>
                  </th>
                  <th className="text-center p-4">
                    <div className="font-bold">Grønn Jobb</div>
                    <div className="text-sm text-muted-foreground">Fra 590 kr/mnd</div>
                  </th>
                  <th className="text-center p-4">
                    <div className="font-bold">Andre</div>
                    <div className="text-sm text-muted-foreground">Fra 800+ kr/mnd</div>
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
                  <td className="p-4 text-center text-muted-foreground">1-20 / 21-50 / Ubegrenset</td>
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
                  <td className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-primary mx-auto" /></td>
                  <td className="p-4 text-center text-muted-foreground">12 mnd</td>
                  <td className="p-4 text-center text-muted-foreground">12-36 mnd</td>
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
              <Link href="/gratis-hms-system">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  <Download className="mr-2 h-5 w-5" />
                  Få gratis HMS-pakke
                </Button>
              </Link>
            </div>
            <p className="text-sm mt-6 text-primary-foreground/70">
              Har du spørsmål? Ring oss på <a href="tel:+4799112916" className="underline font-semibold">+47 99 11 29 16</a>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
    </>
  );
}
