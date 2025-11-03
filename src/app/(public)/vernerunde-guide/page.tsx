"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowRight,
  ClipboardCheck,
  Download,
  Users,
  FileText,
  Calendar,
  Eye
} from "lucide-react";

export default function VernerundeGuidePage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-6">
              <Download className="h-3 w-3 mr-2" />
              Gratis guide
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Gratis vernerunde-guide<br />
              <span className="text-primary">Gjennomfør vernerunde på 1-2-3</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              En komplett guide til å planlegge og gjennomføre vernerunder. 
              Med sjekklister, malerdokumenter og tips til hva du skal se etter.
            </p>
          </div>

          <Card className="border-2 border-primary/20 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Eye className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl">Komplett vernerunde-guide</h3>
                  <p className="text-muted-foreground">Alt du trenger for effektive vernerunder</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Hva får du?
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Steg-for-steg guide til vernerunder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Sjekklister for ulike områder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Mal for vernerunderapport</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Eksempler på vanlige avvik</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Tips til oppfølging av funn</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Årshjul for planlegging</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Sjekklister for alle områder
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Arbeidsområder og verksteder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Kontorområder og fellesareal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Lagre og lagerområder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Psykososialt arbeidsmiljø</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Brann- og beredskapsutstyr</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Maskiner og verktøy</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-6 mb-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Hvorfor er vernerunder viktig?
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Vernerunder er en viktig del av det systematiske HMS-arbeidet. 
                  Ved å gå rundt på arbeidsplassen kan du oppdage farer før de fører til ulykker.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Anbefalt frekvens:</strong> Minst 4 ganger i året (hver kvartal). 
                  Verneombudet skal alltid delta i vernerundene.
                </p>
              </div>

              <div className="text-center">
                <Button size="lg" asChild className="w-full md:w-auto">
                  <Link href="/gratis-hms-system">
                    <Download className="mr-2 h-5 w-5" />
                    Få vernerunde-guide + hele HMS-systemet gratis
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
              Eller gjennomfør vernerunder digitalt med HMS Nova
            </h2>
            <p className="text-muted-foreground">
              Istedenfor papirbaserte runder, få et digitalt system med mobil-app
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Eye className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Digital sjekkliste</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Bruk mobilen eller nettbrettet til å registrere funn direkte. 
                  Ta bilder, noter kommentarer og registrer avvik umiddelbart.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Automatisk planlegging</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Systemet varsler deg når det er på tide med ny vernerunde. 
                  Hold full oversikt over gjennomførte og planlagte runder.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Automatisk rapport</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Alle funn samles automatisk i en rapport. 
                  Eksporter til PDF for møter, revisjoner eller Arbeidstilsynet.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="bg-primary text-primary-foreground border-0 inline-block">
              <CardContent className="p-8">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Gratis for bedrifter med 1-20 ansatte</h3>
                <p className="text-primary-foreground/90 mb-6">
                  Digital vernerunde-modul + alle andre HMS-moduler
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

