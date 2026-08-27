"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfWeek } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, History, Settings2, Car, HeartPulse, MapPin, Users, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeekNavigation } from "./week-navigation";
import { WeekGrid } from "./week-grid";
import { WeekSummary } from "./week-summary";
import { AdminTeamOverview } from "./admin-team-overview";
import { TimeRegistrationOverview } from "./time-registration-overview";
import { RegistrationFormUnified } from "./registration-form-unified";
import { ProjectsList } from "./projects-list";
import { ReportExportDropdown } from "./report-export-dropdown";
import { TimeRegistrationEnableCard } from "./time-registration-enable-card";
import { TimeRegistrationBasicSettings } from "./time-registration-basic-settings";
import { TimeRegistrationSettings } from "./time-registration-settings";
import { TimeRegistrationPayrollSettings } from "./time-registration-payroll-settings";
import { MileageEntryForm } from "./mileage-entry-form";
import { TimeEntryForm } from "./time-entry-form";
import { getWeekEntries, getAllUsersWeekSummary } from "@/server/actions/time-registration.actions";
import { fetchTimeRegistrationData } from "@/server/queries/time-registration.queries";

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
    queryKey: ["time-registration-week", weekStart.toISOString()],
    queryFn: () => getWeekEntries(weekStart.toISOString()),
  });

  const canSeeTeam = ["ADMIN", "HMS", "LEDER"].includes(role);

  const { data: teamData, refetch: refetchTeam } = useQuery({
    queryKey: ["time-registration-team", weekStart.toISOString()],
    queryFn: () => getAllUsersWeekSummary(weekStart.toISOString()),
    enabled: canSeeTeam,
  });

  const { config, projects, enabled, overviewData, tenantId } = data;
  const activeProjects = projects.filter((p: any) => p.status === "ACTIVE");
  const dailyNorm = (config?.weeklyHoursNorm ?? 37.5) / 5;

  const handleEntryChanged = useCallback(() => {
    refetchWeek();
    if (canSeeTeam) refetchTeam();
    queryClient.invalidateQueries({ queryKey: ["time-registration"] });
  }, [refetchWeek, refetchTeam, canSeeTeam, queryClient]);

  if (!enabled) {
    return (
      <>
        <div>
          <h1 className="text-3xl font-bold">Timeregistrering</h1>
          <p className="text-muted-foreground">
            Prosjekter, timer og kjøring – eksporter til Excel og PDF
          </p>
        </div>
        <TimeRegistrationEnableCard tenantId={tenantId} canEdit={role === "ADMIN"} />
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
          <h1 className="text-3xl font-bold">Timeregistrering</h1>
          <p className="text-muted-foreground">
            Registrer timer direkte i ukegridet – klikk en celle for å fylle inn
          </p>
        </div>
        <ReportExportDropdown />
      </div>

      <Tabs defaultValue="week" className="space-y-4">
        <TabsList>
          <TabsTrigger value="week" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            Ukevisning
          </TabsTrigger>
          <TabsTrigger value="extras" className="gap-1.5">
            <Car className="h-4 w-4" />
            Reise / Fravær
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            Historikk
          </TabsTrigger>
          {canSeeTeam && (
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings2 className="h-4 w-4" />
              Innstillinger
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="week" className="space-y-4">
          <div className="flex items-center justify-between">
            <WeekNavigation weekStart={weekStart} onWeekChange={setWeekStart} />
          </div>

          <WeekGrid
            weekStart={weekStart}
            timeEntries={weekEntries?.timeEntries ?? []}
            projects={activeProjects}
            dailyNorm={dailyNorm}
            onEntryChanged={handleEntryChanged}
          />

          <WeekSummary
            timeEntries={weekEntries?.timeEntries ?? []}
            mileageEntries={weekEntries?.mileageEntries ?? []}
            weeklyNorm={config?.weeklyHoursNorm ?? 37.5}
            defaultKmRate={config?.defaultKmRate ?? 4.5}
          />
        </TabsContent>

        <TabsContent value="extras" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reise, sykefravær og km godtgjørelse</CardTitle>
              <CardDescription>
                Registrer reisetid, sykefravær eller km separat fra arbeidstimer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="travel">
                <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
                  <TabsTrigger value="travel" className="gap-1.5 text-xs">
                    <Car className="h-3.5 w-3.5" />
                    Reise
                  </TabsTrigger>
                  <TabsTrigger value="sick" className="gap-1.5 text-xs">
                    <HeartPulse className="h-3.5 w-3.5" />
                    Sykefravær
                  </TabsTrigger>
                  <TabsTrigger value="km" className="gap-1.5 text-xs">
                    <MapPin className="h-3.5 w-3.5" />
                    Km godtgjørelse
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="travel">
                  <TimeEntryForm
                    tenantId={tenantId}
                    projects={activeProjects}
                    lunchBreakMinutes={config?.lunchBreakMinutes ?? 30}
                    forceMode="travel"
                  />
                </TabsContent>
                <TabsContent value="sick">
                  <TimeEntryForm
                    tenantId={tenantId}
                    projects={activeProjects}
                    lunchBreakMinutes={config?.lunchBreakMinutes ?? 30}
                    forceMode="sick"
                  />
                </TabsContent>
                <TabsContent value="km">
                  <MileageEntryForm
                    tenantId={tenantId}
                    projects={activeProjects}
                    defaultKmRate={config?.defaultKmRate ?? 4.5}
                    rateEditable={true}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alle registreringer</CardTitle>
              <CardDescription>
                Filtrer på periode, prosjekt og ansatt – rediger eller slett
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

        {isAdmin && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prosjekter</CardTitle>
                <CardDescription>
                  Opprett og rediger prosjekter som ansatte kan registrere timer på
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectsList tenantId={tenantId} projects={projects} />
              </CardContent>
            </Card>

            <TimeRegistrationBasicSettings
              tenantId={tenantId}
              weeklyHoursNorm={config?.weeklyHoursNorm ?? 37.5}
              defaultKmRate={config?.defaultKmRate ?? null}
            />

            <AdvancedSettingsSection
              tenantId={tenantId}
              config={config}
            />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

function AdvancedSettingsSection({
  tenantId,
  config,
}: {
  tenantId: string;
  config: any;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Vis avanserte regler
      </Button>
      {!showAdvanced && (
        <p className="text-xs text-muted-foreground -mt-2 ml-8">
          Overtidsberegning og lønnsestimater – de fleste sender timelisten til regnskap og trenger ikke dette.
        </p>
      )}
      {showAdvanced && (
        <>
          <TimeRegistrationSettings
            tenantId={tenantId}
            weeklyHoursNorm={config?.weeklyHoursNorm ?? 37.5}
            lunchBreakMinutes={config?.lunchBreakMinutes ?? 30}
            eveningOvertimeFromHour={config?.eveningOvertimeFromHour ?? null}
            useOvertime40Percent={config?.useOvertime40Percent ?? false}
            saturdayOvertime40LimitHours={config?.saturdayOvertime40LimitHours ?? null}
          />

          <TimeRegistrationPayrollSettings
            tenantId={tenantId}
            defaultHourlyRate={config?.defaultHourlyRate ?? null}
            approximateTaxPercent={config?.approximateTaxPercent ?? null}
            defaultKmRate={config?.defaultKmRate ?? null}
            kmAllowanceTaxable={config?.kmAllowanceTaxable ?? false}
          />
        </>
      )}
    </div>
  );
}
