import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, TrendingUp, Shield, ArrowRight, ArrowLeft } from "lucide-react";
import { FAQSection } from "@/components/faq-section";

export const metadata: Metadata = {
  title: "Risikovurdering - 5x5 Matrise & Digital Analyse | HMS Nova",
  description: "Profesjonell risikovurdering med 5x5 matrise (ISO 9001). Digital og effektiv med automatisk oppfølging av tiltak og mobilapp. 14 dagers angrefrist, deretter 12 måneders binding.",
  keywords: "risikovurdering, risikoanalyse, 5x5 matrise, risikomatrise, hms risikovurdering, digital risikovurdering, risikovurdering mal",
  openGraph: {
    title: "Risikovurdering - Digital løsning med 5x5 matrise",
    description: "Gjennomfør profesjonelle risikovurderinger digitalt. 5x5 matrise, automatisk oppfølging og ISO 9001 compliance.",
  },
};

const faqs = [
  {
    question: "Hva er en risikovurdering?",
    answer: `En risikovurdering er en systematisk gjennomgang av potensielle farer og risikoer på arbeidsplassen. 
    Målet er å identifisere hva som kan gå galt, hvor sannsynlig det er, og hvilke konsekvenser det kan få. 
    Basert på dette iverksettes tiltak for å redusere risikoen. Alle norske arbeidsgivere er pålagt å gjennomføre risikovurderinger.`,
  },
  {
    question: "Hva er en 5x5 matrise?",
    answer: `En 5x5 matrise (også kalt risikomatrise) er en visuell metode for å vurdere risiko. 
    Den kombinerer sannsynlighet (1-5) med konsekvens (1-5) for å gi en risikoverdi fra 1-25. 
    Dette gjør det enkelt å prioritere hvilke risikoer som må håndteres først. 5x5 matrisen er standard i ISO 9001 og ISO 45001.`,
  },
  {
    question: "Hvor ofte skal vi gjennomføre risikovurderinger?",
    answer: `Risikovurderinger skal gjennomføres:
    • Ved oppstart av ny virksomhet
    • Når det skjer endringer (nye maskiner, prosesser, ansatte)
    • Etter ulykker eller nestenulykker
    • Minimum 1 gang per år (anbefalt)
    HMS Nova sender automatiske påminnelser så dere ikke glemmer det.`,
  },
  {
    question: "Hvordan gjør HMS Nova risikovurdering enklere?",
    answer: `HMS Nova digitaliserer hele prosessen:
    • Ferdig 5x5 matrise innebygd
    • Mal for systematisk gjennomgang
    • Automatisk beregning av risikoverdi
    • Oppfølging av tiltak med frister
    • Historikk og dokumentasjon
    • Mobilapp for registrering på stedet
    Alt på ett sted, enkelt og effektivt.`,
  },
];

export default function RisikovurderingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Breadcrumb */}
      <section className="container mx-auto px-4 pt-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Hjem</Link>
          <span>/</span>
          <Link href="/hms-system" className="hover:text-foreground">HMS-system</Link>
          <span>/</span>
          <span className="text-foreground">Risikovurdering</span>
        </div>
      </section>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-4" variant="secondary">
            Kritisk HMS-funksjon
          </Badge>
          <h1 className="text-5xl font-bold mb-6">
            Risikovurdering - Digital og effektiv
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Gjennomfør profesjonelle risikovurderinger med 5x5 matrise (ISO 9001 standard). 
            Fra identifikasjon til oppfølging - alt digitalt på ett sted.
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

      {/* Hva er risikovurdering */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold mb-4">Hva er risikovurdering?</h2>
              <p>
                En <strong>risikovurdering</strong> er en systematisk prosess for å identifisere, 
                vurdere og håndtere potensielle farer på arbeidsplassen.
              </p>
              
              <h3 className="text-xl font-semibold mt-6 mb-3">Hvorfor er risikovurdering viktig?</h3>
              <ul>
                <li><strong>Lovpålagt</strong> - Alle norske arbeidsgivere må gjennomføre risikovurderinger (Arbeidsmiljøloven §3-1)</li>
                <li><strong>Forebygger ulykker</strong> - Identifiser farer før noe skjer</li>
                <li><strong>Reduserer sykefravær</strong> - Systematisk HMS-arbeid gir tryggere arbeidsplass</li>
                <li><strong>ISO-krav</strong> - Nødvendig for ISO 9001, 45001 og 14001 sertifisering</li>
                <li><strong>Beskytter bedriften</strong> - God dokumentasjon ved tilsyn fra Arbeidstilsynet</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">5x5 Risikomatrise</h3>
              <p>
                HMS Nova bruker den anerkjente <strong>5x5 matrisen</strong> som kombinerer:
              </p>
              <ul>
                <li><strong>Sannsynlighet</strong> (1-5): Hvor sannsynlig er det at hendelsen skjer?</li>
                <li><strong>Konsekvens</strong> (1-5): Hvor alvorlig blir skaden hvis det skjer?</li>
                <li><strong>Risikoverdi</strong> (1-25): Sannsynlighet × Konsekvens</li>
              </ul>
              
              <div className="bg-muted p-6 rounded-lg mt-4">
                <p className="font-semibold mb-2">Risikonivåer:</p>
                <ul className="space-y-1 mb-0">
                  <li><span className="text-green-600">●</span> <strong>1-4:</strong> Lav risiko (Akseptabel)</li>
                  <li><span className="text-yellow-600">●</span> <strong>5-9:</strong> Moderat risiko (Tiltak vurderes)</li>
                  <li><span className="text-orange-600">●</span> <strong>10-15:</strong> Høy risiko (Tiltak nødvendig)</li>
                  <li><span className="text-red-600">●</span> <strong>16-25:</strong> Ekstrem risiko (Umiddelbare tiltak)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Visuell 5x5 matrise */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-center">5x5 Risikomatrise - Visuell oversikt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        Sannsynlighet ↓<br/>Konsekvens →
                      </th>
                      <th className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        1<br/><span className="font-normal text-xs">Ubetydelig</span>
                      </th>
                      <th className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        2<br/><span className="font-normal text-xs">Mindre alvorlig</span>
                      </th>
                      <th className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        3<br/><span className="font-normal text-xs">Alvorlig</span>
                      </th>
                      <th className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        4<br/><span className="font-normal text-xs">Meget alvorlig</span>
                      </th>
                      <th className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        5<br/><span className="font-normal text-xs">Katastrofal</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 5 - Meget sannsynlig */}
                    <tr>
                      <td className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        5<br/><span className="font-normal text-xs">Meget sannsynlig</span>
                      </td>
                      <td className="border border-gray-300 p-4 bg-yellow-100 text-center font-bold">5</td>
                      <td className="border border-gray-300 p-4 bg-yellow-200 text-center font-bold">10</td>
                      <td className="border border-gray-300 p-4 bg-orange-200 text-center font-bold">15</td>
                      <td className="border border-gray-300 p-4 bg-red-300 text-center font-bold text-white">20</td>
                      <td className="border border-gray-300 p-4 bg-red-500 text-center font-bold text-white">25</td>
                    </tr>
                    {/* Row 4 - Sannsynlig */}
                    <tr>
                      <td className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        4<br/><span className="font-normal text-xs">Sannsynlig</span>
                      </td>
                      <td className="border border-gray-300 p-4 bg-green-200 text-center font-bold">4</td>
                      <td className="border border-gray-300 p-4 bg-yellow-100 text-center font-bold">8</td>
                      <td className="border border-gray-300 p-4 bg-orange-100 text-center font-bold">12</td>
                      <td className="border border-gray-300 p-4 bg-red-200 text-center font-bold">16</td>
                      <td className="border border-gray-300 p-4 bg-red-400 text-center font-bold text-white">20</td>
                    </tr>
                    {/* Row 3 - Mulig */}
                    <tr>
                      <td className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        3<br/><span className="font-normal text-xs">Mulig</span>
                      </td>
                      <td className="border border-gray-300 p-4 bg-green-100 text-center font-bold">3</td>
                      <td className="border border-gray-300 p-4 bg-yellow-50 text-center font-bold">6</td>
                      <td className="border border-gray-300 p-4 bg-yellow-200 text-center font-bold">9</td>
                      <td className="border border-gray-300 p-4 bg-orange-100 text-center font-bold">12</td>
                      <td className="border border-gray-300 p-4 bg-red-200 text-center font-bold">15</td>
                    </tr>
                    {/* Row 2 - Lite sannsynlig */}
                    <tr>
                      <td className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        2<br/><span className="font-normal text-xs">Lite sannsynlig</span>
                      </td>
                      <td className="border border-gray-300 p-4 bg-green-50 text-center font-bold">2</td>
                      <td className="border border-gray-300 p-4 bg-green-200 text-center font-bold">4</td>
                      <td className="border border-gray-300 p-4 bg-yellow-50 text-center font-bold">6</td>
                      <td className="border border-gray-300 p-4 bg-yellow-100 text-center font-bold">8</td>
                      <td className="border border-gray-300 p-4 bg-orange-100 text-center font-bold">10</td>
                    </tr>
                    {/* Row 1 - Svært usannsynlig */}
                    <tr>
                      <td className="border border-gray-300 p-2 bg-muted text-sm font-semibold">
                        1<br/><span className="font-normal text-xs">Svært usannsynlig</span>
                      </td>
                      <td className="border border-gray-300 p-4 bg-green-50 text-center font-bold">1</td>
                      <td className="border border-gray-300 p-4 bg-green-100 text-center font-bold">2</td>
                      <td className="border border-gray-300 p-4 bg-green-100 text-center font-bold">3</td>
                      <td className="border border-gray-300 p-4 bg-green-200 text-center font-bold">4</td>
                      <td className="border border-gray-300 p-4 bg-yellow-100 text-center font-bold">5</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                <strong>Eksempel:</strong> Sannsynlighet 4 × Konsekvens 3 = Risikoverdi 12 (Oransje - Høy risiko)
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Hvordan gjennomføre */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Slik gjennomfører du risikovurdering i HMS Nova
          </h2>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                    1
                  </div>
                  <CardTitle>Identifiser farer</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Gå systematisk gjennom arbeidsplassen. Hva kan gå galt? Bruk HMS Novas mal 
                  eller registrer direkte fra mobilappen på stedet.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                    2
                  </div>
                  <CardTitle>Vurder risiko</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  For hver fare: Sett sannsynlighet (1-5) og konsekvens (1-5). 
                  HMS Nova beregner automatisk risikoverdi og fargemarkerer basert på alvorlighetsgrad.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                    3
                  </div>
                  <CardTitle>Bestem tiltak</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Hva skal gjøres for å redusere risikoen? Hvem er ansvarlig? Når skal det være ferdig? 
                  Registrer alt i systemet.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                    4
                  </div>
                  <CardTitle>Følg opp automatisk</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  HMS Nova sender automatiske påminnelser til ansvarlige personer. 
                  Du får oversikt over status på alle tiltak. Ingenting blir glemt.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Fordeler */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Hvorfor velge digital risikovurdering?
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Spar tid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Fra timevis med Excel-ark til 15 minutter i HMS Nova. 
                  Ferdig mal, automatisk beregning, enkel dokumentasjon.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>ISO 9001 compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Innebygd 5x5 matrise følger ISO-standarder. 
                  Klargjort for revisjoner og sertifisering.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Full dokumentasjon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Historikk, versjoner, hvem gjorde hva når. 
                  Trygg dokumentasjon ved Arbeidstilsynets besøk.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <AlertTriangle className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Automatiske påminnelser</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Glem aldri årlige revisjoner eller oppfølging av tiltak. 
                  Systemet sender varsel automatisk.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Relaterte emner */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">Del av HMS Nova HMS-system</h3>
          <p className="text-muted-foreground mb-6">
            Risikovurdering er en sentral del av vårt <Link href="/hms-system" className="text-primary hover:underline">komplette HMS-system</Link>. 
            Se også:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/hms-system/vernerunde">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Vernerunde</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Digital vernerunde på mobil →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/hms-system/avvikshandtering">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Avvikshåndtering</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Registrer og følg opp avvik →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/hms-system/iso-9001">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">ISO 9001</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">ISO sertifisering →</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection 
        faqs={faqs}
        title="Ofte stilte spørsmål om risikovurdering"
      />

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Klar til å digitalisere risikovurderinger?
            </h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Registrer bedrift. 14 dagers angrefrist, deretter 12 måneders binding.
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
