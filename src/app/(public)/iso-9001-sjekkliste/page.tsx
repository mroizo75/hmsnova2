import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
import { 
  CheckCircle2, 
  ArrowRight,
  Award,
  FileCheck,
  Shield,
  Target,
  ClipboardCheck,
  TrendingUp,
  Users,
  BarChart3
} from "lucide-react";

export const metadata: Metadata = {
  title: "ISO 9001-støtte i HMS Nova | Bli klar for sertifisering",
  description: "HMS Nova er bygget med ISO 9001 som fundament. Alle 27 krav dekket, automatisk dokumentasjon og klar for revisjon. 14 dagers angrefrist, deretter 12 måneders binding.",
  keywords: ["ISO 9001", "kvalitetssystem", "sertifisering", "ISO-sjekkliste", "kvalitetsstyring", "ISO revisjon"],
};

export default function ISO9001SjekklistePage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-6">
              <Award className="h-3 w-3 mr-2" />
              ISO 9001-støtte
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              ISO 9001-klar<br />
              <span className="text-primary">fra dag én</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              HMS Nova er bygget med ISO 9001 som fundament. Alle moduler oppfyller 
              standardens krav – så du slipper å bygge systemet fra bunnen av.
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

      {/* ISO 9001-områder */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Alle ISO 9001-områder dekket
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              HMS Nova har innebygd støtte for alle hovedområdene i ISO 9001:2015. 
              Du trenger ikke bygge systemet selv.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Target className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Kap. 4: Kontekst</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Definér organisasjonens kontekst, interessenter og omfanget av kvalitetssystemet.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Kap. 5: Ledelse</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Kvalitetspolicy, roller, ansvar og myndighet. Ledelsens forpliktelse dokumentert.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Kap. 6: Planlegging</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Risikovurdering, kvalitetsmål og planlegging av endringer.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileCheck className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Kap. 7: Støtte</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ressurser, kompetanse, bevissthet, kommunikasjon og dokumentert informasjon.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ClipboardCheck className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Kap. 8: Drift</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Planlegging og styring av prosesser, krav til produkter og tjenester.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Kap. 9-10: Forbedring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Overvåking, analyse, internrevisjon, ledelsens gjennomgang og kontinuerlig forbedring.
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
              <Badge variant="secondary" className="mb-4">ISO 9001-moduler</Badge>
              <h2 className="text-3xl font-bold mb-6">
                Klar for revisjon fra dag én
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Dokumentstyring</p>
                    <p className="text-sm text-muted-foreground">Versjonskontroll, godkjenningsflyt og sporbarhet</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Avvikshåndtering</p>
                    <p className="text-sm text-muted-foreground">Registrering, rotårsaksanalyse og korrigerende tiltak</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Internrevisjon</p>
                    <p className="text-sm text-muted-foreground">Planlegg, gjennomfør og dokumentér revisjoner</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Ledelsens gjennomgang</p>
                    <p className="text-sm text-muted-foreground">Strukturert mal og automatisk datainnhenting</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Kompetansestyring</p>
                    <p className="text-sm text-muted-foreground">Opplæringsmatrise og sertifikatsporing</p>
                  </div>
                </li>
              </ul>
            </div>

            <Card className="border-2 border-primary/20">
              <CardContent className="p-8">
                <div className="text-center">
                  <Award className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">ISO 9001 i HMS Nova</h3>
                  <p className="text-muted-foreground mb-6">
                    14 dagers angrefrist, deretter 12 måneders binding. Full tilgang til alle moduler.
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

      {/* Info om ISO 9001 */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hva er ISO 9001?
            </h2>
            <p className="text-muted-foreground">
              Verdens mest anerkjente standard for kvalitetsstyring
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <Award className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Om standarden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>ISO 9001:2015</strong> er en internasjonal standard for 
                  kvalitetsstyringssystemer brukt av over 1 million organisasjoner.
                </p>
                <p>
                  Standarden definerer krav til hvordan organisasjoner skal styre 
                  kvalitet i sine prosesser og leveranser.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Fordeler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Økt kundetilfredshet</li>
                  <li>• Færre feil og avvik</li>
                  <li>• Bedre prosesser og effektivitet</li>
                  <li>• Konkurransefortrinn ved anbud</li>
                  <li>• Krav ved offentlige kontrakter</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-primary mb-2" />
                <CardTitle>PDCA-syklusen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  ISO 9001 bygger på <strong>Plan-Do-Check-Act</strong>:
                </p>
                <ul className="space-y-1">
                  <li>• <strong>Plan:</strong> Sett mål og planlegg prosesser</li>
                  <li>• <strong>Do:</strong> Gjennomfør prosessene</li>
                  <li>• <strong>Check:</strong> Overvåk og mål resultater</li>
                  <li>• <strong>Act:</strong> Forbedre basert på funn</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2" />
                <CardTitle>HMS Nova og ISO 9001</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  HMS Nova støtter deg i arbeidet mot ISO 9001-sertifisering, men 
                  garanterer ikke sertifisering.
                </p>
                <p>
                  Sertifisering krever ekstern revisjon av akkreditert sertifiseringsorgan.
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
              <Award className="h-16 w-16 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Klar til å starte ISO 9001-reisen?
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
