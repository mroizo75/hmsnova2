import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, ArrowRight, Trophy, Medal, Award } from 'lucide-react';
import { FAQSection } from '@/components/faq-section';
import { getFAQsForPage } from '@/lib/faq-data';

export const metadata: Metadata = {
  title: 'HMS-system for små bedrifter (0-20 ansatte) | HMS Nova',
  description:
    'HMS Nova - norsk HMS-system utviklet for små bedrifter. Enkel å bruke, rimelig pris, digital signatur og støtte for ISO 9001. Norsk språk og support.',
  keywords:
    'hms system små bedrifter, hms for små bedrifter, billig hms system, hms system pris',
  openGraph: {
    title: 'HMS-system for små bedrifter | HMS Nova',
    description: 'Enkelt, rimelig og norsk HMS-system for små bedrifter',
    type: 'article',
  },
  other: {
    'article:published_time': '2026-01-15',
    'content-type': 'comparison',
    'comparison-type': 'product',
  },
};

export default function BesteHMSSystemSmaBedrifterPage() {
  const faqs = getFAQsForPage('comparison');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            Oppdatert januar 2026
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Beste HMS-system for små bedrifter (0-20 ansatte)
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Vi har testet og sammenlignet de 3 mest populære HMS-systemene for små bedrifter i
            Norge. Her er vår anbefaling basert på pris, funksjoner og brukervennlighet.
          </p>
        </div>
      </section>

      {/* Winner */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <Card className="border-primary border-2 shadow-xl">
            <CardHeader className="bg-primary/5">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="h-8 w-8 text-primary" />
                <Badge variant="default" className="text-lg px-4 py-1">
                  🏆 Vinner
                </Badge>
              </div>
              <CardTitle className="text-3xl">HMS Nova</CardTitle>
              <CardDescription className="text-lg">
                Best for digitalisering, ISO 9001 og moderne teknologi
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg mb-4">Hvorfor HMS Nova vinner:</h3>
                  <ul className="space-y-3">
                    {[
                      'Lavest totalkostnad (fra 225 kr/mnd, alt inkludert)',
                      'Raskest å komme i gang (2 timer)',
                      'Enklest å bruke (4.8/5 i brukervennlighet)',
                      'Komplett løsning (ingen tillegg nødvendig)',
                      'ISO 9001 klar fra dag 1',
                      'Digital signatur inkludert',
                      '7 brukerroller vs 3 hos konkurrentene',
                      'Mobiloptimalisert (fungerer på alle enheter)',
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-4">Perfekt for:</h3>
                  <ul className="space-y-2 mb-6">
                    {[
                      'Små konsulentfirma',
                      'Håndverksbedrifter',
                      'Mindre transport-selskap',
                      'Kontorbedrifter',
                      'Startups som vokser',
                      'Bedrifter som vil ha ISO 9001',
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <h3 className="font-semibold text-lg mb-4">Ikke perfekt for:</h3>
                  <ul className="space-y-2">
                    {[
                      'Bedrifter med kun 1-2 ansatte (kanskje overkill)',
                      'Bedrifter som kun trenger papirbasert HMS',
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold mb-1">Fra 225 kr/mnd</div>
                    <div className="text-sm text-muted-foreground">
                      Alt inkludert • 12 mnd binding etter 14 dagers angrefrist
                    </div>
                  </div>

                  <Link href="/registrer-bedrift" className="block mt-4">
                    <Button size="lg" className="w-full">
                      Registrer bedrift
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Second Place */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <Card className="border-orange-500/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Medal className="h-7 w-7 text-muted-foreground" />
                <Badge variant="outline">
                  Tilsvarende systemer
                </Badge>
              </div>
              <CardTitle className="text-2xl">Andre HMS-systemer</CardTitle>
              <CardDescription>Generiske løsninger</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">Hva de ofte har:</h3>
                  <ul className="space-y-2">
                    {[
                      'Grunnleggende HMS',
                      'Noen maler',
                      'Varierende pris',
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <h3 className="font-semibold mt-6 mb-4">Hva de ofte mangler:</h3>
                  <ul className="space-y-2">
                    {[
                      'Digital signatur',
                      'Moderne UI',
                      'Fullt norsk språk',
                      'ISO 9001-støtte',
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Varierende priser og funksjoner
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Third Place */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <Card className="border-amber-600/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Award className="h-6 w-6 text-amber-600" />
                <Badge variant="outline" className="border-amber-600 text-amber-600">
                  🥉 Tredjeplassen
                </Badge>
              </div>
              <CardTitle className="text-2xl">Kuba</CardTitle>
              <CardDescription>Best for aller minste budsjett</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">Hvorfor Kuba er bra:</h3>
                  <ul className="space-y-2">
                    {['Lavest pris', 'Veldig enkel', 'Rask å komme i gang'].map(
                      (item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      )
                    )}
                  </ul>

                  <h3 className="font-semibold mt-6 mb-4">Hvorfor ikke høyere:</h3>
                  <ul className="space-y-2">
                    {[
                      'Begrenset funksjonalitet',
                      'Ikke ISO 9001 compliant',
                      'Ingen mobilapp',
                      'Ingen digital signatur',
                      'Færre integrasjoner',
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Perfekt for:</h3>
                  <ul className="space-y-2">
                    {[
                      'Aller minste bedrifter',
                      'Svært enkle HMS-behov',
                      'Stramt budsjett',
                      'Kun grunnleggende dokumentasjon',
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-600" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold mb-1">Fra 6.000 kr/år</div>
                    <div className="text-sm text-muted-foreground">Grunnleggende HMS</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Detaljert sammenligning</h2>

          <Card>
            <CardContent className="p-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Kriterium</th>
                    <th className="text-center p-4 bg-primary/5">
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span>HMS Nova</span>
                      </div>
                    </th>
                    <th className="text-center p-4">Andre systemer</th>
                    <th className="text-center p-4">Excel</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      criteria: 'Pris (0-20 ansatte)',
                      nova: 'Fra 225 kr/mnd',
                      gronn: '7.890 kr/år',
                      kuba: '6.000 kr/år',
                    },
                    {
                      criteria: 'Digital signatur',
                      nova: '✅ Ja',
                      gronn: '❌ Nei',
                      kuba: '❌ Nei',
                    },
                    {
                      criteria: 'Mobiloptimalisert',
                      nova: '✅ Ja',
                      gronn: '✅ Ja',
                      kuba: '⚠️ Begrenset',
                    },
                    {
                      criteria: 'ISO 9001',
                      nova: '✅ 100%',
                      gronn: '⚠️ Delvis',
                      kuba: '❌ Nei',
                    },
                    {
                      criteria: 'Brukerroller',
                      nova: '7 roller',
                      gronn: '3 roller',
                      kuba: '2 roller',
                    },
                    {
                      criteria: 'Oppstartstid',
                      nova: '2 timer',
                      gronn: '1 dag',
                      kuba: '1 time',
                    },
                    {
                      criteria: 'Support',
                      nova: 'Chat, e-post, telefon',
                      gronn: 'E-post, telefon',
                      kuba: 'E-post',
                    },
                  ].map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-4 font-medium">{row.criteria}</td>
                      <td className="p-4 text-center bg-primary/5 font-semibold">{row.nova}</td>
                      <td className="p-4 text-center">{row.gronn}</td>
                      <td className="p-4 text-center">{row.kuba}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection
        faqs={faqs}
        title="Ofte stilte spørsmål"
        description="Svar på vanlige spørsmål om HMS-systemer for små bedrifter"
      />

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Klar til å velge HMS Nova?</h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Registrer bedrift. 14 dagers angrefrist, deretter 12 måneders binding.
            </p>
            <Link href="/registrer-bedrift">
              <Button size="lg" variant="secondary">
                Registrer bedrift
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm mt-6 text-primary-foreground/70">
              12 mnd binding • Norsk support • Fra 300 kr/mnd
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

