import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { getIncidentStatusLabel } from "@/features/incidents/schemas/incident.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import type { IncidentType } from "@prisma/client";

const TYPE_LABEL_KEYS: Record<IncidentType, string> = {
  AVVIK: "type.AVVIK",
  HMS: "type.HMS",
  NESTEN: "type.NESTEN",
  ULYKKE: "type.ULYKKE",
  SKADE: "type.SKADE",
  FARLIG_SITUASJON: "type.FARLIG_SITUASJON",
  YRKESSYKDOM: "type.YRKESSYKDOM",
  MILJO: "type.MILJO",
  KVALITET: "type.KVALITET",
  CUSTOMER: "type.CUSTOMER",
};

export default async function AnsattAvvik() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeIncidentsPage");
  const locale = await getLocale();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  // Hent ansattes egne avviksrapporter
  const myIncidents = await prisma.incident.findMany({
    where: {
      tenantId: session.user.tenantId,
      reportedBy: session.user.name || session.user.email || "Ansatt",
    },
    orderBy: {
      occurredAt: "desc",
    },
    take: 50, // Siste 50 rapporter
  });

  const resolveStage = (incident: (typeof myIncidents)[number]) => {
    if (incident.stage) {
      return incident.stage;
    }
    // Fallback for eldre data som ikke har stage
    if (incident.status === "CLOSED") {
      return "VERIFIED";
    }
    if (incident.status === "INVESTIGATING" || incident.status === "ACTION_TAKEN") {
      return "UNDER_REVIEW";
    }
    return "REPORTED";
  };

  const openCount = myIncidents.filter((i) => {
    const stage = resolveStage(i);
    return stage === "REPORTED" || stage === "UNDER_REVIEW";
  }).length;

  const investigatingCount = myIncidents.filter((i) => {
    const stage = resolveStage(i);
    return stage === "ROOT_CAUSE" || stage === "ACTIONS_DEFINED" || stage === "ACTIONS_COMPLETE";
  }).length;

  const closedCount = myIncidents.filter((i) => {
    const stage = resolveStage(i);
    return stage === "VERIFIED" || i.status === "CLOSED";
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <AlertCircle className="h-7 w-7 text-red-600" />
            {t("header.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("header.description")}
          </p>
        </div>
        <Link href="/ansatt/avvik/ny">
          <Button size="lg" className="h-12">
            <Plus className="h-5 w-5 mr-2" />
            {t("header.newReport")}
          </Button>
        </Link>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("stats.reported")}</p>
                <p className="text-2xl font-bold">{openCount}</p>
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
                <p className="text-2xl font-bold">{investigatingCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("stats.closed")}</p>
                <p className="text-2xl font-bold">{closedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hjelp-melding */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>{t("tip.title")}</strong> {t("tip.description")}
          </p>
        </CardContent>
      </Card>

      {/* Avviksliste */}
      <Card>
        <CardHeader>
          <CardTitle>{t("list.title", { count: myIncidents.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {myIncidents.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("list.emptyTitle")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("list.emptyDescription")}
              </p>
              <Link href="/ansatt/avvik/ny">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("list.emptyCta")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myIncidents.map((incident) => {
                const stage = resolveStage(incident);
                let statusBadge;
                switch (stage) {
                  case "REPORTED":
                    statusBadge = (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        {t("badges.reported")}
                      </Badge>
                    );
                    break;
                  case "UNDER_REVIEW":
                  case "ROOT_CAUSE":
                    statusBadge = (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {t("badges.underReview")}
                      </Badge>
                    );
                    break;
                  case "ACTIONS_DEFINED":
                  case "ACTIONS_COMPLETE":
                    statusBadge = (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
                        {t("badges.actions")}
                      </Badge>
                    );
                    break;
                  case "VERIFIED":
                    statusBadge = (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        {t("badges.closed")}
                      </Badge>
                    );
                    break;
                  default:
                    statusBadge = (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                        📋 {getIncidentStatusLabel(incident.status)}
                      </Badge>
                    );
                }

                // Type badge
                const typeBadge = t(TYPE_LABEL_KEYS[incident.type] ?? "type.AVVIK");

                // Severity badge. Null = leder har ikke vurdert grad ennå
                let severityColor = "bg-slate-100 text-slate-700";
                if (incident.severity !== null) {
                  if (incident.severity >= 4) {
                    severityColor = "bg-red-100 text-red-700";
                  } else if (incident.severity === 3) {
                    severityColor = "bg-yellow-100 text-yellow-700";
                  } else {
                    severityColor = "bg-green-100 text-green-700";
                  }
                }
                const severityBadgeText =
                  incident.severity === null
                    ? t("badges.severityNotAssessed")
                    : t("badges.severity", { severity: incident.severity });

                return (
                  <div
                    key={incident.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Tittel */}
                        <h3 className="font-semibold mb-2 truncate">{incident.title}</h3>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {statusBadge}
                          <Badge variant="secondary" className="text-xs">
                            {typeBadge}
                          </Badge>
                          <Badge variant="secondary" className={`text-xs ${severityColor}`}>
                            {severityBadgeText}
                          </Badge>
                        </div>

                        {/* Info */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          {incident.location && (
                            <p>{t("list.location", { location: incident.location })}</p>
                          )}
                          {incident.projectReference && (
                            <p>
                              {t("list.projectReference", {
                                reference: incident.projectReference,
                              })}
                            </p>
                          )}
                          <p>
                            {t("list.reportedAt", {
                              date: new Date(incident.occurredAt).toLocaleDateString(
                                locale === "en" ? "en-US" : "nb-NO",
                                {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                                }
                              ),
                            })}
                          </p>
                        </div>

                        {/* Beskrivelse (første 100 tegn) */}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {incident.description}
                        </p>
                      </div>

                      {/* Status ikon */}
                      <div className="flex-shrink-0">
                        {incident.status === "CLOSED" ? (
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                        ) : incident.status === "INVESTIGATING" ? (
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
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

      {/* Hjelp */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("statusHelp.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-900">
          <div>
            <strong>{t("statusHelp.reportedLabel")}</strong> {t("statusHelp.reportedText")}
          </div>
          <div>
            <strong>{t("statusHelp.underReviewLabel")}</strong> {t("statusHelp.underReviewText")}
          </div>
          <div>
            <strong>{t("statusHelp.closedLabel")}</strong> {t("statusHelp.closedText")}
          </div>
        </CardContent>
      </Card>

      {/* Nødknapp */}
      <Card className="border-l-4 border-l-red-500 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-900 mb-1">
                {t("emergency.title")}
              </p>
              <p className="text-xs text-red-800">
                {t("emergency.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

