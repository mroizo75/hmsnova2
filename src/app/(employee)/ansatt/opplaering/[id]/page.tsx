import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, GraduationCap, Calendar, User, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getStorage } from "@/lib/storage";

export default async function AnsattTrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId || !session?.user?.id) {
    redirect("/login");
  }

  const training = await prisma.training.findUnique({
    where: {
      id,
      tenantId: session.user.tenantId,
      userId: session.user.id, // Ansatte kan kun se sine egne opplæringer
    },
  });

  if (!training) {
    notFound();
  }

  // Generer nedlastingslenke for bevis hvis det finnes
  let downloadUrl: string | null = null;
  if (training.proofDocKey) {
    const storage = getStorage();
    downloadUrl = await storage.getUrl(training.proofDocKey, 3600); // 1 time
  }

  const isExpired = training.validUntil && new Date(training.validUntil) < new Date();
  const isExpiringSoon = training.validUntil && !isExpired && (() => {
    const daysUntilExpiry = Math.ceil(
      (new Date(training.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/ansatt/opplaering">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til opplæring
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{training.title}</h1>
            <p className="text-muted-foreground">{training.provider}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {training.isRequired && (
            <Badge variant="destructive">Påkrevd kurs</Badge>
          )}
          {training.effectiveness !== null ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Godkjent
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Venter på godkjenning
            </Badge>
          )}
          {isExpired && (
            <Badge variant="destructive">Utløpt</Badge>
          )}
          {isExpiringSoon && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
              Utløper snart
            </Badge>
          )}
        </div>
      </div>

      {/* Varsler */}
      {training.effectiveness === null && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-900">
              <strong>⏳ Venter på godkjenning:</strong> Din leder vil gjennomgå og godkjenne opplæringen din.
            </p>
          </CardContent>
        </Card>
      )}

      {isExpired && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-900">
              <strong>⚠️ Kurset er utløpt:</strong> Dette kurset må fornyes. Ta kontakt med din leder.
            </p>
          </CardContent>
        </Card>
      )}

      {isExpiringSoon && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-sm text-orange-900">
              <strong>🔔 Kurset utløper snart:</strong> Dette kurset må snart fornyes. Planlegg fornyelse i god tid.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Last ned bevis */}
      {downloadUrl && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              Dokumentasjon
            </CardTitle>
            <CardDescription>Ditt opplastede bevis</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={downloadUrl} target="_blank">
              <Button size="lg" className="w-full md:w-auto">
                <Download className="mr-2 h-5 w-5" />
                Last ned bevis/diplom
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Opplæringsinformasjon */}
      <Card>
        <CardHeader>
          <CardTitle>Opplæringsinformasjon</CardTitle>
          <CardDescription>Detaljer om gjennomført opplæring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Kursleverandør
              </p>
              <p className="font-medium">{training.provider}</p>
            </div>

            {training.completedAt && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Gjennomført
                </p>
                <p className="font-medium">
                  {new Date(training.completedAt).toLocaleDateString("nb-NO")}
                </p>
              </div>
            )}

            {training.validUntil && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Gyldig til
                </p>
                <p className={`font-medium ${isExpired ? "text-red-600" : isExpiringSoon ? "text-orange-600" : ""}`}>
                  {new Date(training.validUntil).toLocaleDateString("nb-NO")}
                  {isExpired && " (Utløpt)"}
                  {isExpiringSoon && " (Utløper snart)"}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">
                Registrert
              </p>
              <p className="font-medium">
                {new Date(training.createdAt).toLocaleDateString("nb-NO")}
              </p>
            </div>

            {training.evaluatedBy && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Godkjent av
                </p>
                <p className="font-medium">{training.evaluatedBy}</p>
              </div>
            )}

            {training.evaluatedAt && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Godkjent dato
                </p>
                <p className="font-medium">
                  {new Date(training.evaluatedAt).toLocaleDateString("nb-NO")}
                </p>
              </div>
            )}
          </div>

          {training.description && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Beskrivelse</p>
              <p className="text-sm">{training.description}</p>
            </div>
          )}

          {training.effectiveness && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Effektivitetsvurdering</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-900">{training.effectiveness}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tips:</strong> Hvis du har spørsmål om opplæringen eller trenger å fornye kurset, 
            ta kontakt med din leder eller HMS-ansvarlig.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

