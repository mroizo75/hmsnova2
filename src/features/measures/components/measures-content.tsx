"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerQuery } from "@/hooks/use-server-query";
import { MeasureList } from "@/features/measures/components/measure-list";
import { ListTodo, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchMeasures } from "@/server/queries/measure.queries";

type MeasureData = NonNullable<Awaited<ReturnType<typeof fetchMeasures>>>;

interface MeasuresContentProps {
  initialData: MeasureData;
  source?: string;
}

export function MeasuresContent({ initialData, source }: MeasuresContentProps) {
  const t = useTranslations("dashboardActionsPage");

  const { data } = useServerQuery({
    queryKey: ["measures", source],
    queryFn: () => fetchMeasures(source),
    initialData,
  });

  if (!data) return null;

  const { measures, stats } = data;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total.title")}</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("stats.total.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.inProgress.title")}</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.pending + stats.inProgress}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.inProgress.description", {
                pending: stats.pending,
                inProgress: stats.inProgress,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.done.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.done}</div>
            <p className="text-xs text-muted-foreground">{t("stats.done.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.overdue.title")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">{t("stats.overdue.description")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <MeasureList measures={measures} showSourceBadges />
        </CardContent>
      </Card>
    </>
  );
}
