import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileWarning, Plus, Clock, CheckCircle, Search } from "lucide-react";
import Link from "next/link";
import { RuhCategory } from "@prisma/client";

export default async function AnsattRuh() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeRuhPage");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "nb-NO";

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const myReports = await prisma.ruhReport.findMany({
    where: {
      tenantId: session.user.tenantId,
      reportedById: session.user.id,
    },
    orderBy: {
      occurredAt: "desc",
    },
    take: 50,
  });

  const submittedCount = myReports.filter((r) => r.status === "SUBMITTED").length;
  const underReviewCount = myReports.filter((r) => r.status === "UNDER_REVIEW").length;
  const completedCount = myReports.filter((r) => r.status === "COMPLETED").length;

  const getCategoryLabel = (category: RuhCategory): string => {
    switch (category) {
      case "PERSONSKADE":
        return t("categories.PERSONSKADE");
      case "NESTENULYKKE":
        return t("categories.NESTENULYKKE");
      case "MATERIELL_SKADE":
        return t("categories.MATERIELL_SKADE");
      case "BRANN_EKSPLOSJON":
        return t("categories.BRANN_EKSPLOSJON");
      case "UTSLIPP_MILJO":
        return t("categories.UTSLIPP_MILJO");
      case "TRUSLER_VOLD":
        return t("categories.TRUSLER_VOLD");
      case "ERGONOMI":
        return t("categories.ERGONOMI");
      case "ANNET":
        return t("categories.ANNET");
      default:
        return t("categories.ANNET");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <FileWarning className="h-7 w-7 text-amber-600" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Link href="/ansatt/ruh/ny">
          <Button size="lg" className="h-12">
            <Plus className="h-5 w-5 mr-2" />
            {t("newReport")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("stats.submitted")}</p>
                <p className="text-2xl font-bold">{submittedCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("stats.underReview")}</p>
                <p className="text-2xl font-bold">{underReviewCount}</p>
              </div>
              <Search className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("stats.completed")}</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>{t("info.title")}</strong> {t("info.description")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("reports.title", { count: myReports.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {myReports.length === 0 ? (
            <div className="text-center py-12">
              <FileWarning className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("reports.empty.title")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("reports.empty.description")}
              </p>
              <Link href="/ansatt/ruh/ny">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("reports.empty.cta")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myReports.map((report) => {
                let statusBadge;
                switch (report.status) {
                  case "SUBMITTED":
                    statusBadge = (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        {t("status.submitted")}
                      </Badge>
                    );
                    break;
                  case "UNDER_REVIEW":
                    statusBadge = (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {t("status.underReview")}
                      </Badge>
                    );
                    break;
                  case "COMPLETED":
                    statusBadge = (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        {t("status.completed")}
                      </Badge>
                    );
                    break;
                }

                return (
                  <div
                    key={report.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {report.ruhNummer && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {report.ruhNummer}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold mb-2 truncate">{report.title}</h3>

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {statusBadge}
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(report.category)}
                          </Badge>
                          {report.injuryOccurred && (
                            <Badge variant="destructive" className="text-xs">
                              {t("injuryOccurred")}
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                          {report.location && <p>{t("location", { location: report.location })}</p>}
                          <p>
                            {t("occurredAtLabel")}{" "}
                            {new Date(report.occurredAt).toLocaleDateString(dateLocale, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {report.description}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {report.status === "COMPLETED" ? (
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                        ) : report.status === "UNDER_REVIEW" ? (
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Search className="h-5 w-5 text-blue-600" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-yellow-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
