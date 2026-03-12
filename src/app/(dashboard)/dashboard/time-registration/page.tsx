import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import {
  getProjects,
  getTimeRegistrationOverview,
  getTimeRegistrationConfig,
} from "@/server/actions/time-registration.actions";
import { TimeRegistrationOverview } from "@/features/time-registration/components/time-registration-overview";
import { RegistrationFormUnified } from "@/features/time-registration/components/registration-form-unified";
import { ProjectsList } from "@/features/time-registration/components/projects-list";
import { ReportExportDropdown } from "@/features/time-registration/components/report-export-dropdown";
import { TimeRegistrationEnableCard } from "@/features/time-registration/components/time-registration-enable-card";
import { TimeRegistrationSettings } from "@/features/time-registration/components/time-registration-settings";
import { TimeRegistrationPayrollSettings } from "@/features/time-registration/components/time-registration-payroll-settings";

interface TimeRegistrationPageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function TimeRegistrationPage({ searchParams }: TimeRegistrationPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const permissions = getPermissions(session.user.role!);

  if (!permissions.canAccessTimeRegistration) {
    redirect("/dashboard");
  }

  const tenantId = session.user.tenantId;
  const role = session.user.role!;
  const isAdmin = ["ADMIN", "HMS", "LEDER"].includes(role);

  const [configRes, projectsRes] = await Promise.all([
    getTimeRegistrationConfig(tenantId),
    getProjects(tenantId, false),
  ]);
  const { projectId } = await searchParams;

  const config = configRes.success ? configRes.data : null;
  const projects = projectsRes.success ? projectsRes.data : [];
  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const selectedProject = projectId ? activeProjects.find((project) => project.id === projectId) : null;

  const enabled = config?.timeRegistrationEnabled ?? false;

  if (!enabled) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  const overviewRes = await getTimeRegistrationOverview(tenantId, {
    period: "month",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const overviewData = overviewRes.success ? overviewRes.data : null;

  if (!overviewData) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Timeregistrering</h1>
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              Kunne ikke laste oversikt. Prøv igjen senere.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              <ProjectsList
                tenantId={tenantId}
                projects={projects}
              />
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
    </div>
  );
}
