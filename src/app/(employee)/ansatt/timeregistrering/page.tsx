import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Car, ArrowLeft } from "lucide-react";
import {
  getProjects,
  getTimeRegistrationOverview,
  getTimeRegistrationConfig,
} from "@/server/actions/time-registration.actions";
import { TimeRegistrationOverview } from "@/features/time-registration/components/time-registration-overview";
import { RegistrationFormUnified } from "@/features/time-registration/components/registration-form-unified";

export default async function AnsattTimeregistreringPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const [configRes, projectsRes] = await Promise.all([
    getTimeRegistrationConfig(tenantId),
    getProjects(tenantId, true),
  ]);

  const config = configRes.success ? configRes.data : null;
  const projects = projectsRes.success ? projectsRes.data : [];
  const activeProjects = projects.filter((p) => p.status === "ACTIVE");

  const enabled = config?.timeRegistrationEnabled ?? false;

  if (!enabled) {
    return (
      <div className="space-y-6">
        <Link
          href="/ansatt"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbake
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Timeføring er ikke aktivert</h2>
            <p className="text-sm text-muted-foreground">
              Kontakt din leder eller administrator for å aktivere timeregistrering for bedriften.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overviewRes = await getTimeRegistrationOverview(tenantId, {
    period: "month",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    userId,
  });

  const overviewData = overviewRes.success ? overviewRes.data : null;

  if (!overviewData) {
    return (
      <div className="space-y-6">
        <Link
          href="/ansatt"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbake
        </Link>
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
      <Link
        href="/ansatt"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbake til oversikt
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Timeføring</h1>
        <p className="text-muted-foreground">
          Registrer timer og km godtgjørelse per prosjekt
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registrer timer og kjøring
          </CardTitle>
          <CardDescription>
            Arbeid, reise, sykefravær og km godtgjørelse – ordinær og overtid beregnes automatisk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationFormUnified
            tenantId={tenantId}
            projects={activeProjects}
            lunchBreakMinutes={config?.lunchBreakMinutes ?? 30}
            eveningOvertimeFromHour={config?.eveningOvertimeFromHour ?? undefined}
            defaultKmRate={config?.defaultKmRate ?? 4.5}
            rateEditable={false}
            showDisclaimer={true}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mine registreringer</CardTitle>
          <CardDescription>
            Ordinære timer og overtid for gjeldende måned – oversikt for lønn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeRegistrationOverview
            initialData={overviewData}
            tenantId={tenantId}
            isAdmin={false}
            restrictToUserId={userId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
