import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, FlaskConical, AlertTriangle, Info, Download } from "lucide-react";
import Link from "next/link";
import { ProfileForm } from "@/components/ansatt/profile-form";

const EXPOSURE_TYPE_KEYS: Record<string, string> = {
  INHALATION: "exposure.types.INHALATION",
  SKIN: "exposure.types.SKIN",
  NOISE: "exposure.types.NOISE",
  VIBRATION: "exposure.types.VIBRATION",
  BIOLOGICAL: "exposure.types.BIOLOGICAL",
  RADIATION: "exposure.types.RADIATION",
  OTHER: "exposure.types.OTHER",
};

export default async function AnsattProfil() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeProfilePage");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "nb-NO";

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, exposureEntries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        tenants: {
          include: {
            tenant: { select: { name: true } },
          },
          select: {
            id: true,
            role: true,
            department: true,
            employeeNumber: true,
            tenant: { select: { name: true } },
          },
        },
      },
    }),
    prisma.exposureRegister.findMany({
      where: {
        employeeId: session.user.id,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        exposureAgent: true,
        exposureType: true,
        exposureStartDate: true,
        exposureEndDate: true,
        ppeUsed: true,
        healthCheckRequired: true,
        healthCheckDone: true,
        healthCheckDate: true,
        retentionUntilDate: true,
        status: true,
        chemical: { select: { productName: true, casNumber: true } },
      },
      orderBy: { exposureStartDate: "desc" },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <User className="h-7 w-7 text-primary" />
          {t("header.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("header.description")}
        </p>
      </div>

      {/* Profilbilde og info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profileInfo.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      {/* Bedriftsinformasjon */}
      <Card>
        <CardHeader>
          <CardTitle>{t("companyInfo.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {user.tenants.map((ut) => (
              <div key={ut.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="space-y-0.5">
                  <p className="font-medium">{ut.tenant.name}</p>
                  <p className="text-sm text-muted-foreground">{t("companyInfo.role", { role: ut.role })}</p>
                  {ut.department && (
                    <p className="text-xs text-muted-foreground">{t("companyInfo.department", { department: ut.department })}</p>
                  )}
                  {ut.employeeNumber && (
                    <p className="text-xs text-muted-foreground">
                      {t("companyInfo.employeeNumber")}{" "}
                      <span className="font-mono font-medium text-foreground">{ut.employeeNumber}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Eksponeringsregister */}
      <Card className={exposureEntries.length > 0 ? "border-orange-200" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FlaskConical className={`h-5 w-5 ${exposureEntries.length > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
              <div>
                <CardTitle className="text-base">{t("exposure.title")}</CardTitle>
                <CardDescription>
                  {t("exposure.subtitle")}
                </CardDescription>
              </div>
            </div>
            {exposureEntries.length > 0 && (
              <Link href="/api/exposure-register/my-exposure/pdf" target="_blank">
                <Button size="sm" variant="outline" className="gap-2 border-orange-300 text-orange-800 hover:bg-orange-50">
                  <Download className="h-4 w-4" />
                  {t("exposure.downloadPdf")}
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {exposureEntries.length === 0 ? (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {t("exposure.empty")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-800">
                  {t("exposure.warning", {
                    year: Math.max(...exposureEntries.map((e) => e.retentionUntilDate.getFullYear())),
                  })}
                </p>
              </div>

              <div className="space-y-3">
                {exposureEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 bg-white space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium text-sm">
                          {entry.chemical?.productName ?? entry.exposureAgent}
                        </p>
                        {entry.chemical?.casNumber && (
                          <p className="text-xs text-muted-foreground font-mono">
                            CAS: {entry.chemical.casNumber}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          entry.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }
                      >
                        {entry.status === "ACTIVE" ? t("exposure.status.active") : t("exposure.status.closed")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {t("exposure.labels.type")}{" "}
                        <span className="text-foreground">
                          {EXPOSURE_TYPE_KEYS[entry.exposureType]
                            ? t(EXPOSURE_TYPE_KEYS[entry.exposureType])
                            : entry.exposureType}
                        </span>
                      </span>
                      <span>
                        {t("exposure.labels.from")}{" "}
                        <span className="text-foreground">
                          {entry.exposureStartDate.toLocaleDateString(dateLocale)}
                        </span>
                      </span>
                      {entry.exposureEndDate && (
                        <span>
                          {t("exposure.labels.to")}{" "}
                          <span className="text-foreground">
                            {entry.exposureEndDate.toLocaleDateString(dateLocale)}
                          </span>
                        </span>
                      )}
                      {entry.ppeUsed && (
                        <span className="col-span-2">
                          {t("exposure.labels.ppe")} <span className="text-foreground">{entry.ppeUsed}</span>
                        </span>
                      )}
                    </div>

                    {entry.healthCheckRequired && (
                      <div
                        className={`text-xs rounded px-2 py-1 ${
                          entry.healthCheckDone
                            ? "bg-green-50 text-green-800"
                            : "bg-yellow-50 text-yellow-800"
                        }`}
                      >
                        {entry.healthCheckDone
                          ? t("exposure.healthCheck.done", {
                              date: entry.healthCheckDate
                                ? `: ${entry.healthCheckDate.toLocaleDateString(dateLocale)}`
                                : "",
                            })
                          : t("exposure.healthCheck.pending")}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {t("exposure.labels.retentionUntil")} {entry.retentionUntilDate.toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                {t("exposure.footer")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

