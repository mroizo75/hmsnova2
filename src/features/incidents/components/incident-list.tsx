"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Trash2, Calendar } from "lucide-react";
import Link from "next/link";
import { deleteIncident } from "@/server/actions/incident.actions";
import {
  getIncidentTypeColor,
  getSeverityInfo,
  getIncidentStatusColor,
} from "@/features/incidents/schemas/incident.schema";
import { useToast } from "@/hooks/use-toast";
import type { Incident, Measure } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";

interface IncidentListProps {
  incidents: (Incident & { measures: Measure[]; risk?: { id: string; title: string; category: string | null } | null })[];
}

export function IncidentList({ incidents }: IncidentListProps) {
  const t = useTranslations("dashboardIncidentList");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

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
            <TableHead>{t("table.type")}</TableHead>
            <TableHead className="text-center">{t("table.severity")}</TableHead>
            <TableHead>{t("table.stage")}</TableHead>
            <TableHead>{t("table.injury")}</TableHead>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead className="text-center">{t("table.measures")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((incident) => {
            const typeLabel = t(`types.${incident.type}`);
            const typeColor = getIncidentTypeColor(incident.type);
            const { bgColor: severityColor, textColor: severityTextColor } = getSeverityInfo(incident.severity);
            const severityLabel = t(`severity.${incident.severity}`);
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
                    {incident.risk && (
                      <div className="text-xs text-muted-foreground">
                        {t("risk")}: {incident.risk.title}
                      </div>
                    )}
                {incident.type === "CUSTOMER" && (
                  <div className="text-xs text-purple-800 space-y-1">
                    <div>{t("customer.label")}: {incident.customerName || t("customer.unknown")}</div>
                    {(incident.customerEmail || incident.customerPhone) && (
                      <div>
                        {incident.customerEmail && <span>{incident.customerEmail}</span>}
                        {incident.customerEmail && incident.customerPhone && " · "}
                        {incident.customerPhone}
                      </div>
                    )}
                    {typeof incident.customerSatisfaction === "number" && (
                      <div>{t("customer.satisfaction", { value: incident.customerSatisfaction })}</div>
                    )}
                    {incident.responseDeadline && (
                      <div>{t("customer.deadline", { date: formatDate(incident.responseDeadline) })}</div>
                    )}
                  </div>
                )}
                    {incident.type === "CUSTOMER" && (
                      <div className="text-xs text-purple-800 space-x-1 mt-1">
                        <span>{t("customer.label")}: {incident.customerName || t("customer.unknown")}</span>
                        {incident.customerEmail && <span>• {incident.customerEmail}</span>}
                        {incident.customerPhone && <span>• {incident.customerPhone}</span>}
                        {typeof incident.customerSatisfaction === "number" && (
                          <span>• {t("customer.satisfaction", { value: incident.customerSatisfaction })}</span>
                        )}
                        {incident.responseDeadline && (
                          <span>• {t("customer.deadline", { date: formatDate(incident.responseDeadline) })}</span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={typeColor}>{typeLabel}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={`${severityColor} ${severityTextColor}`}>
                    {incident.severity} - {severityLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={stageColor}>{stageLabel}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm space-y-1">
                    <div>{incident.injuryType || "Ingen skade registrert"}</div>
                    <div className="text-xs text-muted-foreground">
                      {incident.medicalAttentionRequired ? t("injury.medicalTreatment") : t("injury.noMedicalTreatment")}
                    </div>
                    {typeof incident.lostTimeMinutes === "number" && (
                      <div className="text-xs text-muted-foreground">
                        {t("injury.lostTimeMinutes", { minutes: incident.lostTimeMinutes })}
                      </div>
                    )}
                  </div>
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
        {incidents.map((incident) => {
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
            <Card key={incident.id}>
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
                    </div>
                    <Badge className={`${severityColor} ${severityTextColor} shrink-0`}>
                      {incident.severity}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={typeColor}>{typeLabel}</Badge>
                    <Badge className={statusColor}>{statusLabel}</Badge>
                    <Badge className={stageColor}>{stageLabel}</Badge>
                  </div>

                  {incident.risk && (
                    <div className="text-xs text-muted-foreground">
                      {t("risk")}: {incident.risk.title}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {incident.injuryType || t("injury.noneRegistered")} ·{" "}
                    {incident.medicalAttentionRequired ? t("injury.medicalTreatment") : t("injury.noMedicalTreatment")}
                    {typeof incident.lostTimeMinutes === "number" && ` · ${t("injury.minutesLostShort", { minutes: incident.lostTimeMinutes })}`}
                  </div>

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
    </>
  );
}

