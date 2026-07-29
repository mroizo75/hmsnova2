"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Trash2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { deleteIncident } from "@/server/actions/incident.actions";
import {
  getIncidentTypeColor,
  getSeverityInfo,
  getIncidentStatusColor,
  getMainCategory,
  getMainCategoryColor,
} from "@/features/incidents/schemas/incident.schema";
import { useToast } from "@/hooks/use-toast";
import type { Incident, Measure } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

interface IncidentListProps {
  incidents: (Incident & { measures: Measure[]; risk?: { id: string; title: string; category: string | null } | null })[];
}

export function IncidentList({ incidents }: IncidentListProps) {
  const t = useTranslations("dashboardIncidentList");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const totalPages = Math.max(1, Math.ceil(incidents.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedIncidents = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return incidents.slice(start, start + pageSize);
  }, [incidents, safeCurrentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [incidents]);

  function handlePageSizeChange(value: string) {
    setPageSize(Number(value));
    setCurrentPage(1);
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(t("confirmDelete", { title }))) {
      return;
    }

    setLoading(id);
    const result = await deleteIncident(id);

    if (result.success) {
      toast({
        title: t("toasts.deleted.title"),
        description: t("toasts.deleted.description", { title }),
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.error.title"),
        description: result.error || t("toasts.error.description"),
      });
    }
    setLoading(null);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const stageColors: Record<string, string> = {
    REPORTED: "bg-gray-100 text-gray-800 border-gray-200",
    UNDER_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ROOT_CAUSE: "bg-blue-100 text-blue-800 border-blue-300",
    ACTIONS_DEFINED: "bg-indigo-100 text-indigo-800 border-indigo-300",
    ACTIONS_COMPLETE: "bg-green-100 text-green-800 border-green-300",
    VERIFIED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };

  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop - Tabell */}
      <div className="hidden md:block rounded-lg border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">{t("table.number")}</TableHead>
            <TableHead>{t("table.incident")}</TableHead>
            <TableHead>{t("table.category")}</TableHead>
            <TableHead>{t("table.type")}</TableHead>
            <TableHead className="text-center">{t("table.severity")}</TableHead>
            <TableHead>{t("table.stage")}</TableHead>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead className="text-center">{t("table.measures")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedIncidents.map((incident) => {
            const mainCategory = getMainCategory(incident.type);
            const categoryColor = getMainCategoryColor(mainCategory);
            const typeLabel = t(`types.${incident.type}`);
            const typeColor = getIncidentTypeColor(incident.type);
            const { bgColor: severityColor, textColor: severityTextColor } = getSeverityInfo(incident.severity);
            const severityBadgeText =
              incident.severity === null
                ? t("severity.notAssessed")
                : `${incident.severity} - ${t(`severity.${incident.severity}`)}`;
            const statusLabel = t(`status.${incident.status}`);
            const statusColor = getIncidentStatusColor(incident.status);
            const stageLabel = t(`stage.${incident.stage}`);
            const stageColor = stageColors[incident.stage] || stageColors.REPORTED;
            const completedMeasures = incident.measures.filter(m => m.status === "DONE").length;
            const totalMeasures = incident.measures.length;

            return (
              <TableRow key={incident.id}>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {incident.avviksnummer || "–"}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{incident.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {incident.description}
                    </div>
                    {incident.projectReference && (
                      <div className="text-xs text-muted-foreground">
                        {t("projectReference")}: {incident.projectReference}
                      </div>
                    )}
                    {incident.risk && (
                      <div className="text-xs text-muted-foreground">
                        {t("risk")}: {incident.risk.title}
                      </div>
                    )}
                    {incident.type === "CUSTOMER" && (
                      <div className="text-xs text-purple-800 space-x-1 mt-1">
                        <span>{t("customer.label")}: {incident.customerName || t("customer.unknown")}</span>
                        {incident.customerEmail && <span>• {incident.customerEmail}</span>}
                        {incident.customerPhone && <span>• {incident.customerPhone}</span>}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={categoryColor}>
                    {mainCategory === "RUH" ? "RUH" : t("categoryLabel.avvik")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={typeColor}>{typeLabel}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={`${severityColor} ${severityTextColor}`}>
                    {severityBadgeText}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={stageColor}>{stageLabel}</Badge>
                </TableCell>
                <TableCell>
                  {formatDate(incident.occurredAt)}
                </TableCell>
                <TableCell>
                  <Badge className={statusColor}>{statusLabel}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {totalMeasures > 0 ? (
                    <span className="text-sm">
                      {completedMeasures}/{totalMeasures}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">{t("dash")}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/incidents/${incident.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(incident.id, incident.title)}
                      disabled={loading === incident.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      {/* Mobile - Kort */}
      <div className="md:hidden space-y-3">
        {paginatedIncidents.map((incident) => {
          const mainCategory = getMainCategory(incident.type);
          const categoryColor = getMainCategoryColor(mainCategory);
          const typeLabel = t(`types.${incident.type}`);
          const typeColor = getIncidentTypeColor(incident.type);
          const { bgColor: severityColor, textColor: severityTextColor } = getSeverityInfo(incident.severity);
          const statusLabel = t(`status.${incident.status}`);
          const statusColor = getIncidentStatusColor(incident.status);
          const stageLabel = t(`stage.${incident.stage}`);
          const stageColor = stageColors[incident.stage] || stageColors.REPORTED;
          const completedMeasures = incident.measures.filter(m => m.status === "DONE").length;
          const totalMeasures = incident.measures.length;

          return (
            <Card
              key={incident.id}
              className={mainCategory === "RUH"
                ? "border-l-4 border-l-orange-400"
                : "border-l-4 border-l-blue-400"
              }
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {incident.avviksnummer && (
                        <p className="text-xs font-mono text-muted-foreground mb-1">
                          {incident.avviksnummer}
                        </p>
                      )}
                      <h3 className="font-medium line-clamp-1">{incident.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {incident.description}
                      </p>
                      {incident.projectReference && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("projectReference")}: {incident.projectReference}
                        </p>
                      )}
                    </div>
                    <Badge className={`${severityColor} ${severityTextColor} shrink-0`}>
                      {incident.severity ?? t("severity.notAssessedShort")}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={categoryColor}>
                      {mainCategory === "RUH" ? "RUH" : t("categoryLabel.avvik")}
                    </Badge>
                    <Badge className={typeColor}>{typeLabel}</Badge>
                    <Badge className={statusColor}>{statusLabel}</Badge>
                    <Badge className={stageColor}>{stageLabel}</Badge>
                  </div>

                  {incident.risk && (
                    <div className="text-xs text-muted-foreground">
                      {t("risk")}: {incident.risk.title}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(incident.occurredAt)}
                    </div>
                    {totalMeasures > 0 && (
                      <span>
                        {t("measuresLabel", { completed: completedMeasures, total: totalMeasures })}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/dashboard/incidents/${incident.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t("actions.viewDetails")}
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(incident.id, incident.title)}
                      disabled={loading === incident.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Paginering */}
      {incidents.length > PAGE_SIZE_OPTIONS[0] && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("pagination.show")}</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>{t("pagination.of", { total: incidents.length })}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm min-w-[80px] text-center">
              {t("pagination.page", { current: safeCurrentPage, total: totalPages })}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

