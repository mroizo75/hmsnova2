"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowRight,
  AlertTriangle,
  Download,
  Shield,
  FileText,
  Target,
  TrendingUp
} from "lucide-react";

export default function RisikovurderingMalPage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-6">
              <Download className="h-3 w-3 mr-2" />
              Gratis mal
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Gratis risikovurdering-mal<br />
              <span className="text-primary">Gjør jobben på 15 minutter</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              En profesjonell mal for risikovurdering som oppfyller kravene i Arbeidsmiljøloven. 
              Identifiser farer, vurder risiko og planlegg tiltak – enkelt og oversiktlig.
            </p>
          </div>

          <Card className="border-2 border-primary/20 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl">Profesjonell risikovurdering-mal</h3>
                  <p className="text-muted-foreground">5x5 risikomatrise med Excel-format</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Hva får du?
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>5x5 risikomatrise (sannsynlighet × konsekvens)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Ferdige farekategorier og eksempler</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Automatisk fargekoding av risikonivå</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Tiltaksplan med ansvarlige og frister</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Excel og PDF-format</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Veiledning for utfylling</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Dekker alle farekategorier
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Fysiske farer (støy, vibrasjoner, kjemikalier)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Psykososiale farer (stress, mobbing, trakassering)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Ergonomiske farer (tunge løft, repeterende arbeid)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Organisatoriske farer (mangel på opplæring)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Brann, elektrisitet og maskiner</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>+ mye mer</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-6 mb-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Hvorfor trenger du risikovurdering?
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Arbeidsmiljøloven §3-1 krever at alle arbeidsgivere identifiserer farer og vurderer risiko. 
                  Risikovurdering er grunnlaget for alt HMS-arbeid.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Uten risikovurdering risikerer dere:</strong> Bøter fra Arbeidstilsynet, 
                  manglende oversikt over fareområder, og ulykker som kunne vært forebygget.
                </p>
              </div>

              <div className="text-center">
                <Button size="lg" asChild className="w-full md:w-auto">
                  <Link href="/gratis-hms-system">
                    <Download className="mr-2 h-5 w-5" />
                    Få risikovurdering + hele HMS-systemet gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Ingen kredittkort. Ingen skjulte kostnader. Gratis for alltid.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Mer innhold */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Eller få digital risikovurdering med HMS Nova
            </h2>
            <p className="text-muted-foreground">
              Istedenfor manuell Excel-jobb, få et dynamisk system som holder oversikten for deg
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <AlertTriangle className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Digital risikomatrise</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Automatisk beregning av risikoscore, fargekoding og prioritering. 
                  Oppdateres i sanntid når tiltak gjennomføres.
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
                  Tiltak tildeles automatisk til ansvarlige med frister. 
                  Få varsler før fristen utløper.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Rapporter og statistikk</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Se utvikling over tid, hvilke områder som har høyest risiko, 
                  og eksporter til PDF for revisjoner.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="bg-primary text-primary-foreground border-0 inline-block">
              <CardContent className="p-8">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Gratis for bedrifter med 1-20 ansatte</h3>
                <p className="text-primary-foreground/90 mb-6">
                  Digital risikovurdering + alle andre HMS-moduler
                </p>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/gratis-hms-system">
                    Kom i gang nå – helt gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

