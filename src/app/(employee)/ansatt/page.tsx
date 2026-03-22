import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileText, AlertCircle, Beaker, GraduationCap, Shield, Bell, ClipboardList, ShieldAlert, Clock, FileWarning, HardHat, BookOpenCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

export default async function AnsattDashboard() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeDashboard");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  // Hent tenant settings for HMS-kontakt og timeregistrering
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      hmsContactName: true,
      hmsContactPhone: true,
      hmsContactEmail: true,
      timeRegistrationEnabled: true,
      industry: true,
    },
  });
  const isAgricultureTenant = tenant?.industry?.toLowerCase() === "agriculture";

  // Hent tenant-navn fra session
  const tenantName = session.user.tenantName;

  return (
    <div className="space-y-6">
      {/* Velkommen-melding - Ren og profesjonell */}
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

      {/* Viktige varsler */}
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

      {/* Hovedfunksjoner - Store, touch-vennlige knapper */}
      <div className="grid grid-cols-2 gap-4">
        {/* Dokumenter */}
        <Link href="/ansatt/dokumenter">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{t("cards.documents.title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("cards.documents.description")}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Rapporter avvik */}
        <Link href="/ansatt/avvik/ny">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-destructive">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {isAgricultureTenant ? t("cards.report.agricultureTitle") : t("cards.report.defaultTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isAgricultureTenant ? t("cards.report.agricultureDescription") : t("cards.report.defaultDescription")}
              </p>
              <Badge variant="destructive" className="mt-2 text-xs">
                {t("cards.report.badge")}
              </Badge>
            </CardContent>
          </Card>
        </Link>

        {/* Rutiner */}
        <Link href="/ansatt/rutiner">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-emerald-500">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <BookOpenCheck className="h-8 w-8 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{t("cards.routines.title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("cards.routines.description")}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* RUH */}
        <Link href="/ansatt/ruh/ny">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-amber-500">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <FileWarning className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">RUH</h3>
              <p className="text-xs text-muted-foreground">
                {isAgricultureTenant ? t("cards.ruh.agricultureDescription") : t("cards.ruh.defaultDescription")}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* SJA */}
        <Link href="/ansatt/sja">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-orange-500">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                <HardHat className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">SJA</h3>
              <p className="text-xs text-muted-foreground">
                {isAgricultureTenant ? t("cards.sja.agricultureDescription") : t("cards.sja.defaultDescription")}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Stoffkartotek */}
        <Link href="/ansatt/stoffkartotek">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-accent">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                <Beaker className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{t("cards.chemicals.title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("cards.chemicals.description")}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Opplæring */}
        <Link href="/ansatt/opplaering">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <GraduationCap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{t("cards.training.title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("cards.training.description")}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Skjemaer */}
        <Link href="/ansatt/skjemaer">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <ClipboardList className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{t("cards.forms.title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("cards.forms.description")}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Varsling */}
        <Link href="/ansatt/varsling">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-orange-500">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                <ShieldAlert className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{t("cards.whistleblowing.title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("cards.whistleblowing.description")}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Timeføring - kun når aktivert for bedriften */}
        {tenant?.timeRegistrationEnabled && (
          <Link href="/ansatt/timeregistrering">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <Clock className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{t("cards.timeRegistration.title")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("cards.timeRegistration.description")}
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Mine oppgaver */}
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

      {/* Nødkontakter */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-red-600">{t("emergency.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">{t("emergency.fire")}</span>
            <a href="tel:110" className="text-red-600 font-bold text-lg">
              110
            </a>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">{t("emergency.police")}</span>
            <a href="tel:112" className="text-red-600 font-bold text-lg">
              112
            </a>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">{t("emergency.ambulance")}</span>
            <a href="tel:113" className="text-red-600 font-bold text-lg">
              113
            </a>
          </div>
          {tenant?.hmsContactName && (
            <div className="border-t pt-2 mt-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-medium">{t("emergency.hmsResponsible")}</span>
                <span className="text-primary font-medium">
                  {tenant.hmsContactName}
                </span>
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

