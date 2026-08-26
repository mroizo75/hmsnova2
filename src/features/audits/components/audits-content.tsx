"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import { fetchAudits } from "@/server/queries/audit.queries";

type AuditsData = Awaited<ReturnType<typeof fetchAudits>>;

interface AuditsContentProps {
  initialData: AuditsData;
  locale: string;
}

export function AuditsContent({ initialData, locale }: AuditsContentProps) {
  const t = useTranslations("dashboardAuditsPage");
  const dateLocale = locale === "en" ? enUS : nb;

  const { data: audits } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
    initialData,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PLANNED: { variant: "outline", label: t("status.planned") },
      IN_PROGRESS: { variant: "default", label: t("status.inProgress") },
      COMPLETED: { variant: "secondary", label: t("status.completed") },
      CANCELLED: { variant: "destructive", label: t("status.cancelled") },
    };
    const config = variants[status] || variants.PLANNED;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      INTERNAL: t("types.internal"),
      EXTERNAL: t("types.external"),
      CERTIFICATION: t("types.certification"),
      SUPPLIER: t("types.supplier"),
      FOLLOW_UP: t("types.followUp"),
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  if (audits.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("empty.description")}
          </p>
          <Link href="/dashboard/audits/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("actions.newAudit")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("list.title")}</CardTitle>
        <CardDescription>
          {t("list.total", { count: audits.length })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.title")}</TableHead>
                <TableHead>{t("table.type")}</TableHead>
                <TableHead>{t("table.area")}</TableHead>
                <TableHead>{t("table.date")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.findings")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map((audit: any) => {
                const openFindings = audit.findings.filter((f: any) => f.status === "OPEN").length;
                const majorNc = audit.findings.filter((f: any) => f.findingType === "MAJOR_NC" && f.status === "OPEN").length;
                const minorNc = audit.findings.filter((f: any) => f.findingType === "MINOR_NC" && f.status === "OPEN").length;

                return (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.title}</TableCell>
                    <TableCell>{getTypeBadge(audit.auditType)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{audit.area}</span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(audit.scheduledDate), "d. MMM yyyy", { locale: dateLocale })}
                    </TableCell>
                    <TableCell>{getStatusBadge(audit.status)}</TableCell>
                    <TableCell>
                      {openFindings > 0 ? (
                        <div className="flex flex-col gap-1">
                          {majorNc > 0 && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <AlertCircle className="h-3 w-3" />
                              {t("findings.major", { count: majorNc })}
                            </Badge>
                          )}
                          {minorNc > 0 && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              {t("findings.minor", { count: minorNc })}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t("findings.none")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/audits/${audit.id}`}>
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
        <div className="space-y-3 md:hidden">
          {audits.map((audit: any) => {
            const openFindings = audit.findings.filter((f: any) => f.status === "OPEN").length;
            const majorNc = audit.findings.filter((f: any) => f.findingType === "MAJOR_NC" && f.status === "OPEN").length;
            return (
              <div key={audit.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium">{audit.title}</h3>
                    <p className="text-sm text-muted-foreground">{audit.area}</p>
                  </div>
                  {getStatusBadge(audit.status)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {getTypeBadge(audit.auditType)}
                  <span>{format(new Date(audit.scheduledDate), "d. MMM yyyy", { locale: dateLocale })}</span>
                  {majorNc > 0 ? (
                    <Badge variant="destructive" className="text-xs">{t("findings.major", { count: majorNc })}</Badge>
                  ) : openFindings === 0 ? (
                    <span>{t("findings.none")}</span>
                  ) : null}
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/dashboard/audits/${audit.id}`}>{t("actions.details")}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
