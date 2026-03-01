import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRuhCategoryLabel, getRuhStatusLabel } from "@/features/ruh/schemas/ruh.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileWarning, Plus, Clock, CheckCircle, Search } from "lucide-react";
import Link from "next/link";

export default async function AnsattRuh() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const myReports = await prisma.ruhReport.findMany({
    where: {
      tenantId: session.user.tenantId,
      reportedById: session.user.id,
    },
    orderBy: {
      occurredAt: "desc",
    },
    take: 50,
  });

  const submittedCount = myReports.filter((r) => r.status === "SUBMITTED").length;
  const underReviewCount = myReports.filter((r) => r.status === "UNDER_REVIEW").length;
  const completedCount = myReports.filter((r) => r.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <FileWarning className="h-7 w-7 text-amber-600" />
            Mine RUH-rapporter
          </h1>
          <p className="text-muted-foreground">
            Rapport om uønskede hendelser
          </p>
        </div>
        <Link href="/ansatt/ruh/ny">
          <Button size="lg" className="h-12">
            <Plus className="h-5 w-5 mr-2" />
            Ny rapport
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Innsendt</p>
                <p className="text-2xl font-bold">{submittedCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Behandles</p>
                <p className="text-2xl font-bold">{underReviewCount}</p>
              </div>
              <Search className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ferdig</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>Hva er RUH?</strong> En RUH (Rapport om Uønsket Hendelse) brukes til å rapportere
            hendelser som kunne ha ført til, eller førte til, personskade, materiell skade eller
            miljøskade. Ved å rapportere bidrar du til et tryggere arbeidsmiljø.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mine rapporter ({myReports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {myReports.length === 0 ? (
            <div className="text-center py-12">
              <FileWarning className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ingen rapporter ennå</h3>
              <p className="text-muted-foreground mb-4">
                Du har ikke sendt inn noen RUH-rapporter ennå.
              </p>
              <Link href="/ansatt/ruh/ny">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Send din første rapport
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myReports.map((report) => {
                let statusBadge;
                switch (report.status) {
                  case "SUBMITTED":
                    statusBadge = (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        Innsendt
                      </Badge>
                    );
                    break;
                  case "UNDER_REVIEW":
                    statusBadge = (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        Under behandling
                      </Badge>
                    );
                    break;
                  case "COMPLETED":
                    statusBadge = (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        Behandlet
                      </Badge>
                    );
                    break;
                }

                return (
                  <div
                    key={report.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {report.ruhNummer && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {report.ruhNummer}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold mb-2 truncate">{report.title}</h3>

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {statusBadge}
                          <Badge variant="secondary" className="text-xs">
                            {getRuhCategoryLabel(report.category)}
                          </Badge>
                          {report.injuryOccurred && (
                            <Badge variant="destructive" className="text-xs">
                              Personskade
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                          {report.location && <p>Sted: {report.location}</p>}
                          <p>
                            Hendelsesdato:{" "}
                            {new Date(report.occurredAt).toLocaleDateString("nb-NO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {report.description}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {report.status === "COMPLETED" ? (
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                        ) : report.status === "UNDER_REVIEW" ? (
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Search className="h-5 w-5 text-blue-600" />
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
    </div>
  );
}
