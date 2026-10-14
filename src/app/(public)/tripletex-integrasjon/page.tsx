import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FAQSection } from "@/components/faq-section";
import { RegisterDialog } from "@/components/register-dialog";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import {
  SITE_CONFIG,
  getBreadcrumbSchema,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  ROBOTS_CONFIG,
} from "@/lib/seo-config";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FolderKanban,
  Receipt,
  ShieldCheck,
} from "lucide-react";

const PATH = "/tripletex-integrasjon";
const TITLE = "Tripletex-integrasjon for timeføring og prosjekt";
const DESCRIPTION =
  "Godkjenn timer, prosjekt og varer i HMS Nova. Grunnlaget går til Tripletex av seg selv: timeføring, prosjekt og fakturagrunnlag i ett system.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "tripletex integrasjon",
    "timeføring tripletex",
    "prosjekt tripletex",
    "fakturagrunnlag tripletex",
    "hms tripletex",
    "godkjenne timer tripletex",
  ].join(", "),
  alternates: { canonical: getCanonicalUrl(PATH) },
  robots: ROBOTS_CONFIG,
  openGraph: getOpenGraphDefaults(`${TITLE} | HMS Nova`, DESCRIPTION, PATH),
  twitter: getTwitterDefaults(`${TITLE} | HMS Nova`, DESCRIPTION),
};

const STEPS = [
  {
    nr: "1",
    title: "Koble bedriften én gang",
    text: "Administrator limer inn Tripletex-nøkkelen i HMS Nova. Kunder, ansatte, aktiviteter og varer hentes inn, og koblingen ligger klar.",
  },
  {
    nr: "2",
    title: "Opprett prosjekt i HMS Nova",
    text: "Prosjektet opprettes i Tripletex med kunde og prosjektnummer. Timer og varer kan føres på det samme prosjektet.",
  },
  {
    nr: "3",
    title: "Før timer, km og varer",
    text: "Ansatte registrerer ordinær tid, 50 % og 100 % overtid, kilometer, maskintimer og varer direkte på prosjektet.",
  },
  {
    nr: "4",
    title: "Godkjenn i HMS Nova",
    text: "Når leder godkjenner, sendes timene og ordrelinjene til Tripletex. Dere slipper å føre det samme på nytt.",
  },
];

const PILLARS = [
  {
    icon: Clock,
    title: "Timeføring inn i prosjekt",
    text: "Godkjente timer legges på riktig prosjekt og aktivitet i Tripletex: ordinær tid, 50 % overtid og 100 % overtid. Avviste timer blir stående til de er rettet.",
  },
  {
    icon: FolderKanban,
    title: "Prosjekt fra HMS Nova",
    text: "Nye prosjekt starter i HMS Nova og opprettes i Tripletex. Kunden følger med, så timeføring og varer treffer riktig oppdrag fra første registrering.",
  },
  {
    icon: Receipt,
    title: "Varer og tjenester som fakturagrunnlag",
    text: "Kilometer, maskintimer og varer blir ordrelinjer på prosjektet. Derfra kan dere opprette en usendt faktura i Tripletex og sende den derfra.",
  },
];

const faqs = [
  {
    question: "Må vi overføre timer til Tripletex manuelt?",
    answer:
      "Nei. Ansatte fører timer i HMS Nova, og leder godkjenner der. Godkjente timer, kilometer, maskintimer og varer sendes til Tripletex av seg selv.",
  },
  {
    question: "Kan vi opprette prosjekt i HMS Nova og få dem i Tripletex?",
    answer:
      "Ja. Prosjekt opprettet i HMS Nova opprettes i Tripletex med kunde. Senere timeføring og varer knyttes til det samme prosjektet.",
  },
  {
    question: "Hva kan brukes som fakturagrunnlag?",
    answer:
      "Godkjente timer på prosjekt, kilometer, maskintimer og varer fra Tripletex-varekatalogen. Linjene blir ordre i Tripletex. Fakturaen opprettes usendt, og sendes fra Tripletex.",
  },
  {
    question: "Hvem godkjenner timene?",
    answer:
      "Leder med godkjenningstilgang i HMS Nova. Avviste timer får en begrunnelse og sendes tilbake til den ansatte. Først etter ny godkjenning går de til Tripletex.",
  },
  {
    question: "Hva kreves for å komme i gang?",
    answer:
      "En Tripletex-bedrift og en integrasjonsnøkkel som limes inn under innstillinger i HMS Nova. Deretter kobles aktiviteter for ordinær tid og overtid, og varer for kilometer og maskintimer.",
  },
];

export default function TripletexIntegrasjonPage() {
  const structuredData = [
    getBreadcrumbSchema([
      { name: "Hjem", url: "/" },
      { name: "Tripletex-integrasjon", url: PATH },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESCRIPTION,
      url: `${SITE_CONFIG.url}${PATH}`,
      inLanguage: "nb-NO",
      isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
      about: {
        "@type": "SoftwareApplication",
        name: "HMS Nova Tripletex-integrasjon",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "300",
          priceCurrency: "NOK",
          description: "Inkludert i HMS Nova fra 300 kr/mnd + mva",
        },
      },
    },
  ];

  return (
    <>
      <MultipleStructuredData dataArray={structuredData} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 pt-8">
          <nav aria-label="Brødsmulesti" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Hjem
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Tripletex-integrasjon</span>
          </nav>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <Badge className="mb-4" variant="secondary">
              Tripletex
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Tripletex-integrasjon: godkjenn i ett system
            </h1>
            <p className="text-xl text-muted-foreground mb-4 leading-relaxed">
              Timeføring, prosjekt og varer starter i HMS Nova. Når leder godkjenner,
              ligger timene og fakturagrunnlaget i Tripletex.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              HMS Nova er systemet dere jobber i. Tripletex er systemet som tar imot
              prosjekt, timer og ordrelinjer, klart til faktura.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <RegisterDialog>
                <Button size="lg" className="bg-green-700 hover:bg-green-800 text-white">
                  Registrer bedrift
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </RegisterDialog>
              <Button asChild size="lg" variant="outline">
                <Link href="/priser">Se priser</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-5xl">
            <h2 className="text-3xl font-bold mb-3">Slik henger HMS Nova og Tripletex sammen</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Én godkjenning i HMS Nova er nok. Prosjekt, timer og varer følger med til Tripletex.
            </p>
            <ol className="grid md:grid-cols-2 gap-4">
              {STEPS.map((step) => (
                <li key={step.nr}>
                  <Card className="h-full">
                    <CardHeader>
                      <p className="text-sm font-semibold text-primary">Steg {step.nr}</p>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{step.text}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-5xl">
            <h2 className="text-3xl font-bold mb-8">Det som går over når du godkjenner</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {PILLARS.map((item) => (
                <Card key={item.title} className="h-full">
                  <CardHeader>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-4">Ett sted å godkjenne</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Ansatte sender inn timelisten sin. Leder åpner køen i HMS Nova, retter
                aktivitet eller lønnsart om det trengs, og godkjenner. I samme øyeblikk
                settes overføringen i gang: prosjektet opprettes i Tripletex hvis det
                mangler, timene skrives på prosjektet, og kilometer, maskintimer og varer
                blir ordrelinjer.
              </p>
              <p>
                Fakturaen opprettes usendt i Tripletex. Utsending, kreditnota og betaling
                skjer i regnskapssystemet, der bokføringen hører hjemme.
              </p>
            </div>
            <ul className="mt-8 space-y-3">
              {[
                "Ordinær tid, 50 % og 100 % overtid på egne aktiviteter",
                "Kilometer, både avgiftspliktig og avgiftsfri, som varelinjer",
                "Maskintimer og øvrige varer fra Tripletex-katalogen",
                "Usendt faktura klar til utsending fra Tripletex",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <Card className="max-w-3xl border-primary/20">
            <CardContent className="p-8 sm:p-10">
              <div className="flex items-start gap-3 mb-4">
                <ShieldCheck className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
                <h2 className="text-2xl font-bold">Inkludert i HMS Nova</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Tripletex-integrasjonen følger med abonnementet fra 300 kr/mnd + mva.
                Ubegrenset antall brukere, samme pris.
              </p>
              <RegisterDialog>
                <Button size="lg" className="bg-green-700 hover:bg-green-800 text-white">
                  Registrer bedrift
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </RegisterDialog>
            </CardContent>
          </Card>
        </section>

        <FAQSection
          faqs={faqs}
          title="Spørsmål om Tripletex-integrasjonen"
          description="Slik fungerer timeføring, prosjekt og fakturagrunnlag mellom HMS Nova og Tripletex."
        />
      </div>
    </>
  );
}
