import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Building2, MapPin, User, CalendarDays, AlertCircle, HardHat, ClipboardCheck, ListTodo } from "lucide-react";
import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";

const statusConfig: Record<ProjectStatus, { label: string; color: string }> = {
  PLANNING: { label: "Planlegging", color: "bg-blue-100 text-blue-800 border-blue-300" },
  ACTIVE: { label: "Aktiv", color: "bg-green-100 text-green-800 border-green-300" },
  ON_HOLD: { label: "På vent", color: "bg-amber-100 text-amber-800 border-amber-300" },
  COMPLETED: { label: "Fullført", color: "bg-gray-100 text-gray-700 border-gray-300" },
  ARCHIVED: { label: "Arkivert", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });
  if (!user || user.tenants.length === 0) return <div>Ingen tilgang</div>;

  const tenantId = user.tenants[0].tenantId;

  const projects = await prisma.project.findMany({
    where: { tenantId },
    include: {
      projectManager: { select: { name: true, email: true } },
      _count: {
        select: { incidents: true, sjaAnalyses: true, inspections: true, measures: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const active = projects.filter((p) => p.status === "ACTIVE").length;
  const planning = projects.filter((p) => p.status === "PLANNING").length;
  const completed = projects.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-blue-600" />
            Prosjekter / Jobber
          </h1>
          <p className="text-muted-foreground">
            Knytt avvik, SJA, vernerunder og tiltak til prosjekter for samlet HMS-rapportering
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            Nytt prosjekt
          </Link>
        </Button>
      </div>

      {/* Statistikk-oversikt */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">{active}</div>
            <p className="text-sm text-muted-foreground">Aktive prosjekter</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-700">{planning}</div>
            <p className="text-sm text-muted-foreground">Under planlegging</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{completed}</div>
            <p className="text-sm text-muted-foreground">Fullførte</p>
          </CardContent>
        </Card>
      </div>

      {/* Prosjektliste */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Ingen prosjekter ennå</p>
            <p className="text-muted-foreground mt-1">
              Opprett et prosjekt for å koble HMS-aktiviteter til en jobb eller oppdrag
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Opprett første prosjekt
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const sc = statusConfig[project.status];
            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{project.name}</CardTitle>
                      <Badge className={`shrink-0 text-xs border ${sc.color}`}>{sc.label}</Badge>
                    </div>
                    {project.code && (
                      <p className="text-xs text-muted-foreground font-mono">{project.code}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5 text-sm">
                      {project.clientName && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.clientName}</span>
                        </div>
                      )}
                      {project.orderNumber && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-xs font-mono">Ordre: {project.orderNumber}</span>
                        </div>
                      )}
                      {project.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </div>
                      )}
                      {project.projectManager && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {project.projectManager.name || project.projectManager.email}
                          </span>
                        </div>
                      )}
                      {(project.startDate || project.endDate) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs">
                            {project.startDate
                              ? new Date(project.startDate).toLocaleDateString("nb-NO")
                              : "—"}
                            {" → "}
                            {project.endDate
                              ? new Date(project.endDate).toLocaleDateString("nb-NO")
                              : "Løpende"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Aktivitets-tellere */}
                    <div className="flex gap-3 pt-1 border-t text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {project._count.incidents} avvik
                      </span>
                      <span className="flex items-center gap-1">
                        <HardHat className="h-3 w-3" />
                        {project._count.sjaAnalyses} SJA
                      </span>
                      <span className="flex items-center gap-1">
                        <ClipboardCheck className="h-3 w-3" />
                        {project._count.inspections} runder
                      </span>
                      <span className="flex items-center gap-1">
                        <ListTodo className="h-3 w-3" />
                        {project._count.measures} tiltak
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
