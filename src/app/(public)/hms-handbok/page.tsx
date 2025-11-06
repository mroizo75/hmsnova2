"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  Shield,
  Users,
  AlertTriangle,
  ClipboardCheck
} from "lucide-react";

export default function HMSHandbokPage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-6">
              <Download className="h-3 w-3 mr-2" />
              Gratis ressurs
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Gratis HMS-håndbok<br />
              <span className="text-primary">Klar på 5 minutter</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              En komplett HMS-håndbok tilpasset din bransje. Få alle HMS-prosedyrer, 
              maler og sjekklister du trenger for å oppfylle lovkravene.
            </p>
          </div>

          <Card className="border-2 border-primary/20 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl">Komplett HMS-håndbok</h3>
                  <p className="text-muted-foreground">Over 50 sider med praktiske HMS-rutiner</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Hva får du?
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Komplett HMS-policy og HMS-mål</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Organisering av HMS-arbeidet</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Rutiner for risikovurdering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Avvikshåndtering og forbedring</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Opplærings- og kompetanseplaner</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Beredskaps- og evakueringsplaner</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Tilpasset din bransje
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Bygg og anlegg</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Industri og produksjon</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Helse og omsorg</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Transport og logistikk</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Utdanning og offentlig sektor</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>+ 15 andre bransjer</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-6 mb-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Hvorfor trenger du en HMS-håndbok?
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Arbeidsmiljøloven krever at alle bedrifter har systematisk HMS-arbeid. 
                  En HMS-håndbok dokumenterer hvordan dere jobber med helse, miljø og sikkerhet.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Uten håndbok risikerer dere:</strong> Bøter fra Arbeidstilsynet, 
                  manglende oversikt over risiko, og problemer ved ulykker og revisjoner.
                </p>
              </div>

              <div className="text-center">
                <Button size="lg" asChild className="w-full md:w-auto">
                  <Link href="/gratis-hms-system">
                    <Download className="mr-2 h-5 w-5" />
                    Få HMS-håndbok + hele HMS-systemet gratis
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
              Men vent – det blir bedre!
            </h2>
            <p className="text-muted-foreground">
              Istedenfor bare en statisk PDF, får du tilgang til hele HMS Nova-systemet helt gratis
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Digital HMS-håndbok</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Levende dokument som oppdateres automatisk når lover endres. 
                  Alltid tilgjengelig for alle ansatte.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Komplett HMS-system</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Risikovurderinger, avviksmeldinger, opplæringssporing, 
                  stoffkartotek og mye mer – alt på ett sted.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">ISO 9001-klar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Oppfyller alle krav til ISO 9001 og andre HMS-standarder. 
                  Klar for revisjon og sertifisering.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="bg-primary text-primary-foreground border-0 inline-block">
              <CardContent className="p-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Gratis for bedrifter med 1-20 ansatte</h3>
                <p className="text-primary-foreground/90 mb-6">
                  Ingen skjulte kostnader. Ingen kredittkort. Start i dag.
                </p>
                <Button size="lg" className="bg-green-700 hover:bg-green-800 text-white" asChild>
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

