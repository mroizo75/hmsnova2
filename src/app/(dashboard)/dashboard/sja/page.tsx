import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HardHat,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  BookTemplate,
  Info,
  Send,
} from "lucide-react";
import Link from "next/link";
import {
  getSjaStatusColor,
  getSjaConclusionColor,
  getRiskColor,
} from "@/features/sja/schemas/sja.schema";
import { SjaCreateTemplateButton } from "@/components/sja/sja-create-template-button";
import { SjaDeleteTemplateButton } from "@/components/sja/sja-delete-template-button";
import { getLocale, getTranslations } from "next-intl/server";

export default async function SjaDashboardPage() {
  const t = await getTranslations("dashboardSjaPage");
  const locale = await getLocale();

  const auth = await getAuthContext();
  const { permissions, tenantId, userId } = auth;

  const canReadAll  = permissions.canReadSja;
  const canReadOwn  = permissions.canReadOwnSja;
  const canCreate   = permissions.canCreateSja;

  if (!canReadAll && !canReadOwn && !canCreate) {
    redirect("/dashboard");
  }

  const ownerFilter = canReadAll ? {} : { createdById: userId };
  const showOwnOnlyNotice = !canReadAll && canReadOwn;
  const showCreateOnlyNotice = !canReadAll && !canReadOwn && canCreate;

  const analyses = (canReadAll || canReadOwn)
    ? await prisma.sjaAnalysis.findMany({
        where: { tenantId, ...ownerFilter },
        include: {
          hazards: { select: { id: true, riskLevel: true } },
        },
        orderBy: { plannedDate: "desc" },
      })
    : [];

  const templates = await prisma.sjaTemplate.findMany({
    where: { tenantId, isActive: true },
    include: {
      hazards: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  const stats = {
    total: analyses.length,
    draft: analyses.filter((a) => a.status === "DRAFT").length,
    active: analyses.filter((a) => a.status === "ACTIVE").length,
    completed: analyses.filter((a) => a.status === "COMPLETED").length,
    cancelled: analyses.filter((a) => a.status === "CANCELLED").length,
    templates: templates.length,
  };
  const statusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      DRAFT: t("status.DRAFT"),
      PENDING_APPROVAL: t("status.PENDING_APPROVAL"),
      APPROVED: t("status.APPROVED"),
      ACTIVE: t("status.ACTIVE"),
      COMPLETED: t("status.COMPLETED"),
      CANCELLED: t("status.CANCELLED"),
    };
    return labels[status] ?? status;
  };
  const conclusionLabel = (conclusion: string | null): string => {
    if (!conclusion) {
      return "-";
    }
    const labels: Record<string, string> = {
      GO: t("conclusion.GO"),
      GO_WITH_MEASURES: t("conclusion.GO_WITH_MEASURES"),
      NO_GO: t("conclusion.NO_GO"),
    };
    return labels[conclusion] ?? conclusion;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HardHat className="h-8 w-8 text-orange-600" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/sja/new">
            <Plus className="h-4 w-4 mr-1" />
            {t("actions.new")}
          </Link>
        </Button>
      </div>

      {showCreateOnlyNotice && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <Send className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            Du kan opprette SJA-analyser, men har ikke tilgang til å se andres. SJA-er du sender inn behandles og godkjennes av HMS-ansvarlig eller administrator.
          </AlertDescription>
        </Alert>
      )}
      {showOwnOnlyNotice && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            Du ser kun dine egne SJA-analyser. SJA-er du oppretter behandles og godkjennes av leder.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total.title")}</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("stats.total.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.draft.title")}</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">{t("stats.draft.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.active.title")}</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{t("stats.active.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.completed.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">{t("stats.completed.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.templates.title")}</CardTitle>
            <BookTemplate className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.templates}</div>
            <p className="text-xs text-muted-foreground">{t("stats.templates.description")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("analyses.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="text-center py-12">
              <HardHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("analyses.emptyTitle")}</h3>
              <p className="text-muted-foreground">
                {t("analyses.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.number")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.title")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.location")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.status")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.conclusion")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.createdBy")}</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">{t("table.date")}</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">{t("table.risk")}</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((sja) => {
                    const maxRisk = sja.hazards.length > 0
                      ? Math.max(...sja.hazards.map((h) => h.riskLevel))
                      : 0;

                    return (
                      <tr key={sja.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 pr-4">
                          <Link
                            href={`/dashboard/sja/${sja.id}`}
                            className="text-sm font-mono text-primary hover:underline"
                          >
                            {sja.sjaNummer || "-"}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <Link
                            href={`/dashboard/sja/${sja.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {sja.title}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {sja.workLocation}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getSjaStatusColor(sja.status)}`}
                          >
                            {statusLabel(sja.status)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getSjaConclusionColor(sja.conclusion)}`}
                          >
                            {conclusionLabel(sja.conclusion)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {sja.createdByName}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {new Date(sja.plannedDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3">
                          {maxRisk > 0 ? (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskColor(
                                maxRisk
                              )}`}
                            >
                              {maxRisk}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookTemplate className="h-5 w-5 text-purple-600" />
              {t("templates.title", { count: templates.length })}
            </CardTitle>
            <SjaCreateTemplateButton tenantId={tenantId} />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("templates.description")}
          </p>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <BookTemplate className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-1">{t("templates.emptyTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("templates.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                      {template.workLocation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("templates.workLocation", { value: template.workLocation })}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {t("templates.hazards", { count: template.hazards.length })}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t("templates.createdBy", { name: template.createdByName })} •{" "}
                          {new Date(template.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1">
                        {template.hazards.map((h) => (
                          <div key={h.id} className="flex items-start gap-2 text-xs">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {h.activity}
                            </Badge>
                            <span className="text-muted-foreground truncate">
                              {h.hazard} → {h.measures}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <SjaDeleteTemplateButton templateId={template.id} templateName={template.name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
