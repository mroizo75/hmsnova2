"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerQuery } from "@/hooks/use-server-query";
import { TrainingList } from "@/features/training/components/training-list";
import { CheckCircle2, AlertTriangle, XCircle, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchTrainingList } from "@/server/queries/training.queries";
import { hospitalityCourseKeysForTheme } from "@/lib/hospitality-courses";
import { daysUntil, pickCurrentTrainings } from "@/features/training/lib/current-training";
import { TrainingRenewalPanel } from "@/features/training/components/training-renewal-panel";
import Link from "next/link";

type TrainingListData = Awaited<ReturnType<typeof fetchTrainingList>>;

interface TrainingContentProps {
  initialData: TrainingListData;
  tema?: string;
  tenantId: string;
}

export function TrainingContent({ initialData, tema, tenantId }: TrainingContentProps) {
  const t = useTranslations("dashboardTrainingPage");

  const { data } = useServerQuery({
    queryKey: ["training", tema ?? "alle"],
    queryFn: () => fetchTrainingList(),
    initialData,
  });

  const themeKeys = hospitalityCourseKeysForTheme(tema);
  const trainingsRaw = themeKeys
    ? data.trainingsRaw.filter((row: { courseKey: string }) => themeKeys.includes(row.courseKey))
    : data.trainingsRaw;
  const tenantUsers = data.tenantUsers;
  const courseTemplates = themeKeys
    ? data.courseTemplates.filter((row: { courseKey: string }) => themeKeys.includes(row.courseKey))
    : data.courseTemplates;

  const userMap = new Map(tenantUsers.map((u: any) => [u.id, u]));
  const currentTrainings = pickCurrentTrainings(trainingsRaw);
  const trainingsWithUser = currentTrainings
    .map((t: any) => ({ ...t, user: userMap.get(t.userId) }))
    .filter((t: any) => !!t.user);

  const requiredCourseKeysByUser: Record<string, string[]> = data.requiredCourseKeysByUser ?? {};

  const reminderDays = data.reminderDays ?? 30;
  const now = new Date();
  const completed = currentTrainings.filter((t) => t.completedAt).length;

  const expiringSoon = currentTrainings.filter((t) => {
    const days = daysUntil(t.validUntil, now);
    return days !== null && days > 0 && days <= reminderDays;
  }).length;

  const expired = currentTrainings.filter((t) => {
    const days = daysUntil(t.validUntil, now);
    return days !== null && days <= 0;
  }).length;

  const employeesWithGaps = tenantUsers.filter((u: any) => {
    const userCourseKeys = new Set(
      currentTrainings
        .filter((t) => t.userId === u.id && t.completedAt)
        .filter((t) => {
          if (!t.validUntil) return true;
          return new Date(t.validUntil) >= now;
        })
        .map((t) => t.courseKey),
    );
    const requiredKeys = requiredCourseKeysByUser[u.id] ?? [];
    return requiredKeys.some((key) => !userCourseKeys.has(key));
  }).length;

  const themeLabel = tema === "skjenking" ? "skjenking" : tema === "ik-mat" ? "IK-mat" : null;

  return (
    <>
      {themeLabel && (
        <p className="text-sm text-muted-foreground">
          Viser kurs for {themeLabel}.{" "}
          <Link href="/dashboard/training" className="underline">
            Vis alle kurs
          </Link>
        </p>
      )}
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
              {currentTrainings.length > 0
                ? t("stats.completed.percentOfTotal", {
                    percent: Math.round((completed / currentTrainings.length) * 100),
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

      <TrainingRenewalPanel
        tenantId={tenantId}
        trainings={trainingsWithUser}
        users={tenantUsers}
        courseTemplates={courseTemplates}
        reminderDays={reminderDays}
      />

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
            requiredCourseKeysByUser={requiredCourseKeysByUser}
            reminderDays={reminderDays}
          />
        </CardContent>
      </Card>
    </>
  );
}
