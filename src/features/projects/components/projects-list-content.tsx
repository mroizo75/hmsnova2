"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, Building2, MapPin, User, CalendarDays, AlertCircle, HardHat, ClipboardCheck, ListTodo, Plus } from "lucide-react";
import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { fetchProjects } from "@/server/queries/project.queries";
import { InvoicePreviewDialog } from "@/features/projects/components/invoice-preview-dialog";

type ProjectsData = Awaited<ReturnType<typeof fetchProjects>>;
type Filter = "all" | "active" | "hms" | "ready";

function getStatusConfig(
  t: ReturnType<typeof useTranslations>
): Record<ProjectStatus, { label: string; color: string }> {
  return {
    PLANNING: { label: t("status.planning"), color: "bg-blue-100 text-blue-800 border-blue-300" },
    ACTIVE: { label: t("status.active"), color: "bg-green-100 text-green-800 border-green-300" },
    ON_HOLD: { label: t("status.onHold"), color: "bg-amber-100 text-amber-800 border-amber-300" },
    COMPLETED: { label: t("status.completed"), color: "bg-gray-100 text-gray-700 border-gray-300" },
    ARCHIVED: { label: t("status.archived"), color: "bg-gray-100 text-gray-500 border-gray-200" },
  };
}

interface ProjectsListContentProps {
  initialData: ProjectsData;
  accountingEnabled?: boolean;
  canInvoice?: boolean;
}

export function ProjectsListContent({
  initialData,
  accountingEnabled = false,
  canInvoice = false,
}: ProjectsListContentProps) {
  const t = useTranslations("dashboardProjectsPage");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
    initialData,
  });

  const active = projects.filter((p: { status: string }) => p.status === "ACTIVE").length;
  const planning = projects.filter((p: { status: string }) => p.status === "PLANNING").length;
  const ready = projects.filter((p: { billingStatus?: string }) => p.billingStatus === "READY").length;
  const statusConfig = getStatusConfig(t);

  const visible = projects.filter((p: { status: string; jobKind?: string; billingStatus?: string }) => {
    if (filter === "active") return p.status === "ACTIVE";
    if (filter === "hms") return p.jobKind === "HMS";
    if (filter === "ready") return p.billingStatus === "READY";
    return true;
  });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">{active}</div>
            <p className="text-sm text-muted-foreground">{t("stats.activeProjects")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-700">{planning}</div>
            <p className="text-sm text-muted-foreground">{t("stats.inPlanning")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-700">{ready}</div>
            <p className="text-sm text-muted-foreground">{t("stats.readyToInvoice")}</p>
          </CardContent>
        </Card>
      </div>

      {accountingEnabled && (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", t("filters.all")],
              ["active", t("filters.active")],
              ["hms", t("filters.hms")],
              ["ready", t("filters.ready")],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "default" : "outline"}
              className={filter === key ? "" : "bg-transparent"}
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("empty.title")}</p>
            <p className="text-muted-foreground mt-1">{t("empty.description")}</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("actions.createFirstProject")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((project: any) => {
            const sc = statusConfig[project.status as ProjectStatus];
            return (
              <Card key={project.id} className="h-full border-l-4 border-l-blue-500">
                <Link href={`/dashboard/projects/${project.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{project.name}</CardTitle>
                      <Badge className={`shrink-0 text-xs border ${sc.color}`}>{sc.label}</Badge>
                    </div>
                    {project.code && (
                      <p className="text-xs text-muted-foreground font-mono">{project.code}</p>
                    )}
                  </CardHeader>
                </Link>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5 text-sm">
                    {project.clientName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{project.clientName}</span>
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
                            ? new Date(project.startDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")
                            : "—"}
                          {" → "}
                          {project.endDate
                            ? new Date(project.endDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")
                            : t("ongoing")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1 border-t text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {t("counters.incidents", { count: project._count.incidents })}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardHat className="h-3 w-3" />
                      {t("counters.sja", { count: project._count.sjaAnalyses })}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClipboardCheck className="h-3 w-3" />
                      {t("counters.inspections", { count: project._count.inspections })}
                    </span>
                    <span className="flex items-center gap-1">
                      <ListTodo className="h-3 w-3" />
                      {t("counters.measures", { count: project._count.measures })}
                    </span>
                  </div>

                  {accountingEnabled && canInvoice && project.billingStatus === "READY" && (
                    <InvoicePreviewDialog
                      projectId={project.id}
                      onDone={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
