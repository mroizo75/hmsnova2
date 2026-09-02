import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
import { 
  CheckCircle2, 
  ArrowRight,
  ClipboardCheck,
  Users,
  FileText,
  Calendar,
  Eye,
  Smartphone,
  Camera,
  Bell,
  BarChart3
} from "lucide-react";

export const metadata: Metadata = {
  title: "Digital Vernerunde i HMS Nova | Gjennomfør vernerunder enkelt",
  description: "Gjennomfør vernerunder digitalt med HMS Nova. Mobil-app for feltarbeid, automatiske sjekklister, bilderegistrering og PDF-rapporter. 14 dagers angrefrist, deretter 12 måneders binding.",
  keywords: ["vernerunde", "digital vernerunde", "vernerunde app", "HMS vernerunde", "vernerunde sjekkliste", "vernerunde rapport"],
};

export default function VernerundeGuidePage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-6">
              <Eye className="h-3 w-3 mr-2" />
              Digital vernerunde
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Gjennomfør vernerunder<br />
              <span className="text-primary">digitalt med HMS Nova</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Slutt med papirskjemaer og manuelle rapporter. Med HMS Nova gjennomfører du 
              vernerunder på mobilen, registrerer funn med bilder, og får automatiske rapporter.
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

      {/* Hvorfor digital vernerunde */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hvorfor digital vernerunde?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Papirbaserte vernerunder er tidkrevende og vanskelig å følge opp. 
              Med HMS Nova blir alt enklere, raskere og mer sporbart.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Smartphone className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Mobil-app</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Gjennomfør vernerunder direkte fra mobilen. Fungerer også offline på byggeplasser.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Camera className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Bilderegistrering</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ta bilder av avvik og funn direkte i appen. Bildene lagres automatisk med rapporten.
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
                  Systemet varsler deg når det er på tide med ny vernerunde. Aldri glem en runde igjen.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Statistikk og trender</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Se utviklingen over tid. Hvilke avvik gjentar seg? Blir det bedre eller verre?
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
              <Badge variant="secondary" className="mb-4">Vernerunde-modulen</Badge>
              <h2 className="text-3xl font-bold mb-6">
                Alt du trenger for effektive vernerunder
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Ferdige sjekklister</p>
                    <p className="text-sm text-muted-foreground">Bruk våre maler eller lag egne tilpasset din bedrift</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Registrer funn med bilder</p>
                    <p className="text-sm text-muted-foreground">Dokumenter avvik med bilder og beskrivelser</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Automatisk tiltaksoppfølging</p>
                    <p className="text-sm text-muted-foreground">Funn blir automatisk til tiltak med ansvarlig og frist</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">PDF-rapport med ett klikk</p>
                    <p className="text-sm text-muted-foreground">Eksporter rapport til møter, revisjoner eller Arbeidstilsynet</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Historikk og sporbarhet</p>
                    <p className="text-sm text-muted-foreground">Full oversikt over alle gjennomførte vernerunder</p>
                  </div>
                </li>
              </ul>
            </div>

            <Card className="border-2 border-primary/20">
              <CardContent className="p-8">
                <div className="text-center">
                  <Eye className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Digital vernerunde</h3>
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

      {/* Info om vernerunder */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hva er en vernerunde?
            </h2>
            <p className="text-muted-foreground">
              Vernerunder er en viktig del av det systematiske HMS-arbeidet
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Hvem skal delta?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>Verneombudet</strong> skal alltid delta i vernerunder. 
                  I tillegg bør leder, HMS-ansvarlig og representanter fra de ansatte være med.
                </p>
                <p>
                  Det er lurt å involvere personer som kjenner arbeidsplassen godt, 
                  da de ofte ser ting som andre overser.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Hvor ofte?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>Anbefalt:</strong> Minst 4 ganger i året (kvartalsvis). 
                  Noen bransjer krever oftere, for eksempel bygg og anlegg.
                </p>
                <p>
                  I tillegg bør du gjennomføre ekstra vernerunder ved endringer 
                  i lokaler, utstyr eller arbeidsprosesser.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ClipboardCheck className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Hva skal sjekkes?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Orden og ryddighet</li>
                  <li>• Brannvern og rømningsveier</li>
                  <li>• Førstehjelpsutstyr</li>
                  <li>• Maskiner og verktøy</li>
                  <li>• Ergonomi og arbeidsstillinger</li>
                  <li>• Psykososialt arbeidsmiljø</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Dokumentasjon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Alle vernerunder skal dokumenteres. Dette er et krav i 
                  Internkontrollforskriften og viktig ved eventuelle revisjoner.
                </p>
                <p>
                  Dokumentasjonen skal vise hva som ble sjekket, hvem som deltok, 
                  hvilke funn som ble gjort og hvordan de følges opp.
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
              <ClipboardCheck className="h-16 w-16 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Klar til å digitalisere vernerundene?
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
