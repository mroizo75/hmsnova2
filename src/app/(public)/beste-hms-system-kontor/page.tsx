import { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  Users,
  Clock,
  Award,
  AlertTriangle,
  Monitor,
  Coffee,
  Briefcase,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FAQSection } from '@/components/faq-section';
import { getFAQsByCategory } from '@/lib/faq-data';

export const metadata: Metadata = {
  title: 'Beste HMS-system for kontorbedrifter 2026 | HMS Nova',
  description:
    'Sammenligning av HMS-systemer for kontorbedrifter. HMS Nova er perfekt for kontor med ergonomi, psykososialt arbeidsmiljø og ISO 9001-støtte.',
  keywords: [
    'HMS-system kontor',
    'HMS kontorbedrift',
    'ergonomi kontor',
    'psykososialt arbeidsmiljø',
    'HMS for små bedrifter',
    'ISO 9001 kontor',
  ],
  openGraph: {
    title: 'Beste HMS-system for kontorbedrifter 2026',
    description:
      'Sammenligning av HMS-systemer for kontor. HMS Nova er perfekt med ergonomi, psykososialt arbeidsmiljø og ISO 9001.',
    type: 'article',
  },
};

export default function BesteHMSSystemKontorPage() {
  const generalFAQs = getFAQsByCategory('general');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">
              <Building2 className="h-3 w-3 mr-1" />
              Kontorbedrifter 2026
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Beste HMS-system for kontorbedrifter
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Sammenligning av HMS-systemer for kontorbedrifter. Perfekt for små og mellomstore
              bedrifter med fokus på ergonomi, psykososialt arbeidsmiljø og ISO 9001.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Registrer bedrift
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/demo">Se demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Comparison */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Rask sammenligning</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border-2 border-primary shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-yellow-500">🏆 Vinner</Badge>
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">HMS Nova</CardTitle>
                <CardDescription className="text-lg">
                  Best for kontor • Enkel • ISO 9001-klar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">Fra 225 kr/mnd</div>
                    <div className="text-sm text-muted-foreground">Alt inkludert, ubegrenset brukere</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      'Ergonomi og skjermarbeid',
                      'Psykososialt arbeidsmiljø',
                      'Vernerunder (kontor-tilpasset)',
                      'Avviksmeldinger',
                      'Risikovurderinger',
                      'ISO 9001-støtte (100% compliant)',
                      'Digital signatur',
                      'Mobiloptimalisert',
                      'Norsk support',
                      'Perfekt for små bedrifter',
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" size="lg" asChild>
                    <Link href="/register">Velg HMS Nova</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">Tilsvarende systemer</Badge>
                </div>
                <CardTitle className="text-2xl">Andre HMS-systemer</CardTitle>
                <CardDescription className="text-lg">
                  Generiske løsninger
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Varierende priser</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { text: 'Grunnleggende HMS', icon: '✅' },
                      { text: 'Generiske maler', icon: '⚠️' },
                      { text: 'Ofte dyrere', icon: '⚠️' },
                      { text: 'Mer komplekse', icon: '⚠️' },
                      { text: 'Ikke ISO 9001-fokusert', icon: '⚠️' },
                      { text: 'Ikke norsk språk', icon: '❌' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">🥉 Tredjeplassen</Badge>
                </div>
                <CardTitle className="text-2xl">Excel / Word</CardTitle>
                <CardDescription className="text-lg">
                  Tradisjonell løsning, ikke anbefalt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold mb-1">0 kr/år</div>
                    <div className="text-sm text-muted-foreground">Men høy tidskostnad</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { text: 'Gratis (Excel/Word)', icon: '✅' },
                      { text: 'Ingen opplæring nødvendig', icon: '✅' },
                      { text: 'Manuelt arbeid (15+ timer/mnd)', icon: '❌' },
                      { text: 'Ingen automatisering', icon: '❌' },
                      { text: 'Vanskelig å finne dokumenter', icon: '❌' },
                      { text: 'Ikke ISO 9001-godkjent', icon: '❌' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" variant="outline" disabled>
                    Ikke anbefalt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why HMS Nova for Office */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Hvorfor HMS Nova for kontorbedrifter?
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card>
                <CardHeader>
                  <Monitor className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Ergonomi og skjermarbeid</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Fokus på ergonomi og skjermarbeid for et sunt kontormiljø.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Ergonomi-vurdering (skjerm, stol, bord)',
                      'Skjermarbeid og pauser',
                      'Belysning og inneklima',
                      'Støy og akustikk',
                      'Muskel- og skjelettplager',
                      'Arbeidsstilling og bevegelse',
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Psykososialt arbeidsmiljø</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Ivareta det psykososiale arbeidsmiljøet med strukturerte verktøy.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Arbeidsmiljøundersøkelser',
                      'Stress og arbeidsbelastning',
                      'Mobbing og trakassering',
                      'Konflikthåndtering',
                      'Medarbeidersamtaler',
                      'Sykefravær-oppfølging',
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Award className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>ISO 9001-støtte</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    100% ISO 9001:2015 compliant - perfekt for sertifisering.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Alle 10 ISO 9001-krav dekket',
                      'Dokumentstyring og versjonering',
                      'Avvikshåndtering (8D-metode)',
                      'Kontinuerlig forbedring',
                      'Ledelsens gjennomgang',
                      '3-6 måneder til sertifisering',
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Clock className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Spar tid</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Automatiser HMS-arbeidet og spar verdifull tid.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Automatiske varsler og påminnelser',
                      'Ferdig maler for kontor',
                      'Digital signatur (ingen print)',
                      'Søk og finn dokumenter raskt',
                      'Rapporter genereres automatisk',
                      '2-4 timer/måned (vs 15+ med Excel)',
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-primary text-primary-foreground rounded-lg p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">
                500+ kontorbedrifter bruker HMS Nova
              </h3>
              <p className="text-lg mb-6 text-primary-foreground/90">
                Rådgivning, IT, regnskap, advokatfirma, eiendom og andre kontorbedrifter stoler på
                HMS Nova for enkel og effektiv HMS-håndtering.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">97%</div>
                  <div className="text-sm">Fornøyde kunder</div>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">-70%</div>
                  <div className="text-sm">Mindre tid på HMS</div>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">3-6 mnd</div>
                  <div className="text-sm">Til ISO 9001</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Comparison Table */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Detaljert sammenligning</h2>
          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse bg-background rounded-lg overflow-hidden shadow-lg">
              <thead>
                <tr className="bg-muted">
                  <th className="p-4 text-left font-semibold">Funksjon</th>
                  <th className="p-4 text-center font-semibold">HMS Nova</th>
                  <th className="p-4 text-center font-semibold">Andre systemer</th>
                  <th className="p-4 text-center font-semibold">Excel</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: 'Pris per år',
                    nova: 'Fra 225 kr/mnd',
                    gronn: '12.000-18.000 kr',
                    excel: '0 kr (men 15+ timer/mnd)',
                  },
                  {
                    feature: 'Ergonomi-maler',
                    nova: '✅ Ja (ferdig maler)',
                    gronn: '✅ Ja',
                    excel: '❌ Manuelt',
                  },
                  {
                    feature: 'Psykososialt arbeidsmiljø',
                    nova: '✅ Ja',
                    gronn: '✅ Ja',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'ISO 9001-støtte',
                    nova: '✅ 100% compliant',
                    gronn: '⚠️ Delvis',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Digital signatur',
                    nova: '✅ Ja',
                    gronn: '✅ Ja',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Mobiloptimalisert',
                    nova: '✅ Ja',
                    gronn: '✅ Ja',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Automatiske varsler',
                    nova: '✅ Ja',
                    gronn: '✅ Ja',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Rapporter og statistikk',
                    nova: '✅ Ja (automatisk)',
                    gronn: '✅ Ja',
                    excel: '⚠️ Manuelt',
                  },
                  {
                    feature: 'Dokumentstyring',
                    nova: '✅ Ja (versjonering)',
                    gronn: '✅ Ja',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Norsk support',
                    nova: '✅ Ja',
                    gronn: '✅ Ja',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Opplæring',
                    nova: '✅ Gratis',
                    gronn: '✅ Gratis',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Tidskostnad per måned',
                    nova: '2-4 timer',
                    gronn: '3-5 timer',
                    excel: '15+ timer',
                  },
                ].map((row, index) => (
                  <tr key={index} className="border-t border-border">
                    <td className="p-4 font-medium">{row.feature}</td>
                    <td className="p-4 text-center">{row.nova}</td>
                    <td className="p-4 text-center">{row.gronn}</td>
                    <td className="p-4 text-center">{row.excel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              HMS Nova passer perfekt for:
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: <Briefcase className="h-8 w-8" />,
                  title: 'Rådgivning og konsulentfirma',
                  description:
                    'Ergonomi, psykososialt arbeidsmiljø, ISO 9001, og effektiv HMS-håndtering.',
                },
                {
                  icon: <Monitor className="h-8 w-8" />,
                  title: 'IT-bedrifter',
                  description:
                    'Skjermarbeid, ergonomi, hjemmekontor, og moderne HMS-løsning.',
                },
                {
                  icon: <Building2 className="h-8 w-8" />,
                  title: 'Eiendom og forvaltning',
                  description:
                    'Vernerunder, risikovurderinger, ISO 9001, og dokumentstyring.',
                },
                {
                  icon: <Users className="h-8 w-8" />,
                  title: 'Små og mellomstore bedrifter',
                  description:
                    'Enkel HMS-håndtering, ISO 9001-støtte, og spar tid på HMS-arbeid.',
                },
              ].map((useCase, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="text-primary mb-2">{useCase.icon}</div>
                    <CardTitle>{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{useCase.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Ofte stilte spørsmål</h2>
            <FAQSection faqs={generalFAQs} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Klar for HMS Nova på kontoret?</h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              500+ kontorbedrifter bruker HMS Nova daglig. Enkel, effektiv og ISO 9001-klar.
              Spar 70% tid på HMS-arbeid. Offline Q1 2026, mobilapp Q2 2026.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">
                  Registrer bedrift
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link href="/demo">Bestill demo</Link>
              </Button>
            </div>
            <p className="text-sm mt-6 text-primary-foreground/70">
              14 dagers angrefrist • Deretter 12 mnd binding • Norsk support
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

