"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchConstructionComplianceOverview } from "@/server/queries/project.queries";

type ComplianceData = Awaited<ReturnType<typeof fetchConstructionComplianceOverview>>;

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface ConstructionComplianceOverviewContentProps {
  initialData: ComplianceData;
}

export function ConstructionComplianceOverviewContent({ initialData }: ConstructionComplianceOverviewContentProps) {
  const { data: projects } = useQuery({
    queryKey: ["projects", "construction-compliance"],
    queryFn: () => fetchConstructionComplianceOverview(),
    initialData,
  });

  const todayKey = formatDateOnly(new Date());
  const rows = projects.map((project: any) => {
    const hasShaPlan = Boolean(project.constructionShaPlan);
    const hasPreNotification = Boolean(project.constructionPreNotification);
    const activeWorkers = project.constructionRosterEntries.length;
    const lastCheckDate = project.constructionRosterChecks[0]?.checkedDate ?? null;
    const hasDailyCheckToday =
      lastCheckDate !== null && formatDateOnly(new Date(lastCheckDate)) === todayKey;
    const missingDailyCheck = activeWorkers > 0 && !hasDailyCheckToday;
    return {
      ...project,
      hasShaPlan,
      hasPreNotification,
      activeWorkers,
      hasDailyCheckToday,
      missingDailyCheck,
      lastCheckDate,
    };
  });

  const projectsWithMissingControl = rows.filter((row: any) => row.missingDailyCheck).length;
  const projectsWithoutSha = rows.filter((row: any) => !row.hasShaPlan).length;
  const projectsWithoutPreNotification = rows.filter((row: any) => !row.hasPreNotification).length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Manglende daglig kontroll</p>
            <p className="text-2xl font-bold text-amber-700">{projectsWithMissingControl}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Prosjekter uten SHA-plan</p>
            <p className="text-2xl font-bold text-red-700">{projectsWithoutSha}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Prosjekter uten forhåndsmelding</p>
            <p className="text-2xl font-bold text-red-700">{projectsWithoutPreNotification}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prosjekter</CardTitle>
          <CardDescription>
            Klikk deg inn på prosjektet for å registrere og vedlikeholde bygg/anlegg-data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen prosjekter registrert.</p>
          ) : (
            rows.map((row: any) => (
              <div key={row.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.location || "Uten lokasjon"}</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/projects/${row.id}/construction-compliance`}>
                      Åpne prosjekt-compliance
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={row.hasShaPlan ? "default" : "destructive"}>
                    {row.hasShaPlan ? "SHA-plan OK" : "SHA-plan mangler"}
                  </Badge>
                  <Badge variant={row.hasPreNotification ? "default" : "destructive"}>
                    {row.hasPreNotification ? "Forhåndsmelding OK" : "Forhåndsmelding mangler"}
                  </Badge>
                  <Badge variant={row.missingDailyCheck ? "destructive" : "secondary"}>
                    {row.missingDailyCheck
                      ? "Daglig kontroll mangler"
                      : row.activeWorkers > 0
                      ? "Daglig kontroll OK"
                      : "Ingen aktive personer"}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {row.missingDailyCheck ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    )}
                    Siste kontroll: {row.lastCheckDate ? new Date(row.lastCheckDate).toLocaleDateString("nb-NO") : "Ingen"}
                  </span>
                  {!row.hasShaPlan || !row.hasPreNotification ? (
                    <span className="inline-flex items-center gap-1 text-xs text-red-700">
                      <FileWarning className="h-3.5 w-3.5" />
                      Mangler obligatoriske byggdata
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
