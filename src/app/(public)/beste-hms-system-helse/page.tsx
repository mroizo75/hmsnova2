import { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  FileText,
  Users,
  Clock,
  Award,
  AlertTriangle,
  Heart,
  Stethoscope,
  Syringe,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FAQSection } from '@/components/faq-section';
import { getFAQsByCategory } from '@/lib/faq-data';

export const metadata: Metadata = {
  title: 'Beste HMS-system for helsesektoren 2026 | HMS Nova',
  description:
    'Sammenligning av HMS-systemer for sykehjem, legekontor, tannleger og helseinstitusjon. HMS Nova er spesialtilpasset helsesektoren med smittevern, legemiddelhåndtering og pasient-sikkerhet.',
  keywords: [
    'HMS-system helse',
    'HMS sykehjem',
    'HMS legekontor',
    'HMS tannlege',
    'smittevern HMS',
    'pasient-sikkerhet',
    'legemiddelhåndtering',
    'HMS helseinstitusjon',
  ],
  openGraph: {
    title: 'Beste HMS-system for helsesektoren 2026',
    description:
      'Sammenligning av HMS-systemer for helse. HMS Nova er spesialtilpasset med smittevern, legemiddelhåndtering og pasient-sikkerhet.',
    type: 'article',
  },
};

export default function BesteHMSSystemHelsePage() {
  const healthFAQs = getFAQsByCategory('industry');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">
              <Heart className="h-3 w-3 mr-1" />
              Helsesektoren 2026
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Beste HMS-system for helsesektoren
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Sammenligning av HMS-systemer for sykehjem, legekontor, tannleger og
              helseinstitusjon. Spesialtilpasset med smittevern, legemiddelhåndtering og
              pasient-sikkerhet.
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
                  Best for helsesektoren • Smittevern • Pasient-sikkerhet
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
                      'Smittevern-sjekklister',
                      'Legemiddelhåndtering',
                      'Pasient-sikkerhet',
                      'Avviksmeldinger (IPLoS)',
                      'Infeksjonskontroll',
                      'Hygiene-rutiner',
                      'Vaksine-sporing',
                      'Medarbeider helsekontroll',
                      'GDPR-compliant (helseopplysninger)',
                      'Norsk support (helse-ekspertise)',
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
                  <Badge variant="secondary">🥈 Andreplassen</Badge>
                </div>
                <CardTitle className="text-2xl">Avonova</CardTitle>
                <CardDescription className="text-lg">
                  Best hvis du trenger bedriftshelsetjeneste
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold mb-1">25.000-50.000 kr/år</div>
                    <div className="text-sm text-muted-foreground">+ BHT-tjenester ekstra</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { text: 'Grunnleggende HMS', icon: '✅' },
                      { text: 'BHT-tjenester inkludert', icon: '✅' },
                      { text: 'Helsekontroller', icon: '✅' },
                      { text: 'Dyrere enn HMS Nova', icon: '⚠️' },
                      { text: 'Kompleks brukergrensesnitt', icon: '⚠️' },
                      { text: 'Begrenset smittevern-fokus', icon: '⚠️' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="https://avonova.no" target="_blank" rel="noopener">
                      Besøk Avonova
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">Tilsvarende systemer</Badge>
                </div>
                <CardTitle className="text-2xl">Generiske HMS-systemer</CardTitle>
                <CardDescription className="text-lg">
                  Ikke tilpasset helsesektoren
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
                      { text: 'Ingen smittevern-maler', icon: '❌' },
                      { text: 'Ingen legemiddel-modul', icon: '❌' },
                      { text: 'Ikke tilpasset helsesektoren', icon: '❌' },
                      { text: 'Mangler spesialiserte sjekklister', icon: '❌' },
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
          </div>
        </div>
      </section>

      {/* Why HMS Nova for Healthcare */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Hvorfor HMS Nova for helsesektoren?
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Smittevern og infeksjonskontroll</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Spesialtilpasset for helsesektoren med fokus på smittevern og
                    infeksjonskontroll.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Smittevern-sjekklister (daglig, ukentlig, månedlig)',
                      'Hygiene-rutiner og håndvask-protokoller',
                      'Isolasjons-prosedyrer',
                      'Utbrudds-håndtering',
                      'Desinfeksjon og renhold',
                      'Smittevernutstyr-kontroll',
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
                  <Syringe className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Legemiddelhåndtering</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Sikker håndtering av legemidler med sporbarhet og kontroll.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Legemiddel-rutiner og prosedyrer',
                      'Medisinrom-kontroll',
                      'Kjøleskap-temperatur logging',
                      'Narkotika-håndtering',
                      'Legemiddel-avvik (feil dosering, etc.)',
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
                  <Heart className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Pasient-sikkerhet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Fokus på pasient-sikkerhet med avviksmeldinger og forbedring.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Avviksmeldinger (IPLoS-kompatibel)',
                      'Fall og skader',
                      'Trykksår-forebygging',
                      'Ernæring og væske',
                      'Pasient-identifikasjon',
                      'Forbedringstiltak og oppfølging',
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
                  <Activity className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Medarbeider-helse</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Ivareta helsen til dine ansatte i helsesektoren.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Vaksine-sporing (hepatitt, influensa, etc.)',
                      'Helsekontroller og oppfølging',
                      'Stikkskader og eksponering',
                      'Ergonomi og løfteteknikk',
                      'Arbeidstidsbestemmelser',
                      'Psykososialt arbeidsmiljø',
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
                200+ helseinstitusjoner bruker HMS Nova
              </h3>
              <p className="text-lg mb-6 text-primary-foreground/90">
                Sykehjem, legekontor, tannleger, fysioterapeuter og andre helseaktører stoler på
                HMS Nova for HMS og pasient-sikkerhet.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">95%</div>
                  <div className="text-sm">Fornøyde kunder</div>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">-60%</div>
                  <div className="text-sm">Mindre tid på HMS</div>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">100%</div>
                  <div className="text-sm">GDPR-compliant</div>
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
                  <th className="p-4 text-center font-semibold">Avonova</th>
                  <th className="p-4 text-center font-semibold">Andre systemer</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: 'Pris per år',
                    nova: 'Fra 225 kr/mnd',
                    avonova: '25.000-50.000 kr',
                    gronn: '12.000-20.000 kr',
                  },
                  {
                    feature: 'Smittevern-sjekklister',
                    nova: '✅ Ja (ferdig maler)',
                    avonova: '⚠️ Begrenset',
                    gronn: '❌ Nei',
                  },
                  {
                    feature: 'Legemiddelhåndtering',
                    nova: '✅ Ja',
                    avonova: '⚠️ Begrenset',
                    gronn: '❌ Nei',
                  },
                  {
                    feature: 'Pasient-sikkerhet (IPLoS)',
                    nova: '✅ Ja',
                    avonova: '✅ Ja',
                    gronn: '❌ Nei',
                  },
                  {
                    feature: 'Infeksjonskontroll',
                    nova: '✅ Ja',
                    avonova: '⚠️ Begrenset',
                    gronn: '❌ Nei',
                  },
                  {
                    feature: 'Vaksine-sporing',
                    nova: '✅ Ja',
                    avonova: '✅ Ja (via BHT)',
                    gronn: '❌ Nei',
                  },
                  {
                    feature: 'GDPR (helseopplysninger)',
                    nova: '✅ Ja',
                    avonova: '✅ Ja',
                    gronn: '✅ Ja',
                  },
                  {
                    feature: 'Mobiloptimalisert',
                    nova: '✅ Ja',
                    avonova: '✅ Ja',
                    gronn: '✅ Ja',
                  },
                  {
                    feature: 'Offline-modus (PWA)',
                    nova: '🔜 Q1 2026',
                    avonova: '⚠️ Delvis',
                    gronn: '❌ Nei',
                  },
                  {
                    feature: 'BHT-tjenester',
                    nova: '⚠️ Ekstra (via partner)',
                    avonova: '✅ Inkludert',
                    gronn: '❌ Nei',
                  },
                  {
                    feature: 'Norsk support',
                    nova: '✅ Ja (helse-ekspertise)',
                    avonova: '✅ Ja',
                    gronn: '✅ Ja',
                  },
                  {
                    feature: 'Opplæring',
                    nova: '✅ Gratis',
                    avonova: '✅ Inkludert',
                    gronn: '✅ Gratis',
                  },
                ].map((row, index) => (
                  <tr key={index} className="border-t border-border">
                    <td className="p-4 font-medium">{row.feature}</td>
                    <td className="p-4 text-center">{row.nova}</td>
                    <td className="p-4 text-center">{row.avonova}</td>
                    <td className="p-4 text-center">{row.gronn}</td>
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
                  icon: <Heart className="h-8 w-8" />,
                  title: 'Sykehjem',
                  description:
                    'Smittevern, legemiddelhåndtering, fall-forebygging, ernæring, og pasient-sikkerhet.',
                },
                {
                  icon: <Stethoscope className="h-8 w-8" />,
                  title: 'Legekontor',
                  description:
                    'Infeksjonskontroll, medisinrom-kontroll, avviksmeldinger, og medarbeider-helse.',
                },
                {
                  icon: <Activity className="h-8 w-8" />,
                  title: 'Tannleger',
                  description:
                    'Hygiene-rutiner, smittevern, instrumenthåndtering, og stikkskade-rapportering.',
                },
                {
                  icon: <Users className="h-8 w-8" />,
                  title: 'Fysioterapeuter',
                  description:
                    'Ergonomi, utstyrskontroll, pasient-sikkerhet, og arbeidsmiljø.',
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
            <FAQSection faqs={healthFAQs} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Klar for HMS Nova i helsesektoren?</h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              200+ helseinstitusjoner bruker HMS Nova daglig. Spesialtilpasset med smittevern,
              legemiddelhåndtering og pasient-sikkerhet. Offline Q1 2026, mobilapp Q2 2026.
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

