import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Calendar, MapPin, User, ClipboardList, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { enUS, nb } from "date-fns/locale";

export const dynamic = "force-dynamic";

function getStatusConfig(
  status: string,
  t: (key: string) => string
) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    PLANNED: {
      label: t("status.planned"),
      className: "bg-blue-100 text-blue-800",
      icon: <Clock className="h-3 w-3" />,
    },
    IN_PROGRESS: {
      label: t("status.inProgress"),
      className: "bg-yellow-100 text-yellow-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    COMPLETED: {
      label: t("status.completed"),
      className: "bg-green-100 text-green-800",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    CANCELLED: {
      label: t("status.cancelled"),
      className: "bg-gray-100 text-gray-600",
      icon: null,
    },
  };
  return map[status] || map.PLANNED;
}

export default async function AnsattVernerunderPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeInspectionsPage");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? enUS : nb;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  // Hent alle vernerunder der brukeren er ansvarlig eller deltaker (AML § 6-2 – verneombud og deltakelse)
  const inspections = await prisma.inspection.findMany({
    where: {
      tenantId,
      type: "VERNERUNDE",
      OR: [
        { conductedBy: userId },
        { participants: { contains: userId } },
      ],
    },
    include: {
      formTemplate: { select: { id: true, title: true } },
      formSubmission: { select: { id: true, status: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  // Hent navn på ansvarlig for alle inspeksjoner
  const conductedByIds = [...new Set(inspections.map((i) => i.conductedBy))];
  const conductedByUsers = await prisma.user.findMany({
    where: { id: { in: conductedByIds } },
    select: { id: true, name: true },
  });
  const conductedByMap = new Map(conductedByUsers.map((u) => [u.id, u.name]));

  const upcoming = inspections.filter(
    (i) => i.status === "PLANNED" || i.status === "IN_PROGRESS"
  );
  const completed = inspections.filter(
    (i) => i.status === "COMPLETED" || i.status === "CANCELLED"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-green-600" />
          {t("header.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("header.description")}
        </p>
      </div>

      {/* Kommende og pågående */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          {t("sections.upcoming")}
        </h2>
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="text-center py-10">
                <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {t("empty.upcoming")}
                </p>
              </CardContent>
            </Card>
          ) : (
            upcoming.map((inspection) => {
              const statusCfg = getStatusConfig(inspection.status, t);
              const isResponsible = inspection.conductedBy === userId;
              const canFill =
                inspection.formTemplate && !inspection.formSubmission;

              return (
                <Card key={inspection.id} className="border-l-4 border-l-blue-400">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{inspection.title}</h3>
                          <Badge className={`${statusCfg.className} flex items-center gap-1 text-xs`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </Badge>
                          {isResponsible && (
                            <Badge variant="outline" className="text-xs">
                              {t("labels.responsible")}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {format(new Date(inspection.scheduledDate), "EEEE d. MMMM yyyy", {
                                locale: dateLocale,
                              })}
                            </span>
                          </div>
                          {inspection.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span>{inspection.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {t("labels.responsibleWithName", {
                                name: conductedByMap.get(inspection.conductedBy) || t("labels.unknown"),
                              })}
                            </span>
                          </div>
                          {inspection.formTemplate && (
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                              <span>{inspection.formTemplate.title}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {canFill && isResponsible && (
                        <Link
                          href={`/ansatt/vernerunder/${inspection.id}/fill`}
                          className="shrink-0"
                        >
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            {t("actions.fillOut")}
                          </Button>
                        </Link>
                      )}
                    </div>

                    {inspection.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {inspection.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Fullførte */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {t("sections.previous")}
          </h2>
          <div className="space-y-3">
            {completed.map((inspection) => {
              const statusCfg = getStatusConfig(inspection.status, t);
              return (
                <Card key={inspection.id} className="opacity-80">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{inspection.title}</h3>
                          <Badge className={`${statusCfg.className} flex items-center gap-1 text-xs`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {format(new Date(inspection.scheduledDate), "d. MMMM yyyy", {
                                locale: dateLocale,
                              })}
                            </span>
                          </div>
                          {inspection.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span>{inspection.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {inspection.formSubmission && inspection.formTemplate && (
                        <Link
                          href={`/ansatt/vernerunder/${inspection.id}`}
                          className="shrink-0"
                        >
                          <Button size="sm" variant="outline">
                            {t("actions.viewReport")}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Info-boks */}
      <Card className="border-l-4 border-l-green-500 bg-green-50">
        <CardContent className="p-4">
          <p className="text-sm text-green-900">
            <strong>{t("info.title")}</strong> {t("info.description")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
