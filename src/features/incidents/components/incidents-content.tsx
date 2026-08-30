"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IncidentTabs } from "@/features/incidents/components/incident-tabs";
import { AlertCircle, Clock, CheckCircle, ShieldAlert, FileWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchIncidents } from "@/server/queries/incident.queries";
import { useServerQuery } from "@/hooks/use-server-query";

type IncidentData = Awaited<ReturnType<typeof fetchIncidents>>;

interface IncidentsContentProps {
  initialData: IncidentData;
  kilde?: string;
}

const RUH_TYPES = new Set(["ULYKKE", "NESTEN", "FARLIG_SITUASJON", "YRKESSYKDOM"]);

export function IncidentsContent({ initialData, kilde }: IncidentsContentProps) {
  const t = useTranslations("dashboardIncidentsPage");

  const { data: incidents } = useServerQuery({
    queryKey: ["incidents", kilde ?? "alle"],
    queryFn: () => fetchIncidents({ kilde }),
    initialData,
  });

  const stats = {
    total: incidents.length,
    avvik: incidents.filter((i: any) => !RUH_TYPES.has(i.type)).length,
    ruh: incidents.filter((i: any) => RUH_TYPES.has(i.type)).length,
    open: incidents.filter((i: any) => i.status === "OPEN").length,
    investigating: incidents.filter((i: any) => i.status === "INVESTIGATING").length,
    actionTaken: incidents.filter((i: any) => i.status === "ACTION_TAKEN").length,
    closed: incidents.filter((i: any) => i.status === "CLOSED").length,
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total.title")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("stats.total.description")}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.avvik.title")}</CardTitle>
            <FileWarning className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.avvik}</div>
            <p className="text-xs text-muted-foreground">{t("stats.avvik.description")}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.ruh.title")}</CardTitle>
            <ShieldAlert className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.ruh}</div>
            <p className="text-xs text-muted-foreground">{t("stats.ruh.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.open.title")}</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            <p className="text-xs text-muted-foreground">{t("stats.open.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.closed.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
            <p className="text-xs text-muted-foreground">{t("stats.closed.description")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("allIncidents")}</CardTitle>
        </CardHeader>
        <CardContent>
          <IncidentTabs incidents={incidents} />
        </CardContent>
      </Card>
    </>
  );
}
