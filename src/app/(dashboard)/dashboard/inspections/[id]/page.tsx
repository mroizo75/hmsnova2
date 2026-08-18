import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  User,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Download,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import { InspectionFindingList } from "@/features/inspections/components/inspection-finding-list";
import { UpdateInspectionStatusForm } from "@/features/inspections/components/update-inspection-status-form";
import { DeleteInspectionButton } from "@/features/inspections/components/delete-inspection-button";
import { getLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

import { getPermissions } from "@/lib/permissions";

function getStatusBadge(status: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  const variants: Record<
    string,
    { className: string; label: string }
  > = {
    PLANNED: { className: "bg-blue-100 text-blue-800", label: t("status.planned") },
    IN_PROGRESS: { className: "bg-yellow-100 text-yellow-800", label: t("status.inProgress") },
    COMPLETED: { className: "bg-green-100 text-green-800", label: t("status.completed") },
    CANCELLED: { className: "bg-red-100 text-red-800", label: t("status.cancelled") },
  };
  const config = variants[status] || variants.PLANNED;
  return <Badge className={config.className}>{config.label}</Badge>;
}

function getTypeBadge(type: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  const labels: Record<string, string> = {
    VERNERUNDE: t("types.vernerunde"),
    HMS_INSPEKSJON: t("types.hmsInspection"),
    SHA_PLAN: t("types.shaPlan"),
    SIKKERHETSVANDRING: t("types.safetyWalk"),
    ANDRE: t("types.other"),
  };
  return <Badge variant="outline">{labels[type] || type}</Badge>;
}

function getSeverityBadge(severity: number, t: Awaited<ReturnType<typeof getTranslations>>) {
  const config: Record<number, { className: string; label: string }> = {
    1: { className: "bg-blue-100 text-blue-800", label: t("severity.low") },
    2: { className: "bg-green-100 text-green-800", label: t("severity.moderate") },
    3: { className: "bg-yellow-100 text-yellow-800", label: t("severity.significant") },
    4: { className: "bg-orange-100 text-orange-800", label: t("severity.serious") },
    5: { className: "bg-red-100 text-red-800", label: t("severity.critical") },
  };
  const severityConfig = config[severity] || config[1];
  return <Badge className={severityConfig.className}>{severityConfig.label}</Badge>;
}

function getFindingStatusBadge(status: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  const config: Record<string, { className: string; label: string }> = {
    OPEN: { className: "bg-red-100 text-red-800", label: t("findingStatus.open") },
    IN_PROGRESS: { className: "bg-yellow-100 text-yellow-800", label: t("findingStatus.inProgress") },
    RESOLVED: { className: "bg-green-100 text-green-800", label: t("findingStatus.resolved") },
    CLOSED: { className: "bg-gray-100 text-gray-800", label: t("findingStatus.closed") },
  };
  return <Badge className={config[status]?.className || config.OPEN.className}>
    {config[status]?.label || status}
  </Badge>;
}

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("dashboardInspectionDetailPage");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? enUS : nb;
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const permissions = getPermissions(session.user.role ?? "ANSATT");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!currentUser || currentUser.tenants.length === 0) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const selectedMembership = currentUser.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const tenantId = selectedMembership.tenantId;

  const inspection = await prisma.inspection.findUnique({
    where: { id, tenantId },
    include: {
      findings: {
        orderBy: { createdAt: "desc" },
      },
      formTemplate: {
        include: {
          fields: {
            orderBy: { order: "asc" },
          },
        },
      },
      formSubmission: {
        include: {
          fieldValues: true,
        },
      },
    },
  });

  if (!inspection) {
    return <div>{t("notFound")}</div>;
  }

  // Hent gjennomfører
  const conductedByUser = await prisma.user.findUnique({
    where: { id: inspection.conductedBy },
    select: { id: true, name: true, email: true },
  });

  // Hent deltakere
  const participantIds = inspection.participants ? JSON.parse(inspection.participants) : [];
  const participants = await prisma.user.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, name: true, email: true },
  });

  // Finding statistics
  const findingStats = {
    total: inspection.findings.length,
    open: inspection.findings.filter((f) => f.status === "OPEN").length,
    inProgress: inspection.findings.filter((f) => f.status === "IN_PROGRESS").length,
    resolved: inspection.findings.filter((f) => f.status === "RESOLVED").length,
    closed: inspection.findings.filter((f) => f.status === "CLOSED").length,
    critical: inspection.findings.filter((f) => f.severity === 5).length,
    high: inspection.findings.filter((f) => f.severity === 4).length,
    medium: inspection.findings.filter((f) => f.severity === 3).length,
    low: inspection.findings.filter((f) => f.severity <= 2).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/inspections">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("actions.back")}
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{inspection.title}</h1>
            <p className="text-muted-foreground">{t("details")}</p>
          </div>
          <div className="flex items-center gap-2">
            {getTypeBadge(inspection.type, t)}
            {getStatusBadge(inspection.status, t)}
            <UpdateInspectionStatusForm inspectionId={inspection.id} currentStatus={inspection.status} />
            <Link href={`/dashboard/inspections/${inspection.id}/mobil`}>
              <Button className="bg-green-600 hover:bg-green-700" size="sm">
                <Smartphone className="mr-2 h-4 w-4" />
                {t("actions.mobileView")}
              </Button>
            </Link>
            <Link href={`/dashboard/inspections/${inspection.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                {t("actions.edit")}
              </Button>
            </Link>
            {permissions.canDeleteInspections && (
              <DeleteInspectionButton
                inspectionId={inspection.id}
                inspectionTitle={inspection.title}
              />
            )}
          </div>
        </div>
      </div>

      {/* Skjema hvis tilgjengelig */}
      {inspection.formTemplate && (
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div className="flex-1">
                <CardTitle>{inspection.formTemplate.title}</CardTitle>
                {inspection.formTemplate.description && (
                  <p className="text-sm text-muted-foreground mt-1">{inspection.formTemplate.description}</p>
                )}
              </div>
              {inspection.formSubmission && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t("form.completed")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {inspection.formSubmission ? (
              <div className="flex gap-3">
                <Link href={`/dashboard/inspections/${id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    {t("form.view")}
                  </Button>
                </Link>
                <Link href={`/api/forms/${inspection.formTemplate.id}/submissions/${inspection.formSubmissionId}/pdf`} target="_blank">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t("actions.downloadPdf")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {t("form.warning")}
                  </span>
                </div>
                <Link href={`/dashboard/inspections/${id}/fill`}>
                  <Button className="w-full">
                    {t("form.fillNow")}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("basicInfo.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{t("basicInfo.scheduledDate")}</p>
                <p className="font-medium">
                  {format(new Date(inspection.scheduledDate), "d. MMMM yyyy", { locale: dateLocale })}
                </p>
              </div>
            </div>

            {inspection.completedDate && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("basicInfo.completed")}</p>
                  <p className="font-medium">
                    {format(new Date(inspection.completedDate), "d. MMMM yyyy", { locale: dateLocale })}
                  </p>
                </div>
              </div>
            )}

            {inspection.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("basicInfo.location")}</p>
                  <p className="font-medium">{inspection.location}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle>{t("performedBy.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{t("performedBy.responsible")}</p>
                <p className="font-medium">{conductedByUser?.name || t("unknown")}</p>
                <p className="text-sm text-muted-foreground">{conductedByUser?.email}</p>
              </div>
            </div>

            {participants.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("performedBy.participants")}</p>
                  {participants.map((participant) => (
                    <div key={participant.id} className="mt-1">
                      <p className="font-medium">{participant.name || t("unknown")}</p>
                      <p className="text-sm text-muted-foreground">{participant.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {inspection.description && (
        <Card>
          <CardHeader>
            <CardTitle>{t("descriptionTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{inspection.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Finding Statistics */}
      {findingStats.total > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">{t("findingsStats.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-orange-900">{t("findingsStats.critical")}</p>
                <p className="text-3xl font-bold text-red-600">{findingStats.critical}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">{t("findingsStats.high")}</p>
                <p className="text-3xl font-bold text-orange-600">{findingStats.high}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">{t("findingsStats.medium")}</p>
                <p className="text-3xl font-bold text-yellow-600">{findingStats.medium}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">{t("findingsStats.low")}</p>
                <p className="text-3xl font-bold text-green-600">{findingStats.low}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-orange-200">
              <div className="grid gap-4 md:grid-cols-4 text-sm">
                <div>
                  <p className="text-orange-900 font-medium">{t("findingsStats.open")}</p>
                  <p className="text-2xl font-bold">{findingStats.open}</p>
                </div>
                <div>
                  <p className="text-orange-900 font-medium">{t("findingsStats.inProgress")}</p>
                  <p className="text-2xl font-bold">{findingStats.inProgress}</p>
                </div>
                <div>
                  <p className="text-orange-900 font-medium">{t("findingsStats.resolved")}</p>
                  <p className="text-2xl font-bold">{findingStats.resolved}</p>
                </div>
                <div>
                  <p className="text-orange-900 font-medium">{t("findingsStats.closed")}</p>
                  <p className="text-2xl font-bold">{findingStats.closed}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      <Card id="funn">
        <CardHeader>
          <CardTitle>{t("findings.title")}</CardTitle>
          <CardDescription>
            {findingStats.total > 0
              ? t("findings.registered", { count: findingStats.total })
              : t("findings.noneDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inspection.findings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("findings.noneTitle")}</p>
              <p className="text-sm mt-1">{t("findings.noneHelp")}</p>
            </div>
          ) : (
            <InspectionFindingList findings={inspection.findings} />
          )}
        </CardContent>
      </Card>

      {/* Compliance */}
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
            {inspection.completedDate ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span>
              {inspection.completedDate ? t("compliance.completed") : t("compliance.notCompleted")}
            </span>
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
                : findingStats.total > 0
                ? t("compliance.allClosed")
                : t("compliance.none")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

