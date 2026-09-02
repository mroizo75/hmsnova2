import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
import { 
  CheckCircle2, 
  ArrowRight,
  AlertTriangle,
  Shield,
  FileText,
  Target,
  TrendingUp,
  BarChart3,
  Bell,
  Users
} from "lucide-react";

export const metadata: Metadata = {
  title: "Digital Risikovurdering i HMS Nova | 5x5 Risikomatrise",
  description: "Gjennomfør risikovurderinger digitalt med HMS Nova. 5x5 risikomatrise, automatisk tiltaksoppfølging, PDF-rapporter og ISO 9001-compliance. 14 dagers angrefrist, deretter 12 måneders binding.",
  keywords: ["risikovurdering", "risikomatrise", "5x5 matrise", "HMS risikovurdering", "risikoanalyse", "SJA"],
};

export default function RisikovurderingMalPage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-6">
              <AlertTriangle className="h-3 w-3 mr-2" />
              Digital risikovurdering
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Risikovurdering<br />
              <span className="text-primary">som faktisk fungerer</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Slutt med Excel-ark som ingen oppdaterer. Med HMS Nova får du en dynamisk 
              risikomatrise som holder oversikten for deg – med automatisk tiltaksoppfølging.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <RegisterDialog>
                <Button size="lg" className="text-lg px-8 bg-green-700 hover:bg-green-800 text-white">
                  Registrer bedrift
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </RegisterDialog>
              <Link href="/priser">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Se priser
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              ✓ 14 dagers angrefrist  ✓ Full tilgang  ✓ Fra 225 kr/mnd
            </p>
          </div>
        </div>
      </section>

      {/* Hvorfor digital */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hvorfor digital risikovurdering?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Excel-baserte risikovurderinger blir fort utdaterte og vanskelige å følge opp. 
              Med HMS Nova blir alt enklere, mer sporbart og alltid oppdatert.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">5x5 Risikomatrise</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Automatisk beregning av risikoscore med fargekoding. Visuell oversikt over alle risikoer.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Tiltaksoppfølging</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tiltak tildeles automatisk til ansvarlige med frister. Se status i sanntid.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Bell className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Automatiske påminnelser</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Få varsel når tiltak forfaller eller risikovurderinger må revideres.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Trender over tid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Se hvordan risikobildet utvikler seg. Blir det bedre eller verre?
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Funksjoner */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Risikovurdering-modulen</Badge>
              <h2 className="text-3xl font-bold mb-6">
                Alt du trenger for god risikostyring
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">5x5 risikomatrise</p>
                    <p className="text-sm text-muted-foreground">Sannsynlighet × konsekvens med automatisk fargekoding</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Ferdige farekategorier</p>
                    <p className="text-sm text-muted-foreground">Fysiske, psykososiale, ergonomiske og organisatoriske farer</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Automatisk tiltaksoppfølging</p>
                    <p className="text-sm text-muted-foreground">Tiltak blir tildelt ansvarlig med frist og påminnelser</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Restrisiko-beregning</p>
                    <p className="text-sm text-muted-foreground">Se hvordan tiltak reduserer risikoen</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">PDF-rapport med ett klikk</p>
                    <p className="text-sm text-muted-foreground">Eksporter for revisjoner og Arbeidstilsynet</p>
                  </div>
                </li>
              </ul>
            </div>

            <Card className="border-2 border-primary/20">
              <CardContent className="p-8">
                <div className="text-center">
                  <AlertTriangle className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Digital risikovurdering</h3>
                  <p className="text-muted-foreground mb-6">
                    Full tilgang fra dag én. 14 dagers angrefrist, deretter 12 måneders binding.
                  </p>
                  <RegisterDialog>
                    <Button size="lg" className="w-full bg-green-700 hover:bg-green-800 text-white">
                      Registrer bedrift
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </RegisterDialog>
                  <p className="text-xs text-muted-foreground mt-3">
                    14 dagers angrefrist, deretter 12 mnd binding
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Info om risikovurdering */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hva er risikovurdering?
            </h2>
            <p className="text-muted-foreground">
              Risikovurdering er grunnlaget for alt HMS-arbeid
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Lovkrav</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>Arbeidsmiljøloven §3-1</strong> krever at alle arbeidsgivere 
                  identifiserer farer og vurderer risiko på arbeidsplassen.
                </p>
                <p>
                  Uten dokumentert risikovurdering risikerer dere bøter fra 
                  Arbeidstilsynet og manglende oversikt over fareområder.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-8 w-8 text-primary mb-2" />
                <CardTitle>5x5 Risikomatrise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Risiko = <strong>Sannsynlighet × Konsekvens</strong>. 
                  Begge vurderes på en skala fra 1-5.
                </p>
                <p>
                  Resultatet gir en risikoscore fra 1-25 som fargekodes: 
                  grønn (lav), gul (middels), oransje (høy), rød (kritisk).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Hva skal vurderes?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Fysiske farer (støy, kjemikalier, maskiner)</li>
                  <li>• Psykososiale farer (stress, mobbing)</li>
                  <li>• Ergonomiske farer (tunge løft, arbeidsstillinger)</li>
                  <li>• Organisatoriske farer (opplæring, rutiner)</li>
                  <li>• Brann og elektrisitet</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Hvem skal delta?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Risikovurdering skal gjøres i samarbeid med de ansatte. 
                  De som utfører arbeidet kjenner farene best.
                </p>
                <p>
                  <strong>Anbefalt:</strong> Leder, verneombud, HMS-ansvarlig 
                  og representanter fra de ulike arbeidsområdene.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Klar til å få kontroll på risiko?
              </h2>
              <p className="text-lg text-primary-foreground/90 mb-8">
                Registrer bedrift. 14 dagers angrefrist, deretter 12 måneders binding.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <RegisterDialog>
                  <Button size="lg" className="text-lg px-8 bg-green-700 hover:bg-green-800 text-white">
                    Registrer bedrift
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </RegisterDialog>
                <Link href="/priser">
                  <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent border-white text-white hover:bg-white/10">
                    Se priser
                  </Button>
                </Link>
              </div>
              <p className="text-sm mt-6 text-primary-foreground/70">
                Fra 300 kr/mnd • 12 mnd binding etter 14 dager • Norsk support
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
