import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function AnsattAvvik() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  // Hent ansattes egne avviksrapporter
  const myIncidents = await prisma.incident.findMany({
    where: {
      tenantId: session.user.tenantId,
      reportedBy: session.user.name || session.user.email || "Ansatt",
    },
    orderBy: {
      occurredAt: "desc",
    },
    take: 50, // Siste 50 rapporter
  });

  // Tell status
  const openCount = myIncidents.filter((i) => i.status === "REPORTED").length;
  const investigatingCount = myIncidents.filter((i) => i.status === "INVESTIGATING").length;
  const closedCount = myIncidents.filter((i) => i.status === "CLOSED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <AlertCircle className="h-7 w-7 text-red-600" />
            Mine avvik
          </h1>
          <p className="text-muted-foreground">
            Oversikt over dine rapporterte avvik
          </p>
        </div>
        <Link href="/ansatt/avvik/ny">
          <Button size="lg" className="h-12">
            <Plus className="h-5 w-5 mr-2" />
            Rapporter nytt
          </Button>
        </Link>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Rapportert</p>
                <p className="text-2xl font-bold">{openCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Undersøkes</p>
                <p className="text-2xl font-bold">{investigatingCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Lukket</p>
                <p className="text-2xl font-bold">{closedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hjelp-melding */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tips:</strong> Du kan se status på dine rapporter her. 
            HMS-ansvarlig vil behandle avviket og du får beskjed når det er lukket.
          </p>
        </CardContent>
      </Card>

      {/* Avviksliste */}
      <Card>
        <CardHeader>
          <CardTitle>Mine rapporter ({myIncidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {myIncidents.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ingen rapporter ennå</h3>
              <p className="text-muted-foreground mb-4">
                Du har ikke rapportert noen avvik ennå.
              </p>
              <Link href="/ansatt/avvik/ny">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Rapporter første avvik
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myIncidents.map((incident) => {
                // Status badge
                let statusBadge;
                if (incident.status === "REPORTED") {
                  statusBadge = (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                      🕐 Rapportert
                    </Badge>
                  );
                } else if (incident.status === "INVESTIGATING") {
                  statusBadge = (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      🔍 Undersøkes
                    </Badge>
                  );
                } else if (incident.status === "CLOSED") {
                  statusBadge = (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      ✓ Lukket
                    </Badge>
                  );
                } else {
                  statusBadge = (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                      📋 {incident.status}
                    </Badge>
                  );
                }

                // Type badge
                let typeBadge;
                switch (incident.type) {
                  case "AVVIK":
                    typeBadge = "⚠️ Avvik";
                    break;
                  case "NESTEN":
                    typeBadge = "🟡 Nestenulykke";
                    break;
                  case "SKADE":
                    typeBadge = "🔴 Skade";
                    break;
                  case "MILJO":
                    typeBadge = "🌍 Miljø";
                    break;
                  case "KVALITET":
                    typeBadge = "📋 Kvalitet";
                    break;
                  default:
                    typeBadge = incident.type;
                }

                // Severity badge
                let severityColor = "bg-gray-100 text-gray-700";
                if (incident.severity >= 4) {
                  severityColor = "bg-red-100 text-red-700";
                } else if (incident.severity === 3) {
                  severityColor = "bg-yellow-100 text-yellow-700";
                } else {
                  severityColor = "bg-green-100 text-green-700";
                }

                return (
                  <div
                    key={incident.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Tittel */}
                        <h3 className="font-semibold mb-2 truncate">{incident.title}</h3>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {statusBadge}
                          <Badge variant="secondary" className="text-xs">
                            {typeBadge}
                          </Badge>
                          <Badge variant="secondary" className={`text-xs ${severityColor}`}>
                            Alvorlighet: {incident.severity}
                          </Badge>
                        </div>

                        {/* Info */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          {incident.location && (
                            <p>📍 Sted: {incident.location}</p>
                          )}
                          <p>
                            🕐 Rapportert: {new Date(incident.occurredAt).toLocaleDateString("nb-NO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        {/* Beskrivelse (første 100 tegn) */}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {incident.description}
                        </p>
                      </div>

                      {/* Status ikon */}
                      <div className="flex-shrink-0">
                        {incident.status === "CLOSED" ? (
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                        ) : incident.status === "INVESTIGATING" ? (
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-yellow-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hjelp */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">📚 Status-forklaring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-900">
          <div>
            <strong>🕐 Rapportert:</strong> Avviket er mottatt og venter på behandling.
          </div>
          <div>
            <strong>🔍 Undersøkes:</strong> HMS-ansvarlig jobber med saken.
          </div>
          <div>
            <strong>✓ Lukket:</strong> Avviket er behandlet og tiltak er gjennomført.
          </div>
        </CardContent>
      </Card>

      {/* Nødknapp */}
      <Card className="border-l-4 border-l-red-500 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-900 mb-1">
                🚨 Ved akutt fare
              </p>
              <p className="text-xs text-red-800">
                Ring 110 (brann), 112 (politi) eller 113 (ambulanse) FØRST!
                Rapporter deretter avviket her.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

