"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfWeek, format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, History, Users, CheckSquare, Wallet } from "lucide-react";
import { WeekNavigation } from "./week-navigation";
import { WeekSummary } from "./week-summary";
import { WeekGrid } from "./week-grid";
import { AdminTeamOverview } from "./admin-team-overview";
import { TimeRegistrationOverview } from "./time-registration-overview";
import { ReportExportDropdown } from "./report-export-dropdown";
import { DayTimesheetScreen } from "./day-timesheet-screen";
import { TimesheetApprovalQueue } from "./timesheet-approval-queue";
import { TimeBankPanel } from "./timebank-panel";
import { ResourcePlanPanel } from "@/features/projects/components/resource-plan-panel";
import { getWeekEntries, getAllUsersWeekSummary } from "@/server/actions/time-registration.actions";
import { fetchTimeRegistrationData } from "@/server/queries/time-registration.queries";
import { useTranslations } from "next-intl";

type TimeRegData = Awaited<ReturnType<typeof fetchTimeRegistrationData>>;

interface TimeRegistrationContentProps {
  initialData: TimeRegData;
  isAdmin: boolean;
  role: string;
  selectedProjectId?: string;
}

export function TimeRegistrationContent({
  initialData,
  isAdmin,
  role,
  selectedProjectId,
}: TimeRegistrationContentProps) {
  const t = useTranslations("timesheet");
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1, locale: nb })
  );

  const { data } = useQuery({
    queryKey: ["time-registration"],
    queryFn: () => fetchTimeRegistrationData(),
    initialData,
  });

  const { data: weekData, refetch: refetchWeek } = useQuery({
    queryKey: ["time-registration-week", format(weekStart, "yyyy-MM-dd")],
    queryFn: () => getWeekEntries(format(weekStart, "yyyy-MM-dd")),
  });

  const canSeeTeam = ["ADMIN", "HMS", "LEDER"].includes(role);

  const { data: teamData, refetch: refetchTeam } = useQuery({
    queryKey: ["time-registration-team", format(weekStart, "yyyy-MM-dd")],
    queryFn: () => getAllUsersWeekSummary(format(weekStart, "yyyy-MM-dd")),
    enabled: canSeeTeam,
  });

  const { config, projects, enabled, overviewData, tenantId } = data;
  const activeProjects = projects.filter((p: any) => p.status === "ACTIVE");
  const dailyNorm = (config?.weeklyHoursNorm ?? 37.5) / 5;
  const isEmployee = role === "ANSATT";

  const handleEntryChanged = useCallback(() => {
    refetchWeek();
    if (canSeeTeam) refetchTeam();
    queryClient.invalidateQueries({ queryKey: ["time-registration"] });
  }, [refetchWeek, refetchTeam, canSeeTeam, queryClient]);

  if (!enabled) {
    return (
      <>
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{isEmployee ? t("subtitleEmployee") : t("subtitle")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("disabled.title")}</CardTitle>
            <CardDescription>{t("disabled.description")}</CardDescription>
          </CardHeader>
          {role === "ADMIN" && (
            <CardContent>
              <Link
                href="/dashboard/settings?tab=tripletex"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("disabled.link")}
              </Link>
            </CardContent>
          )}
        </Card>
      </>
    );
  }

  if (!overviewData) {
    return (
      <>
        <h1 className="text-3xl font-bold">Timeregistrering</h1>
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              Kunne ikke laste oversikt. Prøv igjen senere.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const weekEntries = weekData?.success ? weekData.data : null;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{isEmployee ? t("subtitleEmployee") : t("subtitle")}</p>
        </div>
        <ReportExportDropdown
          projects={activeProjects}
          employees={canSeeTeam && teamData?.success ? teamData.data?.users ?? [] : []}
          canFilterEmployees={canSeeTeam}
          initialProjectId={selectedProjectId}
        />
      </div>

      <Tabs defaultValue="day" className="space-y-4">
        <TabsList>
          <TabsTrigger value="day" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            {t("tabs.day")}
          </TabsTrigger>
          <TabsTrigger value="week" className="gap-1.5">
            {t("tabs.myWeek")}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            {t("tabs.history")}
          </TabsTrigger>
          {canSeeTeam && (
            <TabsTrigger value="approval" className="gap-1.5">
              <CheckSquare className="h-4 w-4" />
              {t("tabs.approval")}
            </TabsTrigger>
          )}
          {canSeeTeam && (
            <TabsTrigger value="plan" className="gap-1.5">
              <Users className="h-4 w-4" />
              {t("tabs.plan")}
            </TabsTrigger>
          )}
          <TabsTrigger value="timebank" className="gap-1.5">
            <Wallet className="h-4 w-4" />
            {t("tabs.timebank")}
          </TabsTrigger>
          {canSeeTeam && (
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="h-4 w-4" />
              {t("tabs.team")}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="day">
          <Suspense fallback={<p className="text-sm text-muted-foreground">{t("loading")}</p>}>
            <DayTimesheetScreen isEmployee={isEmployee} />
          </Suspense>
        </TabsContent>

        <TabsContent value="week" className="space-y-4">
          <WeekNavigation weekStart={weekStart} onWeekChange={setWeekStart} />
          <WeekSummary
            timeEntries={weekEntries?.timeEntries ?? []}
            mileageEntries={weekEntries?.mileageEntries ?? []}
            weeklyNorm={config?.weeklyHoursNorm ?? 37.5}
            defaultKmRate={config?.defaultKmRate ?? 4.5}
          />
          {(weekEntries?.assignments ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("assignedThisWeek")}</CardTitle>
                <CardDescription>{t("assignedThisWeekHelp")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {weekEntries!.assignments.map(
                  (a: {
                    id: string;
                    projectId: string;
                    plannedHours: number | null;
                    startDate: string;
                    endDate: string;
                    project: { name: string; clientName?: string | null };
                  }) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(`${a.startDate.slice(0, 10)}T12:00:00`).toLocaleDateString("nb-NO")}
                          {" – "}
                          {new Date(`${a.endDate.slice(0, 10)}T12:00:00`).toLocaleDateString("nb-NO")}
                          {a.project.clientName ? ` · ${a.project.clientName}` : ""}
                        </p>
                      </div>
                      {a.plannedHours != null ? (
                        <span className="text-sm text-muted-foreground shrink-0">
                          {a.plannedHours} t
                        </span>
                      ) : null}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          )}
          <WeekGrid
            weekStart={weekStart}
            timeEntries={weekEntries?.timeEntries ?? []}
            projects={
              weekEntries?.projects?.length
                ? weekEntries.projects
                : activeProjects.map((p: { id: string; name: string; code: string | null }) => ({
                    id: p.id,
                    name: p.name,
                    code: p.code,
                  }))
            }
            dailyNorm={dailyNorm}
            onEntryChanged={handleEntryChanged}
            pinnedProjectIds={(weekEntries?.assignments ?? []).map((a: { projectId: string }) => a.projectId)}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alle registreringer</CardTitle>
              <CardDescription>
                {isEmployee
                  ? t("historyOwn")
                  : "Filtrer på periode, prosjekt og ansatt – rediger eller slett"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimeRegistrationOverview
                initialData={overviewData}
                tenantId={tenantId}
                isAdmin={isAdmin}
                initialProjectFilter={selectedProjectId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {canSeeTeam && (
          <TabsContent value="approval">
            <TimesheetApprovalQueue />
          </TabsContent>
        )}

        {canSeeTeam && (
          <TabsContent value="plan">
            <ResourcePlanPanel />
          </TabsContent>
        )}

        <TabsContent value="timebank">
          <TimeBankPanel canManage={canSeeTeam} />
        </TabsContent>

        {canSeeTeam && (
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alle ansatte</CardTitle>
                <CardDescription>
                  Oversikt over registrerte timer denne uken – klikk en rad for detaljer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WeekNavigation weekStart={weekStart} onWeekChange={setWeekStart} />
                <div className="mt-4">
                  <AdminTeamOverview
                    weekStart={weekStart}
                    users={teamData?.success ? teamData.data?.users ?? [] : []}
                    projects={activeProjects}
                    dailyNorm={dailyNorm}
                    isAdmin={isAdmin}
                    onDataChanged={handleEntryChanged}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
