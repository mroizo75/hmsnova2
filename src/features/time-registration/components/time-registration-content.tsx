"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { TimeRegistrationOverview } from "@/features/time-registration/components/time-registration-overview";
import { RegistrationFormUnified } from "@/features/time-registration/components/registration-form-unified";
import { ProjectsList } from "@/features/time-registration/components/projects-list";
import { ReportExportDropdown } from "@/features/time-registration/components/report-export-dropdown";
import { TimeRegistrationEnableCard } from "@/features/time-registration/components/time-registration-enable-card";
import { TimeRegistrationSettings } from "@/features/time-registration/components/time-registration-settings";
import { TimeRegistrationPayrollSettings } from "@/features/time-registration/components/time-registration-payroll-settings";
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
  const { data } = useQuery({
    queryKey: ["time-registration"],
    queryFn: () => fetchTimeRegistrationData(),
    initialData,
  });

  const { config, projects, enabled, overviewData, tenantId } = data;
  const activeProjects = projects.filter((p: any) => p.status === "ACTIVE");
  const selectedProject = selectedProjectId
    ? activeProjects.find((project: any) => project.id === selectedProjectId)
    : null;

  if (!enabled) {
    return (
      <>
        <div>
          <h1 className="text-3xl font-bold">Timeregistrering</h1>
          <p className="text-muted-foreground">
            Prosjekter, timer og kjøring – eksporter til Excel og PDF
          </p>
        </div>
        <TimeRegistrationEnableCard
          tenantId={tenantId}
          canEdit={role === "ADMIN"}
        />
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

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timeregistrering</h1>
          <p className="text-muted-foreground">
            Prosjekter, timer og kjøring – eksporter til Excel og PDF for regnskap
          </p>
        </div>
        <ReportExportDropdown />
      </div>

      {selectedProject ? (
        <div className="rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
          Timeregistrering er forhåndsvalgt for prosjekt: <strong>{selectedProject.name}</strong>
        </div>
      ) : null}

      {isAdmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prosjekter</CardTitle>
              <CardDescription>
                Admin kan opprette og redigere prosjekter. Ansatte registrerer timer og kjøring.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectsList tenantId={tenantId} projects={projects} />
            </CardContent>
          </Card>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registrer timer og kjøring
          </CardTitle>
          <CardDescription>
            Arbeid, reise, sykefravær og km godtgjørelse – én inngang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationFormUnified
            tenantId={tenantId}
            projects={activeProjects}
            initialProjectId={selectedProject?.id}
            lunchBreakMinutes={config?.lunchBreakMinutes ?? 30}
            eveningOvertimeFromHour={config?.eveningOvertimeFromHour ?? undefined}
            defaultKmRate={config?.defaultKmRate ?? 4.5}
            rateEditable={true}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Oversikt</CardTitle>
          <CardDescription>
            Alle registreringer – filter på periode, prosjekt og ansatt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeRegistrationOverview
            initialData={overviewData}
            tenantId={tenantId}
            isAdmin={isAdmin}
            initialProjectFilter={selectedProject?.id}
          />
        </CardContent>
      </Card>
    </>
  );
}
