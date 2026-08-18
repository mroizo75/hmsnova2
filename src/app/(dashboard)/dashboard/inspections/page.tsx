import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import { Plus, Calendar, MapPin, User, Smartphone, BarChart3 } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { matchesIndustryScope } from "@/lib/industry-scope";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLocale, getTranslations } from "next-intl/server";

async function getInspections(tenantId: string) {
  return await db.inspection.findMany({
    where: { tenantId },
    include: {
      findings: {
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      },
      template: {
        select: {
          id: true,
          industryScope: true,
        },
      },
    },
    orderBy: { scheduledDate: "desc" },
  });
}

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const t = await getTranslations("dashboardInspectionsPage");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? enUS : nb;
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canReadInspections) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const showAll = params.view === "all";
  const [inspectionsRaw, tenant] = await Promise.all([
    getInspections(session.user.tenantId),
    db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { industry: true },
    }),
  ]);
  const inspections = inspectionsRaw.filter((inspection) => {
    if (showAll || !inspection.templateId) {
      return true;
    }

    return matchesIndustryScope(inspection.template?.industryScope, tenant?.industry ?? null);
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      PLANNED: { label: t("status.planned"), variant: "secondary" },
      IN_PROGRESS: { label: t("status.inProgress"), variant: "default" },
      COMPLETED: { label: t("status.completed"), variant: "outline" },
      CANCELLED: { label: t("status.cancelled"), variant: "outline" },
    };
    return variants[status] || variants.PLANNED;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      VERNERUNDE: t("types.vernerunde"),
      HMS_INSPEKSJON: t("types.hmsInspection"),
      SHA_PLAN: t("types.shaPlan"),
      SIKKERHETSVANDRING: t("types.safetyWalk"),
      ANDRE: t("types.other"),
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.inspections} />
        </div>
        <div className="page-header-actions">
          <Link href={showAll ? "/dashboard/inspections" : "/dashboard/inspections?view=all"}>
            <Button variant="outline"> {showAll ? t("actions.showIndustry") : t("actions.showAll")} </Button>
          </Link>
          <Link href="/dashboard/inspections/rapport">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("actions.report")}
            </Button>
          </Link>
          {permissions.canCreateInspections && (
            <Link href="/dashboard/inspections/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("actions.new")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Quick Access */}
      <div className="lg:hidden grid grid-cols-1 gap-3">
        {inspections
          .filter((i) => i.status === "IN_PROGRESS" || i.status === "PLANNED")
          .slice(0, 3)
          .map((inspection) => {
            const statusInfo = getStatusBadge(inspection.status);
            return (
              <Link
                key={inspection.id}
                href={`/dashboard/inspections/${inspection.id}/mobil`}
              >
                <Card className="hover:bg-accent transition-colors border-2 border-green-500/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base line-clamp-1">
                          {inspection.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {format(new Date(inspection.scheduledDate), "d. MMM yyyy", {
                            locale: dateLocale,
                          })}
                        </CardDescription>
                      </div>
                      <Smartphone className="h-5 w-5 text-green-600 ml-2" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant} className="text-xs">
                        {statusInfo.label}
                      </Badge>
                      {inspection.findings.length > 0 && (
                        <span className="text-xs text-orange-600 font-medium">
                          {t("openFindings", { count: inspection.findings.length })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{inspections.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("stats.planned")}</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {inspections.filter((i) => i.status === "PLANNED").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("stats.inProgress")}</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {inspections.filter((i) => i.status === "IN_PROGRESS").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("stats.openFindings")}</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {inspections.reduce((sum, i) => sum + i.findings.length, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {inspections.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("list.empty")}</p>
              {permissions.canCreateInspections && (
                <Link href="/dashboard/inspections/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("actions.createFirst")}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.title")}</TableHead>
                    <TableHead>{t("table.type")}</TableHead>
                    <TableHead>{t("table.scheduledDate")}</TableHead>
                    <TableHead>{t("table.location")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.openFindings")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((inspection) => {
                    const statusInfo = getStatusBadge(inspection.status);
                    return (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">{inspection.title}</TableCell>
                        <TableCell>{getTypeBadge(inspection.type)}</TableCell>
                        <TableCell>
                          {format(new Date(inspection.scheduledDate), "d. MMM yyyy", {
                            locale: dateLocale,
                          })}
                        </TableCell>
                        <TableCell>
                          {inspection.location ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{inspection.location}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {inspection.findings.length > 0 ? (
                            <Badge variant="outline" className="text-orange-600">
                              {inspection.findings.length}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Link href={`/dashboard/inspections/${inspection.id}`}>
                            <Button variant="ghost" size="sm">
                              {t("actions.details")}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
