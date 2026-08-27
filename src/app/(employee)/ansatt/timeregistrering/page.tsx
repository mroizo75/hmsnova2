import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ArrowLeft } from "lucide-react";
import {
  getTimeRegistrationConfig,
} from "@/server/actions/time-registration.actions";
import { fetchTimeRegistrationData } from "@/server/queries/time-registration.queries";
import { TimeRegistrationContent } from "@/features/time-registration/components/time-registration-content";

export default async function AnsattTimeregistreringPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeTimeRegistrationPage");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const tenantId = session.user.tenantId;

  const configRes = await getTimeRegistrationConfig(tenantId);
  const config = configRes.success ? configRes.data : null;
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

  const initialData = await fetchTimeRegistrationData();

  return (
    <div className="space-y-6">
      <Link
        href="/ansatt"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToOverview")}
      </Link>

      <TimeRegistrationContent
        initialData={initialData}
        isAdmin={false}
        role="ANSATT"
      />
    </div>
  );
}
