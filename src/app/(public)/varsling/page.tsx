import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Building2, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

export default function WhistleblowingInfoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <Link href="/">
            <h1 className="text-3xl font-bold">HMS Nova</h1>
          </Link>
          <p className="mt-2 text-lg text-muted-foreground">Anonym varsling</p>
        </div>

        <Alert className="mb-8 border-primary/50 bg-primary/5">
          <Shield className="h-4 w-4" />
          <AlertTitle>Hver bedrift har sin egen varslingskanal</AlertTitle>
          <AlertDescription>
            HMS Nova tilbyr en sikker og konfidensiell varslingskanal for hver enkelt bedrift.
            Varslingslenken får du av din arbeidsgiver eller HR-avdeling.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <Building2 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>For ansatte</CardTitle>
              <CardDescription>
                Jobber du allerede hos en bedrift som bruker HMS Nova?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Logg inn på din ansatt-side for å finne din bedrifts unike varslingslenke.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Logg inn</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <LinkIcon className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Har du en varslingslenke?</CardTitle>
              <CardDescription>
                Fikk du en direkte lenke fra din arbeidsgiver?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Bruk den unike lenken du har mottatt, for eksempel: <br />
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  hmsnova.com/varsling/bedriftsnavn
                </code>
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hva er anonym varsling?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Anonym varsling er en sikker kanal hvor du kan melde fra om kritiske forhold på
              arbeidsplassen uten å avsløre din identitet. Dette kan være:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Trakassering eller diskriminering</li>
              <li>Farlige arbeidsforhold eller HMS-brudd</li>
              <li>Korrupsjon eller økonomisk kriminalitet</li>
              <li>Brudd på lover og retningslinjer</li>
              <li>Etiske problemstillinger</li>
            </ul>
            <Alert className="mt-4">
              <Shield className="h-4 w-4" />
              <AlertTitle>Juridisk beskyttelse</AlertTitle>
              <AlertDescription>
                Som varsler er du beskyttet av arbeidsmiljølovens § 2A. Les mer om dine
                rettigheter på{" "}
                <a
                  href="https://www.arbeidstilsynet.no/tema/varsling/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Arbeidstilsynet.no
                </a>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>For bedrifter</CardTitle>
            <CardDescription>
              Interessert i å aktivere varslingskanalen for din bedrift?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Alle bedrifter som bruker HMS Nova får automatisk sin egen varslingskanal. Kontakt oss
              for mer informasjon om hvordan dere kan ta i bruk systemet.
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/gratis-hms-system">Kom i gang gratis</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/priser">Se priser</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button asChild variant="ghost">
            <Link href="/">Tilbake til forsiden</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
