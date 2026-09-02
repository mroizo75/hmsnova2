import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ArrowRight, Trophy, Medal, HardHat, Smartphone, WifiOff, Camera } from 'lucide-react';
import { FAQSection } from '@/components/faq-section';
import { getFAQsForPage } from '@/lib/faq-data';

export const metadata: Metadata = {
  title: 'Beste HMS-system for byggebransjen 2026',
  description:
    'HMS Nova er det beste HMS-systemet for byggebransjen. Kraftig mobilapp med offline-modus, SHA-plan maler, fallsikring-sjekklister og bildeopptak på byggeplass.',
  keywords:
    'hms system bygg, sha plan, byggeplass hms, fallsikring, hms bygg og anlegg, mobilapp bygg',
  openGraph: {
    title: 'Beste HMS-system for byggebransjen',
    description: 'HMS Nova - Perfekt for byggeplassen med offline-modus',
    type: 'article',
  },
};

export default function BesteHMSSystemByggPage() {
  const faqs = getFAQsForPage('industry-bygg');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            <HardHat className="h-4 w-4 mr-2" />
            Bygg og anlegg
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Beste HMS-system for byggebransjen
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            HMS Nova er perfekt for byggeplassen. Kraftig mobilapp med offline-modus, SHA-plan
            maler, og bildeopptak direkte fra stedet.
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
                  🏆 Beste for bygg
                </Badge>
              </div>
              <CardTitle className="text-3xl">HMS Nova</CardTitle>
              <CardDescription className="text-lg">
                Mobiloptimalisert • Offline Q1 2026 • Mobilapp Q2 2026
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <HardHat className="h-5 w-5 text-primary" />
                    Hvorfor HMS Nova er best for bygg:
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'Nettbasert system (fungerer på alle enheter)',
                      'Mobiloptimalisert design',
                      'Bildeopptak og vedlegg',
                      'SHA-plan maler ferdig til bruk',
                      'Fallsikring-sjekklister',
                      'Stillasinspeksjon-maler',
                      'Maskinkontroll og vedlikehold',
                      'Verneutstyr-registrering',
                      'Underentreprenør-håndtering',
                      'Vernerunde-sjekklister for bygg',
                      'Digital signatur',
                      'Offline-modus (Q1 2026)',
                      'Dedikert mobilapp iOS/Android (Q2 2026)',
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="p-6 bg-primary/10 rounded-lg mb-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Mobil-funksjoner:
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">Mobiloptimalisert</div>
                          <div className="text-sm text-muted-foreground">
                            Fungerer perfekt på mobil og nettbrett
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Camera className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">Bildeopptak</div>
                          <div className="text-sm text-muted-foreground">
                            Last opp bilder av avvik og hendelser
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">Sjekklister</div>
                          <div className="text-sm text-muted-foreground">
                            Digitale sjekklister for alle inspeksjoner
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <WifiOff className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">Offline-modus (Q1 2026)</div>
                          <div className="text-sm text-muted-foreground">
                            Arbeid uten nett, synkroniserer automatisk
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Smartphone className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">Mobilapp iOS/Android (Q2 2026)</div>
                          <div className="text-sm text-muted-foreground">
                            Native app med full offline-støtte
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-muted rounded-lg mb-6">
                    <h3 className="font-semibold mb-4">Kunder i byggebransjen:</h3>
                    <div className="text-4xl font-bold mb-2">150+</div>
                    <p className="text-sm text-muted-foreground">
                      Byggefirma bruker HMS Nova daglig
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg mb-4">
                    <div className="text-2xl font-bold mb-1">Fra 225 kr/mnd</div>
                    <div className="text-sm text-muted-foreground">
                      Avhengig av bedriftsstørrelse
                    </div>
                  </div>

                  <Link href="/registrer-bedrift" className="block">
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

      {/* Bygg-spesifikke funksjoner */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Bygg-spesifikke funksjoner i HMS Nova
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'SHA-plan (Sikkerhet, Helse, Arbeidsmiljø)',
                description: 'Ferdiglagde SHA-plan maler for ulike prosjekttyper',
                features: [
                  'Risikovurdering per aktivitet',
                  'Sikkerhetstiltak dokumentert',
                  'Ansvar og roller definert',
                  'Digital godkjenning',
                ],
              },
              {
                title: 'Fallsikring og høydearbeid',
                description: 'Sjekklister og prosedyrer for arbeid i høyden',
                features: [
                  'Fallsikring-sjekkliste',
                  'Stillas-inspeksjon',
                  'Personlig verneutstyr kontroll',
                  'Opplæring dokumentert',
                ],
              },
              {
                title: 'Maskiner og utstyr',
                description: 'Kontroll og vedlikehold av maskiner',
                features: [
                  'Maskinkontroll-sjekklister',
                  'Vedlikeholdsplan',
                  'Sertifikater og dokumentasjon',
                  'Påminnelser om service',
                ],
              },
              {
                title: 'Underentreprenører',
                description: 'Håndter HMS for underentreprenører',
                features: [
                  'UE-godkjenning',
                  'HMS-dokumentasjon fra UE',
                  'Koordinering av sikkerhet',
                  'Tilgangskontroll',
                ],
              },
              {
                title: 'Vernerunder på byggeplass',
                description: 'Digitale vernerunder tilpasset bygg',
                features: [
                  'Bygg-spesifikke sjekklister',
                  'Bildeopptak av avvik',
                  'GPS-lokasjon',
                  'Umiddelbar varsling',
                ],
              },
              {
                title: 'Hendelsesrapportering',
                description: 'Rask rapportering fra byggeplass',
                features: [
                  'Rapporter på 2 minutter',
                  'Offline-støtte',
                  'Bildevedlegg',
                  'Automatisk varsling',
                ],
              },
            ].map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Sammenligning for bygg</h2>

          <Card>
            <CardContent className="p-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Funksjon</th>
                    <th className="text-center p-4 bg-primary/5">
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span>HMS Nova</span>
                      </div>
                    </th>
                    <th className="text-center p-4">Andre systemer</th>
                    <th className="text-center p-4">Avonova</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      feature: 'Mobiloptimalisert',
                      nova: '✅ Ja',
                      gronn: '✅ Ja',
                      avonova: '✅ Ja',
                    },
                    {
                      feature: 'Offline-modus (PWA)',
                      nova: '🔜 Q1 2026',
                      gronn: '❌ Nei',
                      avonova: '⚠️ Delvis',
                    },
                    {
                      feature: 'Native mobilapp',
                      nova: '🔜 Q2 2026',
                      gronn: '⚠️ Begrenset',
                      avonova: '✅ Ja',
                    },
                    {
                      feature: 'Bildeopptak',
                      nova: '✅ Ubegrenset',
                      gronn: '✅ Ja',
                      avonova: '✅ Ja',
                    },
                    {
                      feature: 'SHA-plan maler',
                      nova: '✅ Ferdiglagde',
                      gronn: '⚠️ Grunnleggende',
                      avonova: '✅ Ja',
                    },
                    {
                      feature: 'Fallsikring-sjekklister',
                      nova: '✅ Ja',
                      gronn: '⚠️ Generelle',
                      avonova: '✅ Ja',
                    },
                    {
                      feature: 'UE-håndtering',
                      nova: '✅ Ja',
                      gronn: '❌ Nei',
                      avonova: '✅ Ja',
                    },
                    {
                      feature: 'Pris (0-20 ansatte)',
                      nova: 'Fra 225 kr/mnd',
                      gronn: '7.890 kr/år',
                      avonova: '15.000+ kr/år',
                    },
                  ].map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-4 font-medium">{row.feature}</td>
                      <td className="p-4 text-center bg-primary/5 font-semibold">{row.nova}</td>
                      <td className="p-4 text-center">{row.gronn}</td>
                      <td className="p-4 text-center">{row.avonova}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Second Place */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-orange-500/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <Medal className="h-7 w-7 text-orange-500" />
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    🥈 Andreplassen
                  </Badge>
                </div>
                <CardTitle className="text-2xl">Avonova</CardTitle>
                <CardDescription>God for store byggeprosjekter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Omfattende BHT-tjenester</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">God mobilapp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Mye dyrere (15.000+ kr/år)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Mer komplekst oppsett</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-600/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <Medal className="h-6 w-6 text-muted-foreground" />
                  <Badge variant="outline">
                    Tilsvarende systemer
                  </Badge>
                </div>
                <CardTitle className="text-2xl">Andre HMS-systemer</CardTitle>
                <CardDescription>Ikke spesialisert på bygg</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">Mangler SHA-plan maler</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">Begrenset mobilapp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">Ingen offline-modus</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">Ikke byggebransje-fokusert</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection
        faqs={faqs}
        title="Ofte stilte spørsmål om HMS for bygg"
        description="Svar på vanlige spørsmål om HMS-system for byggebransjen"
      />

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <HardHat className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Klar for HMS Nova på byggeplassen?</h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Mobiloptimalisert system med SHA-plan maler og bygg-spesifikke funksjoner. 
              Utviklet for norsk byggebransje. Offline-modus planlagt Q1 2026, mobilapp Q2 2026.
            </p>
            <Link href="/registrer-bedrift">
              <Button size="lg" variant="secondary">
                Registrer bedrift
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm mt-6 text-primary-foreground/70">
              14 dagers angrefrist • Deretter 12 mnd binding • Norsk support
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

