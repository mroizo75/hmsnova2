import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
import { 
  CheckCircle2, 
  ArrowRight,
  BookOpen,
  FileText,
  Shield,
  Users,
  AlertTriangle,
  ClipboardCheck,
  RefreshCw,
  Search
} from "lucide-react";

export const metadata: Metadata = {
  title: "Digital HMS-håndbok i HMS Nova | Alltid oppdatert",
  description: "Få en digital HMS-håndbok som alltid er oppdatert med gjeldende lover. Tilpasset din bransje, tilgjengelig for alle ansatte. 14 dagers angrefrist, deretter 12 måneders binding.",
  keywords: ["HMS-håndbok", "HMS-dokumentasjon", "internkontroll", "HMS-system", "HMS-prosedyrer"],
};

export default function HMSHandbokPage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-6">
              <BookOpen className="h-3 w-3 mr-2" />
              Digital HMS-håndbok
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              HMS-håndbok<br />
              <span className="text-primary">som lever med bedriften</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Glem statiske PDF-er som blir utdaterte. Med HMS Nova får du en levende 
              HMS-håndbok som oppdateres automatisk og er tilgjengelig for alle ansatte.
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
              Hvorfor digital HMS-håndbok?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tradisjonelle HMS-håndbøker i Word eller PDF blir fort utdaterte. 
              Med HMS Nova har du alltid siste versjon tilgjengelig.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <RefreshCw className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Alltid oppdatert</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Lover og regler endres. HMS Nova varsler deg om endringer og hjelper deg å oppdatere.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Tilgjengelig for alle</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Alle ansatte har tilgang via web og mobil. Ingen leting i mapper eller e-post.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Search className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Søkbart innhold</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Finn riktig prosedyre på sekunder. Fulltekstsøk i alle dokumenter.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Versjonskontroll</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Full historikk over alle endringer. Se hvem som endret hva og når.
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
              <Badge variant="secondary" className="mb-4">Dokumentmodulen</Badge>
              <h2 className="text-3xl font-bold mb-6">
                Alt dokumentasjonen din samlet
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">HMS-policy og mål</p>
                    <p className="text-sm text-muted-foreground">Definér bedriftens HMS-policy og målbare mål</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Organisering</p>
                    <p className="text-sm text-muted-foreground">Roller, ansvar og myndighet i HMS-arbeidet</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Prosedyrer og rutiner</p>
                    <p className="text-sm text-muted-foreground">Alle HMS-rutiner samlet på ett sted</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Beredskapsplaner</p>
                    <p className="text-sm text-muted-foreground">Evakuering, brann, førstehjelp og varsling</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Digital signering</p>
                    <p className="text-sm text-muted-foreground">Ansatte signerer at de har lest og forstått</p>
                  </div>
                </li>
              </ul>
            </div>

            <Card className="border-2 border-primary/20">
              <CardContent className="p-8">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Digital HMS-håndbok</h3>
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

      {/* Info om HMS-håndbok */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hva skal HMS-håndboken inneholde?
            </h2>
            <p className="text-muted-foreground">
              Internkontrollforskriften stiller krav til dokumentasjon
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
                  <strong>Internkontrollforskriften §5</strong> krever at virksomheten 
                  har skriftlige mål, organisering, kartlegging og rutiner for HMS.
                </p>
                <p>
                  Dokumentasjonen skal være tilgjengelig for de ansatte og 
                  kunne vises frem ved tilsyn.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ClipboardCheck className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Innhold</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• HMS-policy og mål</li>
                  <li>• Organisering og ansvar</li>
                  <li>• Kartlegging av farer og risikovurdering</li>
                  <li>• Rutiner og prosedyrer</li>
                  <li>• Avvikshåndtering</li>
                  <li>• Opplæringsplan</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <AlertTriangle className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Vanlige feil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Utdaterte dokumenter</li>
                  <li>• Vanskelig å finne riktig versjon</li>
                  <li>• Ansatte vet ikke hvor dokumentene er</li>
                  <li>• Ingen oversikt over hvem som har lest</li>
                  <li>• Mangler ved revisjon</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Bransjetilpasning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  HMS Nova har maler tilpasset mange bransjer:
                </p>
                <ul className="space-y-1">
                  <li>• Bygg og anlegg</li>
                  <li>• Industri og produksjon</li>
                  <li>• Helse og omsorg</li>
                  <li>• Transport og logistikk</li>
                  <li>• Kontor og administrasjon</li>
                </ul>
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
              <BookOpen className="h-16 w-16 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Klar til å få orden på dokumentasjonen?
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
