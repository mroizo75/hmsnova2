import { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  Truck,
  Users,
  Clock,
  Award,
  AlertTriangle,
  Car,
  Bus,
  Package,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FAQSection } from '@/components/faq-section';
import { getFAQsByCategory } from '@/lib/faq-data';

export const metadata: Metadata = {
  title: 'Beste HMS-system for transport 2026 | HMS Nova',
  description:
    'Sammenligning av HMS-systemer for lastebil, taxi, buss og transportbedrifter. HMS Nova er spesialtilpasset transport med kjøretøysikkerhet, sjåføropplæring og farlig gods.',
  keywords: [
    'HMS-system transport',
    'HMS lastebil',
    'HMS taxi',
    'HMS buss',
    'kjøretøysikkerhet',
    'sjåføropplæring',
    'farlig gods',
    'HMS transportbedrift',
  ],
  openGraph: {
    title: 'Beste HMS-system for transport 2026',
    description:
      'Sammenligning av HMS-systemer for transport. HMS Nova er spesialtilpasset med kjøretøysikkerhet, sjåføropplæring og farlig gods.',
    type: 'article',
  },
};

export default function BesteHMSSystemTransportPage() {
  const transportFAQs = getFAQsByCategory('industry');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">
              <Truck className="h-3 w-3 mr-1" />
              Transportbransjen 2026
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Beste HMS-system for transport
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Sammenligning av HMS-systemer for lastebil, taxi, buss og transportbedrifter.
              Spesialtilpasset med kjøretøysikkerhet, sjåføropplæring og farlig gods-håndtering.
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
                  Best for transport • Kjøretøysikkerhet • Sjåføropplæring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">Fra 225 kr/mnd</div>
                    <div className="text-sm text-muted-foreground">Alt inkludert, ingen skjulte kostnader</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      'Kjøretøysikkerhet-sjekklister',
                      'Daglig kjøretøykontroll',
                      'Sjåføropplæring og sertifikater',
                      'Farlig gods-dokumentasjon',
                      'Arbeidsulykker i transport',
                      'Kjøretid og hviletid',
                      'Lastesikring',
                      'Vinterføre-forberedelse',
                      'Mobiloptimalisert (sjåfører)',
                      'Norsk support (transport-ekspertise)',
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
                  Ikke spesialisert på transport
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
                      { text: 'Begrenset transport-fokus', icon: '⚠️' },
                      { text: 'Mangler farlig gods', icon: '❌' },
                      { text: 'Mangler kjøretøy-sjekklister', icon: '❌' },
                      { text: 'Ikke ADR-støtte', icon: '❌' },
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
                <CardTitle className="text-2xl">Excel / Papir</CardTitle>
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
                      { text: 'Gratis (Excel)', icon: '✅' },
                      { text: 'Ingen opplæring nødvendig', icon: '✅' },
                      { text: 'Manuelt arbeid (20+ timer/mnd)', icon: '❌' },
                      { text: 'Ingen automatisering', icon: '❌' },
                      { text: 'Vanskelig å finne data', icon: '❌' },
                      { text: 'Ingen varsler eller påminnelser', icon: '❌' },
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

      {/* Why HMS Nova for Transport */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Hvorfor HMS Nova for transport?
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card>
                <CardHeader>
                  <Truck className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Kjøretøysikkerhet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Spesialtilpasset for transport med fokus på kjøretøysikkerhet og vedlikehold.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Daglig kjøretøykontroll (før avgang)',
                      'Ukentlig og månedlig kontroll',
                      'Dekk og bremser',
                      'Lys og signal',
                      'Væske-nivåer',
                      'Vedlikeholdsplan og service',
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
                  <CardTitle>Sjåføropplæring</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Spor opplæring, sertifikater og kompetanse for alle sjåfører.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Sjåførkort og sertifikater',
                      'Farlig gods-opplæring (ADR)',
                      'Førstehjelpskurs',
                      'Kjøretøy-spesifikk opplæring',
                      'Vinterføre og glatt vei',
                      'Utløpsdato-varsling',
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
                  <Package className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Farlig gods</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Håndter farlig gods-transport med dokumentasjon og sikkerhet.
                  </p>
                  <div className="space-y-2">
                    {[
                      'ADR-dokumentasjon',
                      'Farlig gods-sjekklister',
                      'Utstyr og sikkerhetsutstyr',
                      'Nødprosedyrer',
                      'Transport-dokumenter',
                      'Opplæring og kompetanse',
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
                  <AlertTriangle className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Arbeidsulykker</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Rapporter og følg opp arbeidsulykker i transport.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Trafikkulykker',
                      'Lasteskader og løfting',
                      'Glatt vei og vinterføre',
                      'Påkjørsler og kollisjoner',
                      'Personskader',
                      'Rotårsaksanalyse og tiltak',
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
                60+ transportfirma bruker HMS Nova
              </h3>
              <p className="text-lg mb-6 text-primary-foreground/90">
                Lastebil, taxi, buss, varebil og andre transportbedrifter stoler på HMS Nova for
                HMS og kjøretøysikkerhet.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">92%</div>
                  <div className="text-sm">Fornøyde kunder</div>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">-55%</div>
                  <div className="text-sm">Mindre tid på HMS</div>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">100%</div>
                  <div className="text-sm">Mobiloptimalisert</div>
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
                    gronn: '12.000-20.000 kr',
                    excel: '0 kr (men 20+ timer/mnd)',
                  },
                  {
                    feature: 'Kjøretøykontroll',
                    nova: '✅ Ja (ferdig maler)',
                    gronn: '⚠️ Begrenset',
                    excel: '❌ Manuelt',
                  },
                  {
                    feature: 'Sjåføropplæring',
                    nova: '✅ Ja',
                    gronn: '✅ Ja',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Farlig gods (ADR)',
                    nova: '✅ Ja',
                    gronn: '⚠️ Begrenset',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Lastesikring',
                    nova: '✅ Ja',
                    gronn: '⚠️ Begrenset',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Mobiloptimalisert',
                    nova: '✅ Ja',
                    gronn: '✅ Ja',
                    excel: '❌ Nei',
                  },
                  {
                    feature: 'Offline-modus (PWA)',
                    nova: '🔜 Q1 2026',
                    gronn: '❌ Nei',
                    excel: '✅ Ja (lokalt)',
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
                    feature: 'Norsk support',
                    nova: '✅ Ja (transport-ekspertise)',
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
                    excel: '20+ timer',
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
                  icon: <Truck className="h-8 w-8" />,
                  title: 'Lastebil',
                  description:
                    'Kjøretøykontroll, farlig gods, lastesikring, sjåføropplæring, og arbeidsulykker.',
                },
                {
                  icon: <Car className="h-8 w-8" />,
                  title: 'Taxi',
                  description:
                    'Kjøretøysikkerhet, sjåførsertifikater, passasjersikkerhet, og daglig kontroll.',
                },
                {
                  icon: <Bus className="h-8 w-8" />,
                  title: 'Buss',
                  description:
                    'Passasjersikkerhet, kjøretøykontroll, sjåføropplæring, og rutinemessig vedlikehold.',
                },
                {
                  icon: <Package className="h-8 w-8" />,
                  title: 'Varebil / Distribusjon',
                  description:
                    'Lastesikring, kjøretøykontroll, sjåføropplæring, og effektiv HMS-håndtering.',
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
            <FAQSection faqs={transportFAQs} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Klar for HMS Nova i transport?</h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              60+ transportfirma bruker HMS Nova daglig. Spesialtilpasset med kjøretøysikkerhet,
              sjåføropplæring og farlig gods. Offline Q1 2026, mobilapp Q2 2026.
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

