"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrainingList } from "@/features/training/components/training-list";
import { CheckCircle2, AlertTriangle, XCircle, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchTrainingList } from "@/server/queries/training.queries";

type TrainingListData = Awaited<ReturnType<typeof fetchTrainingList>>;

interface TrainingContentProps {
  initialData: TrainingListData;
}

export function TrainingContent({ initialData }: TrainingContentProps) {
  const t = useTranslations("dashboardTrainingPage");

  const { data } = useQuery({
    queryKey: ["training"],
    queryFn: () => fetchTrainingList(),
    initialData,
  });

  const { trainingsRaw, tenantUsers, courseTemplates } = data;

  const userMap = new Map(tenantUsers.map((u: any) => [u.id, u]));
  const trainingsWithUser = trainingsRaw
    .map((t: any) => ({ ...t, user: userMap.get(t.userId) }))
    .filter((t: any) => !!t.user);

  const requiredCourseKeys = courseTemplates
    .filter((c: any) => c.isRequired)
    .map((c: any) => c.courseKey);

  const now = new Date();
  const completed = trainingsRaw.filter((t: any) => t.completedAt).length;

  const expiringSoon = trainingsRaw.filter((t: any) => {
    if (!t.validUntil) return false;
    const days = Math.ceil(
      (new Date(t.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return days > 0 && days <= 30;
  }).length;

  const expired = trainingsRaw.filter((t: any) => {
    if (!t.validUntil) return false;
    return new Date(t.validUntil) < now;
  }).length;

  const employeesWithGaps = tenantUsers.filter((u: any) => {
    const userCourseKeys = new Set(
      trainingsRaw
        .filter((t: any) => t.userId === u.id && t.completedAt)
        .filter((t: any) => {
          if (!t.validUntil) return true;
          return new Date(t.validUntil) >= now;
        })
        .map((t: any) => t.courseKey),
    );
    return requiredCourseKeys.some((key: any) => !userCourseKeys.has(key));
  }).length;

  const expiringTrainings = trainingsWithUser
    .filter((training: any) => {
      if (!training.validUntil) return false;
      const days = Math.ceil(
        (new Date(training.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return days <= 30;
    })
    .sort((a: any, b: any) => {
      const aDate = a.validUntil ? new Date(a.validUntil).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.validUntil ? new Date(b.validUntil).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    })
    .slice(0, 10);

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.completed.title")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <p className="text-xs text-muted-foreground">
              {trainingsRaw.length > 0
                ? t("stats.completed.percentOfTotal", {
                    percent: Math.round((completed / trainingsRaw.length) * 100),
                  })
                : t("stats.completed.zero")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.expiringSoon.title")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringSoon}</div>
            <p className="text-xs text-muted-foreground">{t("stats.expiringSoon.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.expired.title")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expired}</div>
            <p className="text-xs text-muted-foreground">{t("stats.expired.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.employeesWithGaps.title")}</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{employeesWithGaps}</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.employeesWithGaps.description", { total: tenantUsers.length })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Utløpsvarsler */}
      {expiringTrainings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">
              {t("expiryAlerts.title")}
            </CardTitle>
            <CardDescription className="text-amber-800">
              {t("expiryAlerts.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringTrainings.map((training: any) => {
                const daysUntilExpiry = training.validUntil
                  ? Math.ceil(
                      (new Date(training.validUntil).getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;
                const isExpired = (daysUntilExpiry ?? 1) <= 0;
                return (
                  <div
                    key={training.id}
                    className="flex items-center justify-between rounded-md border border-amber-200 bg-white p-3"
                  >
                    <div>
                      <p className="font-medium">{training.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {training.user?.name || training.user?.email || t("expiryAlerts.unknownEmployee")}
                      </p>
                    </div>
                    <Badge variant={isExpired ? "destructive" : "outline"}>
                      {isExpired
                        ? t("expiryAlerts.expired")
                        : t("expiryAlerts.daysLeft", { days: daysUntilExpiry })}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>
            {t("list.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingList
            trainings={trainingsWithUser}
            tenantUsers={tenantUsers}
            requiredCourseKeys={requiredCourseKeys}
          />
        </CardContent>
      </Card>
    </>
  );
}
