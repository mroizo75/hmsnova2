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

          <h1 className="text-4xl font-bold mb-4">Takk for din søknad!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Vi har mottatt søknaden din og vil behandle den så raskt som mulig. 
            Du vil motta en e-post fra oss innen 24 timer med innloggingsinformasjon og videre instruksjoner.
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
                    <p className="font-medium">Vi behandler søknaden din</p>
                    <p className="text-sm text-muted-foreground">
                      Vi setter opp din bedrift i systemet med alle nødvendige moduler
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Du mottar innloggingsinformasjon</p>
                    <p className="text-sm text-muted-foreground">
                      Vi sender deg e-post med lenke for å sette passord og logge inn
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Personlig onboarding-samtale</p>
                    <p className="text-sm text-muted-foreground">
                      Vi tar kontakt for å hjelpe deg i gang (15-30 min)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Du er i gang!</p>
                    <p className="text-sm text-muted-foreground">
                      14 dagers gratis prøveperiode starter når du logger inn første gang
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
            <Link href="/gratis-hms-system">
              <Button size="lg">
                Last ned gratis HMS-pakke
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
                  href="tel:+4799112916"
                  className="inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-4 w-4" />
                  +47 99 11 29 16
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

