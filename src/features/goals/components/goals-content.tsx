"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { GoalList } from "@/features/goals/components/goal-list";
import { fetchGoals } from "@/server/queries/goal.queries";

type GoalsData = Awaited<ReturnType<typeof fetchGoals>>;

interface GoalsContentProps {
  initialData: GoalsData;
}

export function GoalsContent({ initialData }: GoalsContentProps) {
  const t = useTranslations("dashboardGoalsPage");

  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: () => fetchGoals(),
    initialData,
  });

  const stats = {
    total: goals.length,
    active: goals.filter((g: any) => g.status === "ACTIVE").length,
    achieved: goals.filter((g: any) => g.status === "ACHIEVED").length,
    atRisk: goals.filter((g: any) => g.status === "AT_RISK").length,
    failed: goals.filter((g: any) => g.status === "FAILED").length,
  };

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total.title")}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("stats.total.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.active.title")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{t("stats.active.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.achieved.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.achieved}</div>
            <p className="text-xs text-muted-foreground">{t("stats.achieved.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.atRisk.title")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.atRisk}</div>
            <p className="text-xs text-muted-foreground">{t("stats.atRisk.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.failed.title")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">{t("stats.failed.description")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GoalList goals={goals} />
        </CardContent>
      </Card>
    </>
  );
}
