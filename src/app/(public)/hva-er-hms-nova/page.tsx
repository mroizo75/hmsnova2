import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Shield, 
  Users, 
  Target,
  Zap,
  Heart,
  ArrowRight,
  Download,
  Award,
  TrendingUp,
  Clock,
  Lightbulb,
  Handshake,
  Star
} from "lucide-react";

export const metadata: Metadata = {
  title: "Om HMS Nova - Vi gjør HMS-arbeid enkelt | Etablert oktober 2024",
  description: "HMS Nova ble startet i oktober 2024 av erfarne HMS-rådgivere. Vi kombinerer lovpålagte krav med moderne teknologi for å gjøre HMS-arbeid enkelt og effektivt for norske bedrifter.",
  keywords: "om HMS Nova, HMS Norge, HMS system etablert 2024, HMS rådgivere, digital HMS, brukervennlig HMS",
};

export default function HvaErHMSNovaPage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero - StoryBrand: Character møter Guide */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            Etablert oktober 2024
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Vi gjør HMS-arbeid enkelt og effektivt for norske bedrifter
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            HMS Nova ble startet av erfarne HMS-rådgivere og teknologer som var <strong>frustrert</strong> over 
            komplekse og tungvinte HMS-systemer. Vi bygger løsningen vi selv ønsket vi hadde.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/gratis-hms-system">
              <Button size="lg">
                <Download className="mr-2 h-5 w-5" />
                Få gratis HMS-system
              </Button>
            </Link>
            <Link href="/#funksjoner">
              <Button size="lg" variant="outline">
                Se hva vi kan
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem - StoryBrand: Problem vi løser */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="destructive" className="mb-4">
              Problemet
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Vi har vært der du er nå
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Etter å ha jobbet med tradisjonelle HMS-systemer i mange år, så vi de samme problemene gang på gang
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <Clock className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-semibold">For komplisert</h3>
                  <p className="text-sm text-muted-foreground">
                    Systemer som tar uker å lære seg. Ingen bruker dem i praksis.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <TrendingUp className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-semibold">For dyrt</h3>
                  <p className="text-sm text-muted-foreground">
                    Systemer som koster titusener i oppsettsgebyr og konsulentimer.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <Users className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-semibold">For tungvint</h3>
                  <p className="text-sm text-muted-foreground">
                    Gamle systemer bygget for store konsern, ikke moderne SMB.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Story - StoryBrand: Guide credentials */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-4">
              Vår historie
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Vi startet med en visjon om å gjøre HMS-arbeid enklere
            </h2>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Lightbulb className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Oktober 2024: Etablering</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  HMS Nova ble startet av en gruppe <strong>erfarne HMS-rådgivere og teknologer</strong> som 
                  så et behov for bedre digitale verktøy i HMS-arbeidet. Vi hadde jobbet med tradisjonelle 
                  HMS-systemer i mange år, og var frustrerte over komplekse og tungvinte løsninger som tok 
                  for mye tid og ressurser å bruke.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Target className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle>Vår løsning</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Vi bestemte oss for å skape en plattform som kombinerer <strong>lovpålagte krav med 
                  moderne teknologi og brukervennlighet</strong>, slik at alle virksomheter kan jobbe 
                  effektivt med HMS uavhengig av størrelse og ressurser.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Handshake className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Kundestyrt utvikling</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Siden oppstarten har vi utviklet et solid HMS-system basert på vår erfaring og kunnskap. 
                  Men vi vet at det er <strong>våre kunder som bruker systemet daglig</strong> og har de beste 
                  innsiktene for hvordan det kan forbedres. Derfor inviterer vi alle våre kunder til å være 
                  med på å påvirke utviklingen av HMS Nova.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values - StoryBrand: Guide authority */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Våre verdier</h2>
            <p className="text-muted-foreground">
              Prinsipper som styrer alt vi gjør
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Sikkerhet først</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Vi tror på at alle har rett til en trygg arbeidsplass. Vårt mål er å hjelpe bedrifter 
                  å skape sikrere arbeidsmiljøer.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Brukerorientert</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Vi utvikler alltid med brukeren i fokus. Verktøy som er enkle å bruke blir faktisk 
                  brukt i hverdagen.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Innovasjon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Vi søker stadig nye løsninger og teknologier for å forbedre HMS-arbeidet og ligge 
                  i forkant av utviklingen.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Handshake className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Partnerskap</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Vi ser på våre kunder som partnere og jobber tett med dem for å skape de beste løsningene.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Award className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Kvalitet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Vi leverer gjennomtenkte og robuste løsninger som våre kunder kan stole på hver eneste dag.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Målrettet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Vi har alltid et klart mål: å gjøre HMS-arbeidet enklere, mer effektivt og bedre for alle parter.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Plan - StoryBrand: Enkel vei til suksess */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-4">
              Vår tilnærming
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Et levende HMS-system som utvikles sammen med våre kunder
            </h2>
            <p className="text-muted-foreground">
              Vi tror på at de beste løsningene skapes i samarbeid med brukerne
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <CardTitle>Ferdig oppsett</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Komplett HMS-håndbok som oppfyller alle lovkrav</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Kom i gang på timer, ikke uker</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Skreddersydd for norske forhold og regelverk</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <CardTitle>Brukervennlig</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Intuitivt design som alle forstår</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Mobilapp for rapportering i felt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Digital signatur - ingen papirrot</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <CardTitle>Automatisering</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Automatiske påminnelser før frister</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Sporing gjennom hele HMS-prosessen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Rapporter genereres automatisk</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    4
                  </div>
                  <CardTitle>Kontinuerlig forbedring</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Jevnlige oppdateringer basert på tilbakemeldinger</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Nye funksjoner hver måned</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Kundestyrt produktutvikling</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Success - StoryBrand: Resultater */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Resultater våre kunder opplever
            </h2>
            <p className="text-muted-foreground">
              Når HMS faktisk fungerer i praksis
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary">10+ timer</div>
                  <p className="text-sm text-muted-foreground">
                    Spart per uke på HMS-administrasjon
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary">100%</div>
                  <p className="text-sm text-muted-foreground">
                    ISO 9001 compliance ut av boksen
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Star className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary">4.8/5</div>
                  <p className="text-sm text-muted-foreground">
                    Gjennomsnittlig kundetilfredshet
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA - StoryBrand: Call to Action */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Bli en del av vår reise</h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Vi inviterer deg til å bli med på å forme fremtidens HMS-arbeid. 
              Sammen kan vi skape sikrere og bedre arbeidsplasser for alle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/gratis-hms-system">
                <Button size="lg" variant="secondary">
                  <Download className="mr-2 h-5 w-5" />
                  Få gratis HMS-system
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  Prøv full versjon gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm mt-6 text-primary-foreground/70">
              Ingen kredittkort • 14 dagers gratis prøveperiod • Norsk support
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
