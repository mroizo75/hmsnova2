"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectTabs } from "@/features/projects/components/project-tabs";
import { useLocale, useTranslations } from "next-intl";
import { fetchProjectDetail } from "@/server/queries/project.queries";

type ProjectDetailData = NonNullable<Awaited<ReturnType<typeof fetchProjectDetail>>>;

interface ProjectDetailContentProps {
  initialData: ProjectDetailData;
}

export function ProjectDetailContent({ initialData }: ProjectDetailContentProps) {
  const t = useTranslations("dashboardProjectDetailPage");
  const locale = useLocale();

  const { data } = useQuery({
    queryKey: ["projects", initialData.project.id],
    queryFn: () => fetchProjectDetail(initialData.project.id),
    initialData,
  });

  if (!data) return null;

  const { project, attachments } = data;

  const manHours = project.timeEntries.reduce((s: number, e: any) => s + e.hours, 0);

  const hseIncidents = project.incidents.filter((i: any) =>
    ["ULYKKE", "NESTEN", "YRKESSYKDOM"].includes(i.type)
  );
  const fatalities = hseIncidents.filter((i: any) => i.isFatal).length;
  const lti = hseIncidents.filter((i: any) => i.isLostTimeIncident).length;
  const restricted = hseIncidents.filter((i: any) => i.isRestrictedWork).length;
  const medical = hseIncidents.filter((i: any) => i.medicalAttentionRequired).length;
  const totalRecordable = fatalities + lti + restricted + medical;
  const trir =
    manHours > 0
      ? Math.round(((totalRecordable * 200000) / manHours) * 100) / 100
      : null;

  const openMeasures = project.measures.filter(
    (m: any) => !["DONE", "CANCELLED"].includes(m.status)
  ).length;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("cards.incidents.title")}</p>
            <p className="text-2xl font-bold text-red-600 mt-0.5">{project.incidents.length}</p>
            <p className="text-xs text-muted-foreground">{t("cards.incidents.description")}</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">SJA</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{project.sjaAnalyses.length}</p>
            <p className="text-xs text-muted-foreground">analyser</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("cards.inspections.title")}</p>
            <p className="text-2xl font-bold text-blue-600 mt-0.5">{project.inspections.length}</p>
            <p className="text-xs text-muted-foreground">{t("cards.inspections.description")}</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("cards.openMeasures.title")}</p>
            <p className={`text-2xl font-bold mt-0.5 ${openMeasures > 0 ? "text-orange-600" : "text-green-600"}`}>
              {openMeasures}
            </p>
            <p className="text-xs text-muted-foreground">{t("cards.openMeasures.description", { total: project.measures.length })}</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("cards.hours.title")}</p>
            <p className="text-2xl font-bold mt-0.5">
              {manHours > 0 ? Math.round(manHours).toLocaleString(locale === "en" ? "en-US" : "nb-NO") : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{t("cards.hours.description")}</p>
          </CardContent>
        </Card>
        <Card className={`lg:col-span-1 ${trir !== null && trir > 5 ? "border-red-200 bg-red-50/30" : ""}`}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("cards.trir.title")}</p>
            <p className={`text-2xl font-bold mt-0.5 ${
              trir === null ? "text-muted-foreground" :
              trir === 0 ? "text-green-600" :
              trir < 3 ? "text-blue-600" :
              trir < 5 ? "text-amber-600" : "text-red-600"
            }`}>
              {trir !== null ? trir.toFixed(2) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {trir === null ? t("cards.trir.requiresHours") : t("cards.trir.perHours")}
            </p>
          </CardContent>
        </Card>
      </div>

      <ProjectTabs
        projectId={project.id}
        incidents={project.incidents as any}
        sjaAnalyses={project.sjaAnalyses as any}
        inspections={project.inspections as any}
        measures={project.measures as any}
        timeEntries={project.timeEntries as any}
        attachments={attachments}
        formSubmissions={project.formSubmissions as any}
      />
    </>
  );
}
