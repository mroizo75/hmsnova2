import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Shield, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import {
  EMPLOYEE_WIDGET_REGISTRY,
  getEmployeeWidgetsFromLockedConfig,
  type EmployeeWidgetDefinition,
} from "@/features/dashboard/lib/employee-widget-registry";

export default async function AnsattDashboard() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeDashboard");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      hmsContactName: true,
      hmsContactPhone: true,
      hmsContactEmail: true,
      timeRegistrationEnabled: true,
      industry: true,
      dashboardLocked: true,
      lockedDashboardConfig: true,
      ruhModuleEnabled: true,
    },
  });
  const isAgricultureTenant = tenant?.industry?.toLowerCase() === "agriculture";
  const tenantName = session.user.tenantName;

  let visibleWidgets: EmployeeWidgetDefinition[];
  if (tenant?.dashboardLocked && tenant.lockedDashboardConfig) {
    const lockedConfig = tenant.lockedDashboardConfig as Array<{ id: string }>;
    visibleWidgets = getEmployeeWidgetsFromLockedConfig(lockedConfig);
  } else {
    visibleWidgets = [...EMPLOYEE_WIDGET_REGISTRY];
  }

  if (!tenant?.timeRegistrationEnabled) {
    visibleWidgets = visibleWidgets.filter((w) => w.id !== "emp-time");
  }

  if (tenant && !tenant.ruhModuleEnabled) {
    visibleWidgets = visibleWidgets.filter((w) => w.id !== "emp-ruh");
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t("welcome.title", { name: session.user.name?.split(" ")[0] ?? "" })}
        </h2>
        <p className="text-gray-600">
          {t("welcome.subtitle")}
        </p>
        {tenantName && (
          <div className="mt-3 pt-3 border-t border-gray-200 lg:hidden">
            <p className="text-sm text-gray-500">
              <span className="font-medium">{tenantName}</span>
            </p>
          </div>
        )}
      </div>

      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-lg">{t("alerts.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {isAgricultureTenant
              ? t("alerts.agricultureMessage")
              : t("alerts.defaultMessage")}
          </p>
        </CardContent>
      </Card>

      {isAgricultureTenant && (
        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("agricultureQuickStart.title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link href="/ansatt/avvik/ny" className="rounded-lg border p-3 hover:bg-muted">
              <p className="font-medium">{t("agricultureQuickStart.cards.incident.title")}</p>
              <p className="text-xs text-muted-foreground">{t("agricultureQuickStart.cards.incident.description")}</p>
            </Link>
            <Link href="/ansatt/vernerunder" className="rounded-lg border p-3 hover:bg-muted">
              <p className="font-medium">{t("agricultureQuickStart.cards.inspection.title")}</p>
              <p className="text-xs text-muted-foreground">{t("agricultureQuickStart.cards.inspection.description")}</p>
            </Link>
            <Link href="/ansatt/sja" className="rounded-lg border p-3 hover:bg-muted">
              <p className="font-medium">{t("agricultureQuickStart.cards.sja.title")}</p>
              <p className="text-xs text-muted-foreground">{t("agricultureQuickStart.cards.sja.description")}</p>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        {visibleWidgets.map((widget) => (
          <Link key={widget.id} href={widget.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className={`h-16 w-16 rounded-full ${widget.bgColor} flex items-center justify-center mb-3`}>
                  <widget.icon className={`h-8 w-8 ${widget.color}`} />
                </div>
                <h3 className="font-semibold text-lg mb-1">{widget.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {widget.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("tasks.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <div>
                  <p className="font-medium text-sm">{t("tasks.item.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("tasks.item.deadline")}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white">
                {t("tasks.item.status")}
              </Badge>
            </div>

            <div className="text-center py-4 text-sm text-muted-foreground">
              {t("tasks.empty")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-red-600">{t("emergency.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">{t("emergency.fire")}</span>
            <a href="tel:110" className="text-red-600 font-bold text-lg">110</a>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">{t("emergency.police")}</span>
            <a href="tel:112" className="text-red-600 font-bold text-lg">112</a>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">{t("emergency.ambulance")}</span>
            <a href="tel:113" className="text-red-600 font-bold text-lg">113</a>
          </div>
          {tenant?.hmsContactName && (
            <div className="border-t pt-2 mt-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-medium">{t("emergency.hmsResponsible")}</span>
                <span className="text-primary font-medium">{tenant.hmsContactName}</span>
              </div>
              {tenant.hmsContactPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("emergency.phone")}</span>
                  <a href={`tel:${tenant.hmsContactPhone}`} className="text-primary font-bold">
                    {tenant.hmsContactPhone}
                  </a>
                </div>
              )}
              {tenant.hmsContactEmail && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("emergency.email")}</span>
                  <a href={`mailto:${tenant.hmsContactEmail}`} className="text-primary text-sm">
                    {tenant.hmsContactEmail}
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
