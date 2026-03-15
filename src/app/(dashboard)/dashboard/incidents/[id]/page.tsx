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
  getIncidentTypeLabel,
  getIncidentTypeColor,
  getSeverityInfo,
  getIncidentStatusLabel,
  getIncidentStatusColor,
} from "@/features/incidents/schemas/incident.schema";
import { ArrowLeft, AlertTriangle, User, MapPin, Eye, Clock, FileText } from "lucide-react";
import Link from "next/link";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = user.tenants[0].tenantId;

  const incident = await prisma.incident.findUnique({
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

  if (!incident) {
    return <div>Avvik ikke funnet</div>;
  }

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

  const typeLabel = getIncidentTypeLabel(incident.type);
  const typeColor = getIncidentTypeColor(incident.type);
  const { label: severityLabel, bgColor: severityColor, textColor: severityTextColor } = getSeverityInfo(incident.severity);
  const statusLabel = getIncidentStatusLabel(incident.status);
  const statusColor = getIncidentStatusColor(incident.status);

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("no-NO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const allMeasuresCompleted = incident.measures.length > 0 && incident.measures.every(m => m.status === "DONE");
  const canClose = incident.rootCause && allMeasuresCompleted && incident.status !== "CLOSED";

  const pdfIncidentData = {
    avviksnummer: incident.avviksnummer,
    title: incident.title,
    type: incident.type,
    severity: String(incident.severity),
    status: incident.status,
    description: incident.description,
    occurredAt: incident.occurredAt,
    location: incident.location,
    witnessName: incident.witnessName,
    immediateAction: incident.immediateAction,
    rootCause: incident.rootCause,
    contributingFactors: incident.contributingFactors,
    effectivenessReview: incident.effectivenessReview,
    lessonsLearned: incident.lessonsLearned,
    attachments: incident.attachments.map(a => ({
      id: a.id,
      fileKey: a.fileKey,
      name: a.name,
      mime: a.mime,
    })),
    measures: incident.measures.map(m => ({
      id: m.id,
      description: m.description || m.title,
      responsibleName: m.responsible?.name || m.responsible?.email,
      deadline: m.dueAt,
      status: m.status,
      completedAt: m.completedAt,
    })),
    createdAt: incident.createdAt,
    closedAt: incident.closedAt,
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/incidents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbake til avvik
            </Link>
          </Button>
          <IncidentPDFExport
            incident={pdfIncidentData}
            typeLabel={typeLabel}
            severityLabel={severityLabel}
            statusLabel={statusLabel}
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
                Alvorlighet: {incident.severity} - {severityLabel}
              </Badge>
              <Badge className={statusColor}>{statusLabel}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ISO 9001: a) Reagere på avvik */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Hva skjedde?
          </CardTitle>
          <CardDescription>ISO 9001: Natur av avvik</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Beskrivelse</h4>
            <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-semibold mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tidspunkt
              </h4>
              <p className="text-sm text-muted-foreground">{formatDate(incident.occurredAt)}</p>
            </div>

            {incident.location && (
              <div>
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Sted
                </h4>
                <p className="text-sm text-muted-foreground">{incident.location}</p>
              </div>
            )}

            {incident.witnessName && (
              <div>
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vitner
                </h4>
                <p className="text-sm text-muted-foreground">{incident.witnessName}</p>
              </div>
            )}
          </div>

          {(incident.injuryType || typeof incident.lostTimeMinutes === "number" || incident.medicalAttentionRequired || incident.risk) && (
            <div className="grid gap-4 md:grid-cols-3">
              {(incident.injuryType || incident.medicalAttentionRequired) && (
                <div>
                  <h4 className="font-semibold mb-1">Skade</h4>
                  <p className="text-sm text-muted-foreground">
                    {incident.injuryType || "Ingen skade registrert"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {incident.medicalAttentionRequired ? "Legebehandling nødvendig" : "Ingen legebehandling"}
                  </p>
                </div>
              )}

              {typeof incident.lostTimeMinutes === "number" && (
                <div>
                  <h4 className="font-semibold mb-1">Tapt tid</h4>
                  <p className="text-sm text-muted-foreground">
                    {incident.lostTimeMinutes} minutter
                  </p>
                </div>
              )}

              {incident.risk && (
                <div>
                  <h4 className="font-semibold mb-1">Knyttet risiko</h4>
                  <Link
                    href={`/dashboard/risks/${incident.risk.id}`}
                    className="text-sm text-primary underline"
                  >
                    {incident.risk.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Score {incident.risk.score}
                  </p>
                </div>
              )}
            </div>
          )}

          {incident.immediateAction && (
            <div>
              <h4 className="font-semibold mb-2">Umiddelbare tiltak</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {incident.immediateAction}
              </p>
            </div>
          )}

          {/* Bilder og vedlegg */}
          {incident.attachments && incident.attachments.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Vedlegg ({incident.attachments.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {incident.attachments.map((attachment, index) => {
                  const isImage = attachment.mime.startsWith("image/");
                  return (
                    <a
                      key={attachment.id}
                      href={`/api/files/${attachment.fileKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors"
                    >
                      {isImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/files/${attachment.fileKey}`}
                            alt={attachment.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-4">
                          <FileText className="h-12 w-12 text-gray-400 mb-2" />
                          <p className="text-xs text-center text-gray-600 truncate w-full">{attachment.name}</p>
                        </div>
                      )}
                    </a>
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
            <CardTitle>Behandle avvik</CardTitle>
            <CardDescription>Oppdater type, prosjekt, status, alvorlighet og ansvarlig</CardDescription>
          </CardHeader>
          <CardContent>
            <IncidentTreatmentForm
              incidentId={incident.id}
              currentType={incident.type}
              currentSubcategoryKeys={parsedSubcategoryKeys}
              currentProjectId={incident.projectId}
              currentStatus={incident.status}
              currentSeverity={incident.severity}
              currentResponsibleId={incident.responsibleId}
              currentMedicalAttentionRequired={incident.medicalAttentionRequired}
              currentIsFatal={incident.isFatal}
              currentIsLostTimeIncident={incident.isLostTimeIncident}
              currentLostWorkdays={incident.lostWorkdays}
              currentIsRestrictedWork={incident.isRestrictedWork}
              users={tenantUsers}
              projects={tenantProjects}
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
            <CardTitle>Årsaksanalyse (Root Cause Analysis)</CardTitle>
            <CardDescription>ISO 9001: Identifisere årsaken til avviket</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Grunnårsak</h4>
              <p className="text-sm whitespace-pre-wrap">{incident.rootCause}</p>
            </div>

            {incident.contributingFactors && (
              <div>
                <h4 className="font-semibold mb-2">Medvirkende faktorer</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {incident.contributingFactors}
                </p>
              </div>
            )}

            {incident.investigatedAt && (
              <div className="text-sm text-muted-foreground">
                Utredet: {formatDate(incident.investigatedAt)}
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
                <CardTitle>Korrigerende tiltak</CardTitle>
                <CardDescription>
                  ISO 9001: Planlagte tiltak for å eliminere årsaken
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
                <p>Ingen tiltak planlagt ennå</p>
                <p className="text-xs mt-2">Klikk "Legg til tiltak" ovenfor</p>
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
            <CardTitle>Avvik lukket</CardTitle>
            <CardDescription>ISO 9001: Effektivitetsvurdering</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {incident.effectivenessReview && (
              <div>
                <h4 className="font-semibold mb-2">Effektivitetsvurdering</h4>
                <p className="text-sm whitespace-pre-wrap">{incident.effectivenessReview}</p>
              </div>
            )}

            {incident.lessonsLearned && (
              <div>
                <h4 className="font-semibold mb-2">Læringspunkter</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {incident.lessonsLearned}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-green-600">
              <User className="h-4 w-4" />
              <span>Lukket: {formatDate(incident.closedAt)}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

