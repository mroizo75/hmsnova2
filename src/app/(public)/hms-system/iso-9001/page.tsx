import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle2, FileText, TrendingUp, ArrowRight, ArrowLeft } from "lucide-react";
import { FAQSection } from "@/components/faq-section";

export const metadata: Metadata = {
  title: "ISO 9001 Sertifisering - Innebygd støtte | HMS Nova",
  description: "ISO 9001:2015-støtte innebygd i HMS Nova. Alle krav dekket, klar for revisjon med digital dokumentasjon og risikovurdering. Registrer bedrift.",
  keywords: "iso 9001, iso 9001 sertifisering, kvalitetsstyring, iso 9001 system, iso compliance",
};

const faqs = [
  {
    question: "Hva er ISO 9001?",
    answer: `ISO 9001 er en internasjonal standard for kvalitetsstyringssystemer. 
    Den stiller krav til hvordan bedrifter skal organisere arbeidet for å sikre konsistent kvalitet, 
    kontinuerlig forbedring og kundetilfredshet. ISO 9001-sertifisering viser at bedriften har et 
    dokumentert og velfungerende kvalitetssystem.`,
  },
  {
    question: "Hvorfor trenger vi ISO 9001?",
    answer: `Mange bedrifter trenger ISO 9001 fordi:
    • Kunder krever det (spesielt offentlige anbud)
    • Det gir konkurransefortrinn
    • Det strukturerer og forbedrer arbeidsprosesser
    • Det reduserer feil og reklamasjoner
    • Det gir bedre rykte og tillit`,
  },
  {
    question: "Hvor lang tid tar det å bli ISO 9001-sertifisert?",
    answer: `Med HMS Nova kan prosessen gå raskt fordi systemet allerede oppfyller ISO-kravene:
    • 1-2 måneder: Sett opp prosesser og dokumentasjon
    • 1 måned: Internrevisjon og forberedelser
    • Revisjon: 1-2 dager med ekstern revisor
    Totalt 3-4 måneder fra start til sertifikat (med HMS Nova). 
    Uten digitalt system tar det ofte 6-12 måneder.`,
  },
  {
    question: "Hva koster ISO 9001-sertifisering?",
    answer: `Kostnader:
    • HMS Nova abonnement: Fra 225 kr/mnd (dekker systemkravet)
    • Ekstern revisjon: 15 000-30 000 kr (engangskostnad)
    • Årlig oppfølging: 8 000-15 000 kr/år
    Totalt betydelig rimeligere enn mange tror, og investeringen betaler seg raskt.`,
  },
];

export default function ISO9001Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Breadcrumb */}
      <section className="container mx-auto px-4 pt-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Hjem</Link>
          <span>/</span>
          <Link href="/hms-system" className="hover:text-foreground">HMS-system</Link>
          <span>/</span>
          <span className="text-foreground">ISO 9001</span>
        </div>
      </section>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-4" variant="secondary">
            ISO 9001:2015 Sertifisering
          </Badge>
          <h1 className="text-5xl font-bold mb-6">
            ISO 9001 - Innebygd i HMS Nova
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            HMS Nova er bygget for ISO 9001 compliance. Alle krav dekket ut av boksen. 
            Klar for revisjon fra dag én. Bli sertifisert på 3-4 måneder.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg">
              <Link href="/registrer-bedrift">
                Registrer bedrift
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/hms-system">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Tilbake til HMS-system
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Hva er ISO 9001 */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold mb-4">Hva er ISO 9001?</h2>
              <p>
                <strong>ISO 9001:2015</strong> er den internasjonale standarden for kvalitetsstyringssystemer. 
                Over 1 million bedrifter globalt er ISO 9001-sertifisert.
              </p>
              
              <h3 className="text-xl font-semibold mt-6 mb-3">7 hovedprinsipper i ISO 9001:</h3>
              <ol>
                <li><strong>Kundefokus</strong> - Forstå og møte kundenes behov</li>
                <li><strong>Ledelse</strong> - Tydelig retning og engasjement fra toppen</li>
                <li><strong>Ansattes engasjement</strong> - Involver alle i kvalitetsarbeidet</li>
                <li><strong>Prosessorientering</strong> - Forstå og styr arbeidsprosesser</li>
                <li><strong>Kontinuerlig forbedring</strong> - Alltid søke å bli bedre</li>
                <li><strong>Kunnskapsbaserte beslutninger</strong> - Bruk data og analyse</li>
                <li><strong>Relasjoner</strong> - Samarbeid med leverandører og partnere</li>
              </ol>

              <div className="bg-muted p-6 rounded-lg mt-6">
                <p className="font-semibold mb-2">HMS Nova dekker alle 10 kapitler i ISO 9001:</p>
                <ul className="space-y-1 mb-0 text-sm">
                  <li>✓ Kap 4: Organisasjon og kontekst</li>
                  <li>✓ Kap 5: Ledelse</li>
                  <li>✓ Kap 6: Planlegging (inkl. risikovurdering)</li>
                  <li>✓ Kap 7: Støtte (dokumenter, kompetanse)</li>
                  <li>✓ Kap 8: Operasjonelle prosesser</li>
                  <li>✓ Kap 9: Evaluering (audit, gjennomgang)</li>
                  <li>✓ Kap 10: Forbedring (avvik, korrigerende tiltak)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Hvordan HMS Nova hjelper */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Hvordan HMS Nova støtter ISO 9001
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Dokumentstyring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Sentral lagring, versjonskontroll, godkjenningsflyt.
                </p>
                <p className="text-xs text-muted-foreground">
                  ✓ ISO 9001 kap 7.5
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Award className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Risikovurdering</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  5x5 matrise, systematisk håndtering av risiko og muligheter.
                </p>
                <p className="text-xs text-muted-foreground">
                  ✓ ISO 9001 kap 6.1
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Avvikshåndtering</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Registrere, analysere og følge opp avvik og korrigerende tiltak.
                </p>
                <p className="text-xs text-muted-foreground">
                  ✓ ISO 9001 kap 10.2
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Internrevisjon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Planlegging og gjennomføring av internrevisjoner.
                </p>
                <p className="text-xs text-muted-foreground">
                  ✓ ISO 9001 kap 9.2
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Ledelsens gjennomgang</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Strukturert mal for management review møter.
                </p>
                <p className="text-xs text-muted-foreground">
                  ✓ ISO 9001 kap 9.3
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Måling og analyse</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  KPIer, statistikk, trender og dashboards.
                </p>
                <p className="text-xs text-muted-foreground">
                  ✓ ISO 9001 kap 9.1
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Veien til sertifisering */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Veien til ISO 9001-sertifisering
          </h2>

          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Sett opp HMS Nova",
                desc: "Opprett bedrift, last inn dokumenter, definer prosesser. Alt er klart i systemet.",
                time: "1-2 uker",
              },
              {
                step: 2,
                title: "Gjennomfør risikovurdering",
                desc: "Identifiser risikoer og muligheter (ISO-krav). Bruk innebygd 5x5 matrise.",
                time: "1 uke",
              },
              {
                step: 3,
                title: "Internrevisjon",
                desc: "Gjennomfør internrevisjon for å sjekke at alt fungerer. Rett opp eventuelle mangler.",
                time: "2 uker",
              },
              {
                step: 4,
                title: "Velg revisjonsfirma",
                desc: "Kontakt sertifiseringsorgan (f.eks. DNV, Bureau Veritas, SGS). Bestill revisjon.",
                time: "1 uke",
              },
              {
                step: 5,
                title: "Ekstern revisjon",
                desc: "Revisor kommer på besøk (1-2 dager). Viser dokumentasjon i HMS Nova.",
                time: "1-2 dager",
              },
              {
                step: 6,
                title: "Få sertifikat!",
                desc: "Hvis alt er ok, får dere ISO 9001-sertifikat. Gyldig i 3 år (med årlig oppfølging).",
                time: "2 uker",
              },
            ].map((item) => (
              <Card key={item.step}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                        {item.step}
                      </div>
                      <CardTitle>{item.title}</CardTitle>
                    </div>
                    <Badge variant="secondary">{item.time}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-lg font-semibold text-primary">
              Totalt: 3-4 måneder fra start til sertifikat
            </p>
          </div>
        </div>
      </section>

      {/* Relaterte emner */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">Del av HMS Nova HMS-system</h3>
          <p className="text-muted-foreground mb-6">
            ISO 9001 er integrert i vårt <Link href="/hms-system" className="text-primary hover:underline">komplette HMS-system</Link>. 
            Se også:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/hms-system/risikovurdering">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Risikovurdering</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">ISO-krav kap 6.1 →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/hms-system/avvikshandtering">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Avvikshåndtering</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">ISO-krav kap 10.2 →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/hms-system/dokumenter">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Dokumenter</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">ISO-krav kap 7.5 →</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection 
        faqs={faqs}
        title="Ofte stilte spørsmål om ISO 9001"
      />

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Klar for ISO 9001-sertifisering?
            </h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              HMS Nova har alt du trenger innebygd. Registrer bedrift.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-gray-100">
                <Link href="/registrer-bedrift">
                  Registrer bedrift
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                className="border-2 border-white text-white hover:bg-white/10"
              >
                <Link href="/iso-9001-sjekkliste">
                  Last ned gratis sjekkliste
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
