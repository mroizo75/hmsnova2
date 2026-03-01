import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HardHat,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  BookTemplate,
} from "lucide-react";
import Link from "next/link";
import {
  getSjaStatusLabel,
  getSjaStatusColor,
  getSjaConclusionLabel,
  getSjaConclusionColor,
  getRiskColor,
  getRiskLabel,
} from "@/features/sja/schemas/sja.schema";
import { SjaCreateTemplateButton } from "@/components/sja/sja-create-template-button";
import { SjaDeleteTemplateButton } from "@/components/sja/sja-delete-template-button";

export default async function SjaDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = user.tenants[0].tenantId;

  const analyses = await prisma.sjaAnalysis.findMany({
    where: { tenantId },
    include: {
      hazards: { select: { id: true, riskLevel: true } },
    },
    orderBy: { plannedDate: "desc" },
  });

  const templates = await prisma.sjaTemplate.findMany({
    where: { tenantId, isActive: true },
    include: {
      hazards: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  const stats = {
    total: analyses.length,
    draft: analyses.filter((a) => a.status === "DRAFT").length,
    active: analyses.filter((a) => a.status === "ACTIVE").length,
    completed: analyses.filter((a) => a.status === "COMPLETED").length,
    cancelled: analyses.filter((a) => a.status === "CANCELLED").length,
    templates: templates.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HardHat className="h-8 w-8 text-orange-600" />
            SJA – Sikker Jobb Analyse
          </h1>
          <p className="text-muted-foreground">
            Oversikt over alle SJA-analyser og maler
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">SJA-analyser</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utkast</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Venter på godkjenning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Pågående arbeid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fullført</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Ferdig behandlet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maler</CardTitle>
            <BookTemplate className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.templates}</div>
            <p className="text-xs text-muted-foreground">Gjenbrukbare maler</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle SJA-analyser</CardTitle>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="text-center py-12">
              <HardHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ingen SJA-analyser</h3>
              <p className="text-muted-foreground">
                Det er ikke opprettet noen SJA-analyser ennå.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Nr.</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Tittel</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Sted</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Konklusjon</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Opprettet av</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Dato</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((sja) => {
                    const maxRisk = sja.hazards.length > 0
                      ? Math.max(...sja.hazards.map((h) => h.riskLevel))
                      : 0;

                    return (
                      <tr key={sja.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 pr-4">
                          <Link
                            href={`/dashboard/sja/${sja.id}`}
                            className="text-sm font-mono text-primary hover:underline"
                          >
                            {sja.sjaNummer || "-"}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <Link
                            href={`/dashboard/sja/${sja.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {sja.title}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {sja.workLocation}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getSjaStatusColor(sja.status)}`}
                          >
                            {getSjaStatusLabel(sja.status)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getSjaConclusionColor(sja.conclusion)}`}
                          >
                            {getSjaConclusionLabel(sja.conclusion)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {sja.createdByName}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {new Date(sja.plannedDate).toLocaleDateString("nb-NO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3">
                          {maxRisk > 0 ? (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskColor(
                                maxRisk
                              )}`}
                            >
                              {maxRisk}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookTemplate className="h-5 w-5 text-purple-600" />
              SJA-maler ({templates.length})
            </CardTitle>
            <SjaCreateTemplateButton tenantId={tenantId} />
          </div>
          <p className="text-sm text-muted-foreground">
            Maler gjør det enkelt for ansatte å opprette SJA daglig med forhåndsdefinerte farer og tiltak
          </p>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <BookTemplate className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-1">Ingen maler opprettet</h3>
              <p className="text-sm text-muted-foreground">
                Opprett en mal slik at ansatte raskt kan lage SJA for gjentakende arbeidsoppgaver.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                      {template.workLocation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Arbeidssted: {template.workLocation}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {template.hazards.length} fare{template.hazards.length !== 1 ? "r" : ""}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Opprettet av {template.createdByName} •{" "}
                          {new Date(template.createdAt).toLocaleDateString("nb-NO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1">
                        {template.hazards.map((h) => (
                          <div key={h.id} className="flex items-start gap-2 text-xs">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {h.activity}
                            </Badge>
                            <span className="text-muted-foreground truncate">
                              {h.hazard} → {h.measures}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <SjaDeleteTemplateButton templateId={template.id} templateName={template.name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
