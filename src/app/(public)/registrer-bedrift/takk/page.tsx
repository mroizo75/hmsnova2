import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Mail, Phone } from "lucide-react";

export default function TakkPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-4xl font-bold mb-4">Sjekk e-posten din</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Vi har sendt en aktiveringlenke til e-postadressen du oppga.
            Klikk lenken for å sette passord og komme i gang. Sjekk også
            spam/søppelpost hvis du ikke finner e-posten.
          </p>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-4">Hva skjer nå?</h2>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Sjekk e-posten</p>
                    <p className="text-sm text-muted-foreground">
                      Åpne e-posten «Aktiver din HMS Nova-konto» og klikk på knappen
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Sett passord</p>
                    <p className="text-sm text-muted-foreground">
                      Velg et sterkt passord. Lenken er gyldig i 24 timer
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Kom i gang med onboarding</p>
                    <p className="text-sm text-muted-foreground">
                      Logg inn og følg veiviseren for å bli klar for tilsyn
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Angrefrist og binding</p>
                    <p className="text-sm text-muted-foreground">
                      14 dagers avtalt angrefrist. Sier du ikke opp skriftlig til post@hmsnova.no, starter 12 måneders binding med 3 måneders oppsigelse.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/">
              <Button size="lg" variant="outline">
                Tilbake til forsiden
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg">
                Gå til innlogging
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <Card className="bg-muted/50 border-0">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Har du spørsmål i mellomtiden?</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
                <a
                  href="mailto:support@hmsnova.com"
                  className="inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                  support@hmsnova.com
                </a>
                <a
                  href="tel:+4741874010"
                  className="inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-4 w-4" />
                  +47 41 87 40 10
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
