import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  getSjaStatusLabel,
  getSjaStatusColor,
  getSjaConclusionLabel,
  getSjaConclusionColor,
} from "@/features/sja/schemas/sja.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HardHat,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  BookTemplate,
} from "lucide-react";
import Link from "next/link";

export default async function AnsattSja() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const mySjas = await prisma.sjaAnalysis.findMany({
    where: {
      tenantId: session.user.tenantId,
      createdById: session.user.id,
    },
    include: {
      hazards: { select: { id: true, riskLevel: true } },
    },
    orderBy: { plannedDate: "desc" },
    take: 50,
  });

  const templates = await prisma.sjaTemplate.findMany({
    where: {
      tenantId: session.user.tenantId,
      isActive: true,
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });

  const draftCount = mySjas.filter((s) => s.status === "DRAFT").length;
  const activeCount = mySjas.filter((s) => s.status === "ACTIVE").length;
  const completedCount = mySjas.filter((s) => s.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <HardHat className="h-7 w-7 text-orange-600" />
            Mine SJA-analyser
          </h1>
          <p className="text-muted-foreground">
            Sikker Jobb Analyse – identifiser farer før arbeidet starter
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ansatt/sja/maler">
            <Button variant="outline" size="lg" className="h-12">
              <BookTemplate className="h-5 w-5 mr-2" />
              Maler
            </Button>
          </Link>
          <Link href="/ansatt/sja/ny">
            <Button size="lg" className="h-12">
              <Plus className="h-5 w-5 mr-2" />
              Ny SJA
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Utkast</p>
                <p className="text-2xl font-bold">{draftCount}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Aktive</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Fullført</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {templates.length > 0 && (
        <Card className="border-l-4 border-l-purple-500 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-purple-900">
                  <BookTemplate className="h-4 w-4 inline mr-1" />
                  {templates.length} SJA-mal{templates.length !== 1 ? "er" : ""} tilgjengelig
                </p>
                <p className="text-sm text-purple-700 mt-1">
                  Bruk en mal for å raskt opprette SJA for gjentakende arbeidsoppgaver
                </p>
              </div>
              <Link href="/ansatt/sja/maler">
                <Button variant="outline" size="sm">
                  Se maler
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-l-4 border-l-orange-500 bg-orange-50">
        <CardContent className="p-4">
          <p className="text-sm text-orange-900">
            <strong>Hva er SJA?</strong> En Sikker Jobb Analyse (SJA) er en systematisk
            gjennomgang av faremomentene ved en arbeidsoppgave. SJA skal gjennomføres FØR
            arbeidet starter, og alle involverte skal delta i gjennomgangen.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mine analyser ({mySjas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {mySjas.length === 0 ? (
            <div className="text-center py-12">
              <HardHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ingen SJA-analyser ennå</h3>
              <p className="text-muted-foreground mb-4">
                Opprett din første SJA for å sikre trygt arbeid.
              </p>
              <Link href="/ansatt/sja/ny">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Opprett din første SJA
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {mySjas.map((sja) => {
                const maxRisk = sja.hazards.length > 0
                  ? Math.max(...sja.hazards.map((h) => h.riskLevel))
                  : 0;

                return (
                  <div
                    key={sja.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {sja.sjaNummer && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {sja.sjaNummer}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold mb-2 truncate">{sja.title}</h3>

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getSjaStatusColor(sja.status)}`}
                          >
                            {getSjaStatusLabel(sja.status)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getSjaConclusionColor(sja.conclusion)}`}
                          >
                            {getSjaConclusionLabel(sja.conclusion)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {sja.hazards.length} fare{sja.hazards.length !== 1 ? "r" : ""}
                          </Badge>
                          {maxRisk >= 10 && (
                            <Badge variant="destructive" className="text-xs">
                              Høy risiko ({maxRisk})
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Sted: {sja.workLocation}</p>
                          <p>
                            Planlagt:{" "}
                            {new Date(sja.plannedDate).toLocaleDateString("nb-NO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {sja.status === "COMPLETED" ? (
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          </div>
                        ) : sja.status === "ACTIVE" ? (
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-green-600" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-gray-600" />
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
