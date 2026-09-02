import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, AlertCircle, TrendingUp, Bell, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { FAQSection } from "@/components/faq-section";

export const metadata: Metadata = {
  title: "Avvikshåndtering - Registrer og følg opp avvik | HMS Nova",
  description: "Digital avvikshåndtering med registrering fra mobil. Automatisk oppfølging, lær av nestenulykker og ISO 9001-compliance. Registrer bedrift.",
  keywords: "avvikshåndtering, avviksmelding, hendelsesrapportering, nestenulykke, hms avvik",
};

const faqs = [
  {
    question: "Hva er et avvik?",
    answer: `Et avvik er en hendelse, tilstand eller observasjon som avviker fra det normale eller forventede. 
    Det kan være alt fra en nestenulykke, sikkerhetsrisiko, manglende utstyr, til brudd på prosedyrer. 
    Avvik skal alltid dokumenteres og følges opp.`,
  },
  {
    question: "Hvorfor er avvikshåndtering viktig?",
    answer: `Systematisk avvikshåndtering:
    • Forhindrer fremtidige ulykker (lær av nestenulykker)
    • Er lovpålagt (internkontrollforskriften)
    • Gir bedre arbeidsmiljø
    • Er nødvendig for ISO-sertifisering
    • Viser at bedriften tar HMS på alvor`,
  },
  {
    question: "Hvem kan melde avvik?",
    answer: `Alle ansatte skal kunne melde avvik - fra lærling til daglig leder. 
    Jo enklere det er å melde (f.eks. fra mobil), jo flere avvik fanges opp. 
    Dette er bra! Mange avviksmeldinger betyr god HMS-kultur, ikke dårlig bedrift.`,
  },
  {
    question: "Hva skjer etter at avvik er meldt?",
    answer: `1. Avviket registreres i systemet
    2. HMS-ansvarlig eller leder blir varslet
    3. Avviket vurderes (alvorlighet, årsak)
    4. Tiltak bestemmes og ansvarlig utpekes
    5. Oppfølging med frister og påminnelser
    6. Avviket lukkes når tiltak er gjennomført
    HMS Nova automatiserer hele denne prosessen.`,
  },
];

export default function AvvikshandteringPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Breadcrumb */}
      <section className="container mx-auto px-4 pt-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Hjem</Link>
          <span>/</span>
          <Link href="/hms-system" className="hover:text-foreground">HMS-system</Link>
          <span>/</span>
          <span className="text-foreground">Avvikshåndtering</span>
        </div>
      </section>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-4" variant="secondary">
            Essensielt
          </Badge>
          <h1 className="text-5xl font-bold mb-6">
            Avvikshåndtering - Fra melding til lukking
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Registrer avvik fra mobil på 30 sekunder. Automatisk oppfølging av tiltak. 
            Full historikk og statistikk. Lær av nestenulykker før det blir ulykker.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg">
              <Link href="/registrer-bedrift">
                Registrer bedrift
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/hms-system">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Tilbake til HMS-system
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Hva er avvikshåndtering */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold mb-4">Hva er avvikshåndtering?</h2>
              <p>
                <strong>Avvikshåndtering</strong> er prosessen med å registrere, vurdere og følge opp 
                hendelser eller tilstander som avviker fra det normale.
              </p>
              
              <h3 className="text-xl font-semibold mt-6 mb-3">Typer avvik:</h3>
              <ul>
                <li><strong>Nestenulykker</strong> - Det kunne gått galt, men gikk heldigvis bra</li>
                <li><strong>Ulykker</strong> - Noe skjedde, person ble skadet</li>
                <li><strong>Sikkerhetsrisiko</strong> - Noe er farlig og må utbedres</li>
                <li><strong>Manglende utstyr/vedlikehold</strong> - Maskiner, verneutstyr osv.</li>
                <li><strong>Prosedyrebrudd</strong> - Noen fulgte ikke HMS-reglene</li>
                <li><strong>Miljøhendelser</strong> - Søl, utslipp, avfall</li>
              </ul>

              <div className="bg-primary/10 border-l-4 border-primary p-6 mt-6">
                <p className="font-semibold mb-2">💡 Viktig:</p>
                <p className="mb-0">
                  En god HMS-kultur handler IKKE om å ha null avvik. Det handler om å 
                  <strong> oppmuntre til å melde avvik</strong> slik at dere kan lære og forbedre dere. 
                  Mange avviksmeldinger = god HMS-kultur!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Prosess */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Slik fungerer avvikshåndtering i HMS Nova
          </h2>

          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Meld avvik (mobil eller PC)",
                desc: "Ansatt ser noe galt og melder det via appen på 30 sekunder. Ta bilde, beskriv, send.",
              },
              {
                step: 2,
                title: "Automatisk varsel",
                desc: "HMS-ansvarlig/leder får umiddelbart varsel om nytt avvik. E-post + push-notifikasjon.",
              },
              {
                step: 3,
                title: "Vurder og prioriter",
                desc: "Er det alvorlig? Hva er årsaken? Systemet hjelper deg med å kategorisere og prioritere.",
              },
              {
                step: 4,
                title: "Bestem tiltak",
                desc: "Hva skal gjøres? Hvem er ansvarlig? Når skal det være ferdig? Tildel oppgave med frist.",
              },
              {
                step: 5,
                title: "Automatisk oppfølging",
                desc: "Ansvarlig får påminnelser. Du får oversikt over status. Avviket lukkes når tiltak er gjennomført.",
              },
            ].map((item) => (
              <Card key={item.step}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                      {item.step}
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Fordeler */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Fordeler med digital avvikshåndtering
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <ClipboardCheck className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Enkel registrering</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Meld avvik fra mobil på 30 sekunder. Jo enklere det er, 
                  jo flere avvik fanges opp (det er bra!).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Bell className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Automatiske varsler</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Riktig person får beskjed umiddelbart. 
                  Ingenting faller mellom stolene.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <AlertCircle className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Ingenting blir glemt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Automatisk oppfølging med påminnelser. 
                  Full oversikt over alle åpne og lukkede avvik.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Lær og forbedre</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Statistikk og trender. Hvilke typer avvik har dere mest av? 
                  Kontinuerlig forbedring basert på data.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Statistikk og læring */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">
            Statistikk og læring
          </h2>
          <Card>
            <CardContent className="p-8">
              <p className="text-lg mb-6">
                HMS Nova gir deg oversikt over alle avvik med grafer og statistikk:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>Trender over tid</strong> - Går det riktig vei? Færre eller flere avvik?</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>Kategorisering</strong> - Hvilke typer avvik er vanligst?</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>Alvorlighetsgrad</strong> - Hvor mange kritiske vs mindre alvorlige?</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>Responstid</strong> - Hvor raskt håndteres avvik?</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>Årsaksanalyse</strong> - Hvorfor skjer avvikene?</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Relaterte emner */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">Del av HMS Nova HMS-system</h3>
          <p className="text-muted-foreground mb-6">
            Avvikshåndtering er en sentral del av vårt <Link href="/hms-system" className="text-primary hover:underline">komplette HMS-system</Link>. 
            Se også:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/hms-system/vernerunde">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Vernerunde</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Finn avvik systematisk →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/hms-system/risikovurdering">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Risikovurdering</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Vurder risiko →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/hms-system/iso-9001">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">ISO 9001</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Avvik er ISO-krav →</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection 
        faqs={faqs}
        title="Ofte stilte spørsmål om avvikshåndtering"
      />

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Bygg en sterkere HMS-kultur
            </h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Med enkel avvikshåndtering får dere flere meldinger og lærer mer. Registrer bedrift.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-gray-100">
                <Link href="/registrer-bedrift">
                  Registrer bedrift
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                className="border-2 border-white text-white hover:bg-white/10"
              >
                <Link href="/priser">
                  Se priser
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
