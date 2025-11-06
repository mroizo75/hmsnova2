import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Lock, AlertCircle, ExternalLink, MessageSquare, Eye } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AnsattVarslingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Hent tenant info for å vise unik varslingslenke
  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: session.user.id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const tenantSlug = userTenant?.tenant?.slug || "";
  const tenantName = userTenant?.tenant?.name || "din bedrift";
  const whistleblowUrl = tenantSlug 
    ? `${process.env.NEXT_PUBLIC_URL || "https://hmsnova.no"}/varsling/${tenantSlug}`
    : "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center space-y-2 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Anonym varsling</h1>
        <p className="text-gray-600">
          Trygg og konfidensiell kanal for å varsle om kritiske forhold
        </p>
      </div>

      {/* Viktig info */}
      <Alert className="border-primary/50 bg-primary/5">
        <Shield className="h-4 w-4" />
        <AlertTitle>100% konfidensiell og trygg</AlertTitle>
        <AlertDescription>
          Alle varslinger behandles konfidensielt. Du kan velge å være helt anonym eller oppgi
          kontaktinformasjon hvis du ønsker tilbakemelding.
        </AlertDescription>
      </Alert>

      {/* Hva kan varsles om */}
      <Card>
        <CardHeader>
          <CardTitle>Hva kan jeg varsle om?</CardTitle>
          <CardDescription>
            Varslingskanalen kan brukes til å melde fra om kritiske forhold
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium">Trakassering & diskriminering</h3>
                <p className="text-sm text-muted-foreground">
                  Mobbing, seksuell trakassering, diskriminering
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <Shield className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium">HMS & sikkerhet</h3>
                <p className="text-sm text-muted-foreground">
                  Farlige arbeidsforhold, manglende sikkerhet
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yellow-100 p-2">
                <Lock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium">Korrupsjon & underslag</h3>
                <p className="text-sm text-muted-foreground">
                  Økonomisk kriminalitet, interessekonflikter
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Etikk & lovbrudd</h3>
                <p className="text-sm text-muted-foreground">
                  Brudd på lover, etiske retningslinjer
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hvordan fungerer det */}
      <Card>
        <CardHeader>
          <CardTitle>Slik fungerer det</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                1
              </span>
              <div className="pt-1">
                <h4 className="font-medium">Fyll ut varslingssskjemaet</h4>
                <p className="text-sm text-muted-foreground">
                  Beskriv situasjonen så detaljert som mulig. Du kan velge å være anonym.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                2
              </span>
              <div className="pt-1">
                <h4 className="font-medium">Motta saksnummer og tilgangskode</h4>
                <p className="text-sm text-muted-foreground">
                  Du får et unikt saksnummer og tilgangskode for å følge opp saken.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                3
              </span>
              <div className="pt-1">
                <h4 className="font-medium">Saken behandles konfidensielt</h4>
                <p className="text-sm text-muted-foreground">
                  HMS-ansvarlig eller annen saksbehandler tar saken videre.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                4
              </span>
              <div className="pt-1">
                <h4 className="font-medium">Kommuniser anonymt</h4>
                <p className="text-sm text-muted-foreground">
                  Du kan sende og motta meldinger via sporingssiden uten å avsløre identitet.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Din bedrifts varslingslenke */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {tenantName} sin unike varslingskanal
          </CardTitle>
          <CardDescription className="text-green-700">
            Dette er din bedrifts egen, private varslingskanal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-white border-green-300">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">✅ Varslinger går direkte til {tenantName}</AlertTitle>
            <AlertDescription className="text-green-800">
              Alle varslinger som sendes via denne lenken går <strong>kun</strong> til din bedrifts HMS-ansvarlige eller ledelse. 
              Ingen andre bedrifter eller HMS Nova ser disse varslingene.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-white p-4 border border-green-200">
            <p className="text-sm text-muted-foreground mb-2">Din bedrifts varslingslenke:</p>
            <p className="text-lg font-mono font-bold text-green-900 break-all">{whistleblowUrl}</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="text-xs font-medium text-green-900 mb-2">💡 Slik fungerer det:</p>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• Varslinger lagres <strong>kun</strong> i {tenantName} sin database</li>
              <li>• Kun autoriserte personer i {tenantName} kan lese varslingene</li>
              <li>• Varsler kan være 100% anonyme med kommunikasjon via saksnummer</li>
              <li>• Lenken kan trygt deles med ansatte og eksterne</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Handlinger */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">Send ny varsling</CardTitle>
            <CardDescription>
              Opprett en ny anonym varsling
            </CardDescription>
          </CardHeader>
          <CardContent>
            {whistleblowUrl ? (
              <Button asChild className="w-full" size="lg">
                <Link href={whistleblowUrl} target="_blank">
                  Send varsling
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Varslingslenke ikke tilgjengelig</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spor eksisterende sak</CardTitle>
            <CardDescription>
              Følg opp en tidligere varsling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/varsling/spor" target="_blank">
                Spor saken min
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Juridisk beskyttelse */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Juridisk beskyttelse</AlertTitle>
        <AlertDescription>
          Som varslere er du beskyttet av arbeidsmiljølovens § 2A (varslingsreglene). Du har rett til
          å varsle om kritiske forhold uten å risikere gjengjeldelse. Les mer om dine rettigheter på{" "}
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
    </div>
  );
}

