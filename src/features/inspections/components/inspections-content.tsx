"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import { Calendar, MapPin, Smartphone } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { fetchInspections } from "@/server/queries/inspection.queries";
import { matchesIndustryScope } from "@/lib/industry-scope";

type InspectionsData = Awaited<ReturnType<typeof fetchInspections>>;

interface InspectionsContentProps {
  initialData: InspectionsData;
  locale: string;
  showAll: boolean;
  tenantIndustry: string | null;
  canCreateInspections: boolean;
}

export function InspectionsContent({
  initialData,
  locale,
  showAll,
  tenantIndustry,
  canCreateInspections,
}: InspectionsContentProps) {
  const t = useTranslations("dashboardInspectionsPage");
  const dateLocale = locale === "en" ? enUS : nb;

  const { data: inspectionsRaw } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => fetchInspections(),
    initialData,
  });

  const inspections = inspectionsRaw.filter((inspection: any) => {
    if (showAll || !inspection.templateId) return true;
    return matchesIndustryScope(inspection.template?.industryScope, tenantIndustry);
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
    <>
      {/* Mobile Quick Access */}
      <div className="lg:hidden grid grid-cols-1 gap-3">
        {inspections
          .filter((i: any) => i.status === "IN_PROGRESS" || i.status === "PLANNED")
          .slice(0, 3)
          .map((inspection: any) => {
            const statusInfo = getStatusBadge(inspection.status);
            return (
              <Link key={inspection.id} href={`/dashboard/inspections/${inspection.id}/mobil`}>
                <Card className="hover:bg-accent transition-colors border-2 border-green-500/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base line-clamp-1">{inspection.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {format(new Date(inspection.scheduledDate), "d. MMM yyyy", { locale: dateLocale })}
                        </CardDescription>
                      </div>
                      <Smartphone className="h-5 w-5 text-green-600 ml-2" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
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
              {inspections.filter((i: any) => i.status === "PLANNED").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("stats.inProgress")}</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {inspections.filter((i: any) => i.status === "IN_PROGRESS").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("stats.openFindings")}</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {inspections.reduce((sum: number, i: any) => sum + i.findings.length, 0)}
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
              {canCreateInspections && (
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
                  {inspections.map((inspection: any) => {
                    const statusInfo = getStatusBadge(inspection.status);
                    return (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">{inspection.title}</TableCell>
                        <TableCell>{getTypeBadge(inspection.type)}</TableCell>
                        <TableCell>
                          {format(new Date(inspection.scheduledDate), "d. MMM yyyy", { locale: dateLocale })}
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
                            <Button variant="ghost" size="sm">{t("actions.details")}</Button>
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
    </>
  );
}
