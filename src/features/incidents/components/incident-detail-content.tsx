"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MeasureForm } from "@/features/measures/components/measure-form";
import { MeasureList } from "@/features/measures/components/measure-list";
import { InvestigationForm } from "@/features/incidents/components/investigation-form";
import { CloseIncidentForm } from "@/features/incidents/components/close-incident-form";
import { IncidentTreatmentForm } from "@/components/incidents/incident-treatment-form";
import { IncidentPDFExport } from "@/components/incidents/incident-pdf-export";
import { NavMeldingDialog } from "@/features/incidents/components/nav-melding-dialog";
import {
  getIncidentTypeColor,
  getSeverityInfo,
  getIncidentStatusColor,
} from "@/features/incidents/schemas/incident.schema";
import { canCloseIncident, getIncidentCloseBlockers } from "@/lib/incident-close-rules";
import {
  ArrowLeft,
  AlertTriangle,
  User,
  MapPin,
  Eye,
  Clock,
  FileText,
  CheckCircle,
  Circle,
  ChevronDown,
  ClipboardCheck,
  Search,
  Shield,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchIncidentDetail } from "@/server/queries/incident-detail.queries";

type IncidentDetailData = NonNullable<Awaited<ReturnType<typeof fetchIncidentDetail>>>;

interface IncidentDetailContentProps {
  initialData: IncidentDetailData;
  incidentId: string;
  userId: string;
  locale: string;
}

const STEPPER_STEPS = [
  { key: "reported", icon: AlertTriangle, label: "Registrert" },
  { key: "treatment", icon: ClipboardCheck, label: "Behandling" },
  { key: "rootCause", icon: Search, label: "Årsaksanalyse" },
  { key: "measures", icon: Shield, label: "Tiltak" },
  { key: "close", icon: Lock, label: "Lukking" },
] as const;

type StepKey = (typeof STEPPER_STEPS)[number]["key"];

function getCompletedSteps(incident: {
  status: string;
  rootCause: string | null;
  measures: Array<{ status: string }>;
}): Set<StepKey> {
  const completed = new Set<StepKey>();
  completed.add("reported");

  if (incident.status !== "OPEN") {
    completed.add("treatment");
  }
  if (incident.rootCause) {
    completed.add("rootCause");
  }
  if (incident.measures.length > 0 && incident.measures.every((m) => m.status === "DONE")) {
    completed.add("measures");
  }
  if (incident.status === "CLOSED") {
    completed.add("close");
  }
  return completed;
}

function getActiveStep(incident: {
  status: string;
  rootCause: string | null;
  measures: Array<{ status: string }>;
}): StepKey {
  if (incident.status === "CLOSED") return "close";
  if (
    incident.rootCause &&
    incident.measures.length > 0 &&
    incident.measures.every((m) => m.status === "DONE")
  ) {
    return "close";
  }
  if (incident.rootCause && incident.measures.length > 0) return "measures";
  if (incident.rootCause) return "measures";
  if (incident.status !== "OPEN") return "rootCause";
  return "treatment";
}

export function IncidentDetailContent({
  initialData,
  incidentId,
  userId,
  locale,
}: IncidentDetailContentProps) {
  const t = useTranslations("dashboardIncidentDetailPage");

  const { data } = useQuery({
    queryKey: ["incidents", incidentId],
    queryFn: () => fetchIncidentDetail(incidentId),
    initialData,
  });

  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!data) return null;

  const { incident, tenantUsers, tenantProjects, tenant, tenantRoutines } = data;

  const parsedSubcategoryKeys = (() => {
    if (!incident.subcategoryKeys) return [] as string[];
    try {
      const parsed = JSON.parse(incident.subcategoryKeys) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((value: unknown): value is string => typeof value === "string")
        : [];
    } catch {
      return [] as string[];
    }
  })();

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

  const formatDate = (date: Date | string | null) => {
    if (!date) return t("dash");
    return new Date(date).toLocaleString(locale === "en" ? "en-US" : "nb-NO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canClose = canCloseIncident({
    status: incident.status,
    rootCause: incident.rootCause,
    measures: incident.measures,
  });
  const closeBlockers = canClose
    ? []
    : getIncidentCloseBlockers({
        status: incident.status,
        rootCause: incident.rootCause,
        measures: incident.measures,
      });

  const completedSteps = getCompletedSteps(incident);
  const currentActiveStep = activeStep ?? getActiveStep(incident);
  const isClosed = incident.status === "CLOSED";

  return (
    <>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/incidents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("actions.backToIncidents")}
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {(incident.type === "ULYKKE" || incident.type === "YRKESSYKDOM") && tenant && (
              <NavMeldingDialog
                incident={{
                  id: incident.id,
                  avviksnummer: incident.avviksnummer,
                  type: incident.type,
                  title: incident.title,
                  description: incident.description,
                  occurredAt: incident.occurredAt,
                  location: incident.location,
                  injuryType: incident.injuryType,
                  injuryDescription: incident.injuryDescription,
                  isFatal: incident.isFatal,
                  isLostTimeIncident: incident.isLostTimeIncident,
                  lostWorkdays: incident.lostWorkdays,
                  medicalAttentionRequired: incident.medicalAttentionRequired,
                  witnessName: incident.witnessName,
                  immediateAction: incident.immediateAction,
                  reportedForUserName: null,
                }}
                tenant={tenant}
              />
            )}
            <IncidentPDFExport
              incidentId={incident.id}
              avviksnummer={incident.avviksnummer}
            />
          </div>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{incident.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
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

      {/* Stepper */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b -mx-1 px-1 py-3">
        <div className="flex items-center gap-1">
          {STEPPER_STEPS.map((step, idx) => {
            const isCompleted = completedSteps.has(step.key);
            const isActive = currentActiveStep === step.key;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => setActiveStep(step.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full",
                    isActive && "bg-primary text-primary-foreground",
                    !isActive && isCompleted && "bg-green-50 text-green-700 border border-green-200",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0" />
                  )}
                  <span className="hidden sm:inline truncate">{step.label}</span>
                </button>
                {idx < STEPPER_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-4 shrink-0 mx-1",
                      isCompleted ? "bg-green-300" : "bg-border",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Myndighetsvarsling */}
      {incident.reportedToAuthorityAt && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-start gap-3 py-4">
            <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold text-orange-900">Varslet til myndigheter (AML § 5-2)</p>
              <p className="text-sm text-orange-800">
                {formatDate(incident.reportedToAuthorityAt)}
                {incident.reportedToAuthorityBy && ` · Varslet av bruker-ID: ${incident.reportedToAuthorityBy}`}
              </p>
              {incident.reportedToAuthorityNote && (
                <p className="text-sm text-orange-700 whitespace-pre-wrap">{incident.reportedToAuthorityNote}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steg 1: Registrert / Hva skjedde */}
      {currentActiveStep === "reported" && (
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

            {incident.attachments && incident.attachments.length > 0 && (
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("sections.whatHappened.attachments", { count: incident.attachments.length })}
                </h4>
                <div className="space-y-3">
                  {incident.attachments.map((attachment: any) => {
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
      )}

      {/* Steg 2: Behandling */}
      {currentActiveStep === "treatment" && (
        <>
          {!isClosed ? (
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
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-3" />
                <p className="font-medium">Behandling er fullført</p>
              </CardContent>
            </Card>
          )}

          {/* Kompakt oppsummering av "Hva skjedde" */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <ChevronDown className={cn("h-4 w-4 transition-transform", detailsOpen && "rotate-180")} />
                {detailsOpen ? "Skjul hendelsesdetaljer" : "Vis hendelsesdetaljer"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2">
                <CardContent className="pt-4 space-y-3 text-sm">
                  <p className="whitespace-pre-wrap">{incident.description}</p>
                  <div className="flex flex-wrap gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(incident.occurredAt)}
                    </span>
                    {incident.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {incident.location}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* Steg 3: Årsaksanalyse */}
      {currentActiveStep === "rootCause" && (
        <>
          {!incident.rootCause ? (
            <InvestigationForm incidentId={incident.id} users={tenantUsers} routines={tenantRoutines} />
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
        </>
      )}

      {/* Steg 4: Tiltak */}
      {currentActiveStep === "measures" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("sections.measures.title")}</CardTitle>
                <CardDescription>{t("sections.measures.description")}</CardDescription>
              </div>
              {!isClosed && incident.rootCause && (
                <MeasureForm tenantId={data.incident.tenantId} incidentId={incident.id} users={tenantUsers} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!incident.rootCause ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="mx-auto h-8 w-8 mb-3 text-muted-foreground/50" />
                <p className="font-medium">Årsaksanalyse må gjennomføres først</p>
                <p className="text-xs mt-1">Gå til steget «Årsaksanalyse» for å registrere årsak.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setActiveStep("rootCause")}
                >
                  Gå til årsaksanalyse
                </Button>
              </div>
            ) : (
              <>
                <MeasureList measures={incident.measures} />
                {incident.measures.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t("sections.measures.empty")}</p>
                    <p className="text-xs mt-2">{t("sections.measures.emptyHint")}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Steg 5: Lukking */}
      {currentActiveStep === "close" && (
        <>
          {isClosed ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  {t("sections.closed.title")}
                </CardTitle>
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
          ) : canClose ? (
            <CloseIncidentForm
              incidentId={incident.id}
              userId={userId}
              routines={tenantRoutines}
              currentRoutineId={incident.relatedRoutineId}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t("sections.closeChecklist.title")}</CardTitle>
                <CardDescription>{t("sections.closeChecklist.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{t("sections.closeChecklist.legal")}</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    {incident.rootCause ? (
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span>{t("sections.closeChecklist.rootCause")}</span>
                    {!incident.rootCause && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setActiveStep("rootCause")}
                      >
                        Gå hit
                      </Button>
                    )}
                  </li>
                  <li className="flex items-center gap-2">
                    {incident.measures.length > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span>{t("sections.closeChecklist.measures")}</span>
                    {incident.measures.length === 0 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setActiveStep("measures")}
                      >
                        Gå hit
                      </Button>
                    )}
                  </li>
                  <li className="flex items-center gap-2">
                    {incident.measures.length > 0 &&
                    incident.measures.every((m: { status: string }) => m.status === "DONE") ? (
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span>{t("sections.closeChecklist.measuresDone")}</span>
                  </li>
                </ul>
                {closeBlockers.length > 0 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    {t("sections.closeChecklist.next", { next: closeBlockers[0] })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}
