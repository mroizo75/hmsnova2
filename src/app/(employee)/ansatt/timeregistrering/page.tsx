import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("employeeTimeRegistrationPage");

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
          {t("back")}
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t("disabled.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("disabled.description")}
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
          {t("back")}
        </Link>
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              {t("loadError")}
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
        {t("backToOverview")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("form.title")}
          </CardTitle>
          <CardDescription>
            {t("form.description")}
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
          <CardTitle>{t("overview.title")}</CardTitle>
          <CardDescription>
            {t("overview.description")}
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
