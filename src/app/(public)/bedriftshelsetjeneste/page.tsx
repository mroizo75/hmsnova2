import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, HeartPulse, Shield } from "lucide-react";

const DR_DROPIN_URL = "https://www.drdropin.no/bedrift";

export default function BHTPage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            Bedriftshelsetjeneste
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            BHT gjennom Dr.Dropin
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            HMS Nova er HMS-systemet. Vi er ikke en godkjent bedriftshelsetjeneste.
            Bedriftshelsetjeneste tilbys gjennom Dr.Dropin, og det er den eneste
            BHT-partneren vi har.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href={DR_DROPIN_URL} target="_blank" rel="noopener noreferrer">
                Gå til Dr.Dropin Bedrift
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/priser">Pris på HMS-systemet</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <HeartPulse className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Pris og avtale hos Dr.Dropin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Pris, innhold og avtale for bedriftshelsetjenesten avtales med Dr.Dropin.
                HMS Nova publiserer ikke en egen BHT-pris, og vi har ingen andre
                samarbeidspartnere på bedriftshelsetjeneste.
              </p>
              <Button variant="outline" asChild>
                <a href={DR_DROPIN_URL} target="_blank" rel="noopener noreferrer">
                  drdropin.no/bedrift
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Når bedriften må ha BHT</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                Arbeidsgiver skal knytte til seg godkjent bedriftshelsetjeneste når
                risikoforholdene tilsier det, jf. arbeidsmiljøloven § 3-3. Hvilke
                virksomheter som er omfattet, følger av forskrift om organisering,
                ledelse og medvirkning kapittel 13.
              </p>
              <p>
                Plikten gjelder ikke automatisk for alle bedrifter over en bestemt
                størrelse. HMS-systemet i HMS Nova erstatter ikke bedriftshelsetjenesten.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
