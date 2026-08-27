"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HardHat,
  FileText,
  CheckCircle,
  Clock,
  BookTemplate,
} from "lucide-react";
import Link from "next/link";
import {
  getSjaStatusColor,
  getSjaConclusionColor,
  getRiskColor,
} from "@/features/sja/schemas/sja.schema";
import { SjaCreateTemplateButton } from "@/components/sja/sja-create-template-button";
import { SjaDeleteTemplateButton } from "@/components/sja/sja-delete-template-button";
import { useLocale, useTranslations } from "next-intl";
import { fetchSjaList } from "@/server/queries/sja.queries";

type SjaListData = Awaited<ReturnType<typeof fetchSjaList>>;

interface SjaListContentProps {
  initialData: SjaListData;
  tenantId: string;
}

export function SjaListContent({ initialData, tenantId }: SjaListContentProps) {
  const t = useTranslations("dashboardSjaPage");
  const locale = useLocale();

  const { data } = useQuery({
    queryKey: ["sja"],
    queryFn: () => fetchSjaList(),
    initialData,
  });

  const { analyses, templates } = data;

  const stats = {
    total: analyses.length,
    draft: analyses.filter((a: any) => a.status === "DRAFT").length,
    active: analyses.filter((a: any) => a.status === "ACTIVE").length,
    completed: analyses.filter((a: any) => a.status === "COMPLETED").length,
    cancelled: analyses.filter((a: any) => a.status === "CANCELLED").length,
    templates: templates.length,
  };

  const statusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      DRAFT: "Utkast",
      ACTIVE: "Aktiv",
      COMPLETED: "Fullført",
      CANCELLED: "Kansellert",
    };
    return labels[status] ?? status;
  };

  const conclusionLabel = (conclusion: string | null): string => {
    if (!conclusion) return "–";
    const labels: Record<string, string> = {
      NOT_DECIDED: "Ikke avgjort",
      APPROVED: "Godkjent",
      CONDITIONAL: "Betinget godkjent",
      REJECTED: "Avvist",
    };
    return labels[conclusion] ?? conclusion;
  };

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total.title")}</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("stats.total.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.draft.title")}</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">{t("stats.draft.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.active.title")}</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{t("stats.active.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.completed.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">{t("stats.completed.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.templates.title")}</CardTitle>
            <BookTemplate className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.templates}</div>
            <p className="text-xs text-muted-foreground">{t("stats.templates.description")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("analyses.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="text-center py-12">
              <HardHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("analyses.emptyTitle")}</h3>
              <p className="text-muted-foreground">
                {t("analyses.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.number")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.title")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.location")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.status")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.conclusion")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.createdBy")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.date")}</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">{t("table.risk")}</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((sja: any) => {
                    const maxRisk = sja.hazards.length > 0
                      ? Math.max(...sja.hazards.map((h: any) => h.riskLevel))
                      : 0;

                    return (
                      <tr key={sja.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 pr-4">
                          <Link href={`/dashboard/sja/${sja.id}`} className="text-sm font-mono text-primary hover:underline">
                            {sja.sjaNummer || "-"}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <Link href={`/dashboard/sja/${sja.id}`} className="text-sm font-medium hover:underline">
                            {sja.title}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">{sja.workLocation}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={`text-xs ${getSjaStatusColor(sja.status)}`}>
                            {statusLabel(sja.status)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={`text-xs ${getSjaConclusionColor(sja.conclusion)}`}>
                            {conclusionLabel(sja.conclusion)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">{sja.createdByName}</td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {new Date(sja.plannedDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3">
                          {maxRisk > 0 ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskColor(maxRisk)}`}>
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
              {t("templates.title", { count: templates.length })}
            </CardTitle>
            <SjaCreateTemplateButton tenantId={tenantId} />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("templates.description")}
          </p>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <BookTemplate className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-1">{t("templates.emptyTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("templates.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template: any) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                      {template.workLocation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("templates.workLocation", { value: template.workLocation })}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {t("templates.hazards", { count: template.hazards.length })}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t("templates.createdBy", { name: template.createdByName })} •{" "}
                          {new Date(template.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1">
                        {template.hazards.map((h: any) => (
                          <div key={h.id} className="flex items-start gap-2 text-xs">
                            <Badge variant="outline" className="text-xs shrink-0">{h.activity}</Badge>
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
    </>
  );
}
