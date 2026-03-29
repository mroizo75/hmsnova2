import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { AlertTriangle, CheckCircle2, FileWarning, HardHat } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function ConstructionComplianceOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });
  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang</div>;
  }

  const membership = user.tenants.find(
    (tenantMembership) => tenantMembership.tenantId === session.user.tenantId,
  );
  if (!membership) {
    return <div>Ingen tilgang</div>;
  }
  const permissions = getPermissions(membership.role);
  if (!permissions.canReadConstructionCompliance) {
    redirect("/dashboard");
  }

  const tenantId = membership.tenantId;
  const projects = await prisma.project.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      location: true,
      constructionShaPlan: {
        select: { id: true },
      },
      constructionPreNotification: {
        select: { id: true },
      },
      constructionRosterEntries: {
        where: { isActive: true },
        select: { id: true },
      },
      constructionRosterChecks: {
        orderBy: { checkedDate: "desc" },
        take: 1,
        select: { checkedDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const todayKey = formatDateOnly(new Date());
  const rows = projects.map((project) => {
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

  const projectsWithMissingControl = rows.filter((row) => row.missingDailyCheck).length;
  const projectsWithoutSha = rows.filter((row) => !row.hasShaPlan).length;
  const projectsWithoutPreNotification = rows.filter((row) => !row.hasPreNotification).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <HardHat className="h-8 w-8 text-amber-600" />
          Bygg/anlegg-compliance
        </h1>
        <p className="text-muted-foreground">
          Oversikt over SHA-plan, forhåndsmelding og daglig kontroll av elektronisk oversiktsliste.
        </p>
      </div>

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
            rows.map((row) => (
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
    </div>
  );
}
