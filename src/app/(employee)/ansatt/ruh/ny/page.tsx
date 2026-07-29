import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileWarning } from "lucide-react";
import { ReportRuhForm } from "@/components/ansatt/report-ruh-form";
import { prisma } from "@/lib/db";
import { hasTenantFeature } from "@/lib/tenant-features";

export default async function NyRuh() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeRuhNewPage");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { industry: true, ruhModuleEnabled: true },
  });

  // Virksomheter som samler alt under Avvik skal ikke kunne registrere nye RUH
  if (tenant && !tenant.ruhModuleEnabled) {
    redirect("/ansatt/avvik/ny");
  }

  const isHealthcareTenant = hasTenantFeature(tenant?.industry, "helseforetak");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <FileWarning className="h-7 w-7 text-amber-600" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <Card className="border-l-4 border-l-red-500 bg-red-50">
        <CardContent className="p-4">
          <p className="text-sm text-red-900">
            <strong>{t("emergency.title")}</strong> {t("emergency.description")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportRuhForm
            tenantId={session.user.tenantId}
            reportedBy={session.user.name || session.user.email || t("employeeFallback")}
            isHealthcareTenant={isHealthcareTenant}
          />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("help.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>{t("help.reportAlways")}</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground ml-2">
              <li>{t("help.items.i1")}</li>
              <li>{t("help.items.i2")}</li>
              <li>{t("help.items.i3")}</li>
              <li>{t("help.items.i4")}</li>
              <li>{t("help.items.i5")}</li>
              <li>{t("help.items.i6")}</li>
              <li>{t("help.items.i7")}</li>
            </ul>
          </div>

          <div className="pt-2">
            <strong>{t("help.remember")}</strong>
            <p className="text-muted-foreground mt-1">
              {t("help.rememberDescription")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
