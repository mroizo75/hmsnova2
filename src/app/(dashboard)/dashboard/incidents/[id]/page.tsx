import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MeasureForm } from "@/features/measures/components/measure-form";
import { MeasureList } from "@/features/measures/components/measure-list";
import { InvestigationForm } from "@/features/incidents/components/investigation-form";
import { CloseIncidentForm } from "@/features/incidents/components/close-incident-form";
import { IncidentTreatmentForm } from "@/components/incidents/incident-treatment-form";
import { IncidentPDFExport } from "@/components/incidents/incident-pdf-export";
import {
  getIncidentTypeColor,
  getSeverityInfo,
  getIncidentStatusColor,
} from "@/features/incidents/schemas/incident.schema";
import { ArrowLeft, AlertTriangle, User, MapPin, Eye, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("dashboardIncidentDetailPage");
  const locale = await getLocale();
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>{t("errors.noTenantAccess")}</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("errors.noTenantAccess")}</div>;
  }
  const tenantId = selectedMembership.tenantId;

  const rawIncident = await prisma.incident.findUnique({
    where: { id, tenantId },
    include: {
      measures: {
        orderBy: { createdAt: "desc" },
        include: {
          responsible: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      attachments: true,
      risk: {
        select: {
          id: true,
          title: true,
          category: true,
          score: true,
        },
      },
    },
  });

  if (!rawIncident) {
    return <div>{t("errors.notFound")}</div>;
  }

  // Prisma Decimal → plain number via JSON round-trip
  const incident = JSON.parse(JSON.stringify(rawIncident)) as typeof rawIncident;

  const parsedSubcategoryKeys = (() => {
    if (!incident.subcategoryKeys) return [] as string[];
    try {
      const parsed = JSON.parse(incident.subcategoryKeys) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
    } catch {
      return [] as string[];
    }
  })();

  const tenantUsers = await prisma.user.findMany({
    where: {
      tenants: {
        some: { tenantId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const tenantProjects = await prisma.project.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { ruhModuleEnabled: true },
  });

  const typeLabel = t(`labels.type.${incident.type}`);
  const typeColor = getIncidentTypeColor(incident.type);
  const { bgColor: severityColor, textColor: severityTextColor } = getSeverityInfo(incident.severity);
  const severityLabel = t(`labels.severity.${incident.severity ?? "notAssessed"}`);
  const severityBadgeText =
    incident.severity === null
      ? t("labels.severityNotAssessed")
      : t("labels.severityPrefix", { value: incident.severity, label: severityLabel });
  const statusLabel = t(`labels.status.${incident.status}`);
  const statusColor = getIncidentStatusColor(incident.status);

  const formatDate = (date: Date | null) => {
    if (!date) return t("dash");
    return new Date(date).toLocaleString(locale === "en" ? "en-US" : "nb-NO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const allMeasuresCompleted = incident.measures.length > 0 && incident.measures.every(m => m.status === "DONE");
  const canClose = incident.rootCause && allMeasuresCompleted && incident.status !== "CLOSED";


  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/incidents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("actions.backToIncidents")}
            </Link>
          </Button>
          <IncidentPDFExport
            incidentId={incident.id}
            avviksnummer={incident.avviksnummer}
          />
        </div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{incident.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              {incident.avviksnummer && (
                <Badge variant="outline" className="font-mono">
                  {incident.avviksnummer}
                </Badge>
              )}
              <Badge className={typeColor}>{typeLabel}</Badge>
              <Badge className={`${severityColor} ${severityTextColor}`}>
                {severityBadgeText}
              </Badge>
              <Badge className={statusColor}>{statusLabel}</Badge>
              {(incident.source ?? "INTERNAL") === "EXTERNAL" ? (
                <Badge className="bg-violet-100 text-violet-800 border-violet-300">Ekstern</Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-700 border-slate-300">Intern</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ISO 9001: a) Reagere på avvik */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t("sections.whatHappened.title")}
          </CardTitle>
          <CardDescription>{t("sections.whatHappened.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{t("sections.whatHappened.descriptionLabel")}</h4>
            <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-semibold mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("sections.whatHappened.time")}
              </h4>
              <p className="text-sm text-muted-foreground">{formatDate(incident.occurredAt)}</p>
            </div>

            {incident.location && (
              <div>
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("sections.whatHappened.location")}
                </h4>
                <p className="text-sm text-muted-foreground">{incident.location}</p>
              </div>
            )}

            {incident.projectReference && (
              <div>
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("sections.whatHappened.projectReference")}
                </h4>
                <p className="text-sm text-muted-foreground">{incident.projectReference}</p>
              </div>
            )}

            {incident.witnessName && (
              <div>
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {t("sections.whatHappened.witnesses")}
                </h4>
                <p className="text-sm text-muted-foreground">{incident.witnessName}</p>
              </div>
            )}
          </div>

          {(incident.injuryType || typeof incident.lostTimeMinutes === "number" || incident.medicalAttentionRequired || incident.risk) && (
            <div className="grid gap-4 md:grid-cols-3">
              {(incident.injuryType || incident.medicalAttentionRequired) && (
                <div>
                  <h4 className="font-semibold mb-1">{t("sections.whatHappened.injury")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {incident.injuryType || t("sections.whatHappened.noInjuryRegistered")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {incident.medicalAttentionRequired
                      ? t("sections.whatHappened.medicalRequired")
                      : t("sections.whatHappened.noMedical")}
                  </p>
                </div>
              )}

              {typeof incident.lostTimeMinutes === "number" && (
                <div>
                  <h4 className="font-semibold mb-1">{t("sections.whatHappened.lostTime")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("sections.whatHappened.lostTimeMinutes", { minutes: incident.lostTimeMinutes })}
                  </p>
                </div>
              )}

              {incident.risk && (
                <div>
                  <h4 className="font-semibold mb-1">{t("sections.whatHappened.linkedRisk")}</h4>
                  <Link
                    href={`/dashboard/risks/${incident.risk.id}`}
                    className="text-sm text-primary underline"
                  >
                    {incident.risk.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t("sections.whatHappened.riskScore", { score: incident.risk.score })}
                  </p>
                </div>
              )}
            </div>
          )}

          {incident.involvedPersons && (
            <div>
              <h4 className="font-semibold mb-2">{t("sections.whatHappened.involvedPersons")}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {incident.involvedPersons}
              </p>
            </div>
          )}

          {incident.injuryDescription && (
            <div>
              <h4 className="font-semibold mb-2">{t("sections.whatHappened.injuryDescription")}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {incident.injuryDescription}
              </p>
            </div>
          )}

          {incident.suggestedActions && (
            <div>
              <h4 className="font-semibold mb-2">{t("sections.whatHappened.suggestedActions")}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {incident.suggestedActions}
              </p>
            </div>
          )}

          {incident.immediateAction && (
            <div>
              <h4 className="font-semibold mb-2">{t("sections.whatHappened.immediateActions")}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {incident.immediateAction}
              </p>
            </div>
          )}

          {/* Vedlegg – prominent visning for dokumenter og bilder */}
          {incident.attachments && incident.attachments.length > 0 && (
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("sections.whatHappened.attachments", { count: incident.attachments.length })}
              </h4>
              <div className="space-y-3">
                {incident.attachments.map((attachment) => {
                  const isImage = attachment.mime.startsWith("image/");
                  const isPdf = attachment.mime === "application/pdf";
                  return (
                    <div key={attachment.id} className="flex items-center gap-4 rounded-lg border bg-background p-3">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/${attachment.fileKey}`}
                          alt={attachment.name}
                          className="h-16 w-16 rounded object-cover border"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                          <FileText className={`h-8 w-8 ${isPdf ? "text-red-500" : "text-muted-foreground"}`} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.mime} · {Math.round(attachment.size / 1024)} KB
                        </p>
                      </div>
                      <a
                        href={`/api/files/${attachment.fileKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Åpne
                        </Button>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behandle avvik */}
      {incident.status !== "CLOSED" && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>{t("sections.treatment.title")}</CardTitle>
            <CardDescription>{t("sections.treatment.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <IncidentTreatmentForm
              incidentId={incident.id}
              currentType={incident.type}
              currentSubcategoryKeys={parsedSubcategoryKeys}
              currentProjectId={incident.projectId}
              currentProjectReference={incident.projectReference}
              currentStatus={incident.status}
              currentSeverity={incident.severity}
              currentResponsibleId={incident.responsibleId}
              currentMedicalAttentionRequired={incident.medicalAttentionRequired}
              currentIsFatal={incident.isFatal}
              currentIsLostTimeIncident={incident.isLostTimeIncident}
              currentLostWorkdays={incident.lostWorkdays}
              currentIsRestrictedWork={incident.isRestrictedWork}
              currentIsFirstAidCase={incident.isFirstAidCase}
              currentIsProductionStop={incident.isProductionStop}
              currentProductionStopHours={incident.productionStopHours ? Number(incident.productionStopHours) : null}
              currentIsPropertyDamage={incident.isPropertyDamage}
              currentEstimatedDamageCost={incident.estimatedDamageCost ? Number(incident.estimatedDamageCost) : null}
              currentIsEnvironmentalRelease={incident.isEnvironmentalRelease}
              currentEnvironmentalDescription={incident.environmentalDescription}
              currentSource={incident.source ?? "INTERNAL"}
              currentInvolvedPersons={incident.involvedPersons}
              currentInjuryType={incident.injuryType}
              currentInjuryDescription={incident.injuryDescription}
              currentSuggestedActions={incident.suggestedActions}
              users={tenantUsers}
              projects={tenantProjects}
              ruhModuleEnabled={tenant?.ruhModuleEnabled ?? true}
            />
          </CardContent>
        </Card>
      )}

      {/* ISO 9001: b) Vurdere behovet for tiltak - Årsaksanalyse */}
      {!incident.rootCause ? (
        <InvestigationForm incidentId={incident.id} users={tenantUsers} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.rootCause.title")}</CardTitle>
            <CardDescription>{t("sections.rootCause.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{t("sections.rootCause.mainCause")}</h4>
              <p className="text-sm whitespace-pre-wrap">{incident.rootCause}</p>
            </div>

            {incident.contributingFactors && (
              <div>
                <h4 className="font-semibold mb-2">{t("sections.rootCause.contributingFactors")}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {incident.contributingFactors}
                </p>
              </div>
            )}

            {incident.investigatedAt && (
              <div className="text-sm text-muted-foreground">
                {t("sections.rootCause.investigatedAt", { date: formatDate(incident.investigatedAt) })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ISO 9001: c) Implementere nødvendige tiltak */}
      {incident.rootCause && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("sections.measures.title")}</CardTitle>
                <CardDescription>
                  {t("sections.measures.description")}
                </CardDescription>
              </div>
              {incident.status !== "CLOSED" && (
                <MeasureForm tenantId={tenantId} incidentId={incident.id} users={tenantUsers} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <MeasureList measures={incident.measures} />
            {incident.measures.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("sections.measures.empty")}</p>
                <p className="text-xs mt-2">{t("sections.measures.emptyHint")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ISO 9001: d) Gjennomgå effektiviteten */}
      {canClose ? (
        <CloseIncidentForm incidentId={incident.id} userId={user.id} />
      ) : incident.status === "CLOSED" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.closed.title")}</CardTitle>
            <CardDescription>{t("sections.closed.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {incident.effectivenessReview && (
              <div>
                <h4 className="font-semibold mb-2">{t("sections.closed.effectivenessReview")}</h4>
                <p className="text-sm whitespace-pre-wrap">{incident.effectivenessReview}</p>
              </div>
            )}

            {incident.lessonsLearned && (
              <div>
                <h4 className="font-semibold mb-2">{t("sections.closed.lessonsLearned")}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {incident.lessonsLearned}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-green-600">
              <User className="h-4 w-4" />
              <span>{t("sections.closed.closedAt", { date: formatDate(incident.closedAt) })}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

