"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FindingForm } from "@/features/audits/components/finding-form";
import { FindingList } from "@/features/audits/components/finding-list";
import { CompleteAuditForm } from "@/features/audits/components/complete-audit-form";
import { UpdateAuditStatusForm } from "@/features/audits/components/update-audit-status-form";
import {
  getAuditTypeLabel,
  getAuditTypeColor,
  getAuditStatusLabel,
  getAuditStatusColor,
} from "@/features/audits/schemas/audit.schema";
import {
  ArrowLeft,
  Calendar,
  User,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { fetchAuditDetail } from "@/server/queries/audit.queries";

type AuditDetailData = NonNullable<Awaited<ReturnType<typeof fetchAuditDetail>>>;

interface AuditDetailContentProps {
  initialData: AuditDetailData;
  auditId: string;
  locale: string;
}

export function AuditDetailContent({ initialData, auditId, locale }: AuditDetailContentProps) {
  const t = useTranslations("dashboardAuditDetailPage");

  const { data } = useQuery({
    queryKey: ["audits", auditId],
    queryFn: () => fetchAuditDetail(auditId),
    initialData,
  });

  if (!data) return null;

  const { audit, leadAuditor, teamMembers, tenantUsers } = data;

  const typeLabel = getAuditTypeLabel(audit.auditType);
  const typeColor = getAuditTypeColor(audit.auditType);
  const statusLabel = getAuditStatusLabel(audit.status);
  const statusColor = getAuditStatusColor(audit.status);

  const findingStats = {
    total: audit.findings.length,
    majorNCs: audit.findings.filter((f: any) => f.findingType === "MAJOR_NC").length,
    minorNCs: audit.findings.filter((f: any) => f.findingType === "MINOR_NC").length,
    observations: audit.findings.filter((f: any) => f.findingType === "OBSERVATION").length,
    strengths: audit.findings.filter((f: any) => f.findingType === "STRENGTH").length,
    open: audit.findings.filter((f: any) => f.status === "OPEN").length,
    inProgress: audit.findings.filter((f: any) => f.status === "IN_PROGRESS").length,
    resolved: audit.findings.filter((f: any) => f.status === "RESOLVED").length,
    verified: audit.findings.filter((f: any) => f.status === "VERIFIED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/audits">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("actions.back")}
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{audit.title}</h1>
            <p className="text-muted-foreground">{t("details")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={typeColor}>{typeLabel}</Badge>
            <Badge className={statusColor}>{statusLabel}</Badge>
            <UpdateAuditStatusForm auditId={audit.id} currentStatus={audit.status} />
            {audit.status !== "COMPLETED" && audit.status !== "CANCELLED" && (
              <CompleteAuditForm
                auditId={audit.id}
                currentSummary={audit.summary}
                currentConclusion={audit.conclusion}
              />
            )}
            <Link href={`/dashboard/audits/${audit.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                {t("actions.edit")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("basicInfo.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("basicInfo.scheduledDate")}</p>
                <p className="font-medium">
                  {new Date(audit.scheduledDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {audit.completedAt && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("basicInfo.completed")}</p>
                  <p className="font-medium">
                    {new Date(audit.completedAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("basicInfo.area")}</p>
                <p className="font-medium">{audit.area}</p>
                {audit.department && (
                  <p className="text-sm text-muted-foreground">{t("basicInfo.department", { value: audit.department })}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("team.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("team.leadAuditor")}</p>
                <p className="font-medium">{leadAuditor?.name || t("unknown")}</p>
                <p className="text-sm text-muted-foreground">{leadAuditor?.email}</p>
              </div>
            </div>

            {teamMembers.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("team.members")}</p>
                  {teamMembers.map((member: any) => (
                    <div key={member.id}>
                      <p className="font-medium">{member.name || t("unknown")}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("scope.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{t("scope.scope")}</p>
            <p className="text-sm whitespace-pre-wrap">{audit.scope}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{t("scope.criteria")}</p>
            <p className="text-sm whitespace-pre-wrap">{audit.criteria}</p>
          </div>
        </CardContent>
      </Card>

      {(audit.summary || audit.conclusion) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("summary.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {audit.summary && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("summary.summary")}</p>
                <p className="text-sm whitespace-pre-wrap">{audit.summary}</p>
              </div>
            )}
            {audit.conclusion && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("summary.conclusion")}</p>
                <p className="text-sm whitespace-pre-wrap">{audit.conclusion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {findingStats.total > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">{t("findingsStats.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-orange-900">{t("findingsStats.major")}</p>
                <p className="text-3xl font-bold text-red-600">{findingStats.majorNCs}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">{t("findingsStats.minor")}</p>
                <p className="text-3xl font-bold text-orange-600">{findingStats.minorNCs}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">{t("findingsStats.observations")}</p>
                <p className="text-3xl font-bold text-yellow-600">{findingStats.observations}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">{t("findingsStats.strengths")}</p>
                <p className="text-3xl font-bold text-green-600">{findingStats.strengths}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("findings.title")}</CardTitle>
              <CardDescription>{t("findings.description")}</CardDescription>
            </div>
            <FindingForm auditId={audit.id} users={tenantUsers} />
          </div>
        </CardHeader>
        <CardContent>
          <FindingList findings={audit.findings} />
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">{t("compliance.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>{t("compliance.i1")}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>{t("compliance.i2")}</span>
          </div>
          <div className="flex items-center gap-2">
            {audit.completedAt ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span>{audit.completedAt ? t("compliance.completed") : t("compliance.notCompleted")}</span>
          </div>
          <div className="flex items-center gap-2">
            {findingStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span>
              {findingStats.total > 0
                ? t("compliance.findingsDocumented", { count: findingStats.total })
                : t("compliance.noFindings")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {findingStats.open === 0 && findingStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : findingStats.open > 0 ? (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            )}
            <span>
              {findingStats.open > 0
                ? t("compliance.openFindings", { count: findingStats.open })
                : t("compliance.allClosed")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
