"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowRight,
  Award,
  Download,
  FileCheck,
  Shield,
  Target,
  ClipboardCheck
} from "lucide-react";

export default function ISO9001SjekklistePage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-6">
              <Download className="h-3 w-3 mr-2" />
              Gratis sjekkliste
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Gratis ISO 9001-sjekkliste<br />
              <span className="text-primary">Er dere klare for sertifisering?</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              En komplett sjekkliste som dekker alle 27 ISO 9001-krav. 
              Sjekk om deres kvalitetssystem oppfyller standardens krav før revisjon.
            </p>
          </div>

          <Card className="border-2 border-primary/20 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl">Komplett ISO 9001-sjekkliste</h3>
                  <p className="text-muted-foreground">Alle 27 krav fra ISO 9001:2015</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-primary" />
                    Hva får du?
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Alle 27 ISO 9001-krav med forklaring</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Sjekkliste for egenvurdering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Dokumentasjonsliste (hva må finnes)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Tips til implementering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Mal for internrevisjon</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Eksempler fra praksis</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Dekker alle hovedområder
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Kontekst og interessenter (kap. 4)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Ledelse og politikk (kap. 5)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Planlegging og risiko (kap. 6)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Støtte og kompetanse (kap. 7)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Drift og leveranse (kap. 8)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Evaluering og forbedring (kap. 9-10)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-6 mb-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Hvorfor ISO 9001?
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  ISO 9001 er verdens mest anerkjente standard for kvalitetsstyringssystemer. 
                  Sertifisering viser kunder og leverandører at dere har kontroll på kvalitet og prosesser.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Fordeler med ISO 9001:</strong> Økt kundetilfredshet, færre feil og avvik, 
                  bedre prosesser, og konkurransefortrinn ved anbud og offentlige kontrakter.
                </p>
              </div>

              <div className="text-center">
                <Button size="lg" asChild className="w-full md:w-auto">
                  <Link href="/gratis-hms-system">
                    <Download className="mr-2 h-5 w-5" />
                    Få ISO-sjekkliste + 100% ISO 9001-system gratis
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
              HMS Nova = 100% ISO 9001-kompatibelt system
            </h2>
            <p className="text-muted-foreground">
              Istedenfor manuell sjekkliste, få et ferdig system som oppfyller alle ISO 9001-krav
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Award className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Alle 27 krav dekket</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  HMS Nova er bygget med ISO 9001 som fundament. 
                  Alle moduler oppfyller standardens krav til dokumentasjon og prosesser.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Klar for revisjon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Automatisk audit-trail, dokumenterte prosesser og sporbarhet. 
                  Alt en revisor trenger å se er lett tilgjengelig.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Kontinuerlig forbedring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ISO 9001 krever kontinuerlig forbedring (PDCA). 
                  HMS Nova har innebygd støtte for avvik, tiltak og oppfølging.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="bg-primary text-primary-foreground border-0 inline-block">
              <CardContent className="p-8">
                <Award className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Gratis for bedrifter med 1-20 ansatte</h3>
                <p className="text-primary-foreground/90 mb-6">
                  100% ISO 9001-kompatibelt system + gratis sertifiseringsstøtte
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

