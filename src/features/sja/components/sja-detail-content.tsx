"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getSjaStatusLabel,
  getSjaStatusColor,
  getSjaConclusionLabel,
  getSjaConclusionColor,
  getRiskColor,
  getRiskLabel,
} from "@/features/sja/schemas/sja.schema";
import { SjaStatusActions } from "@/components/sja/sja-status-actions";
import {
  User,
  MapPin,
  Clock,
  HardHat,
  AlertTriangle,
  CheckCircle,
  Users,
  BookTemplate,
  CloudSun,
  ShieldAlert,
  Image as ImageIcon,
  Zap,
  ClipboardList,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ResourceHistory } from "@/components/shared/resource-history";
import { fetchSjaDetail } from "@/server/queries/sja.queries";
import { MocRelatedCard } from "@/features/moc/components/moc-related-card";

type SjaDetailData = NonNullable<Awaited<ReturnType<typeof fetchSjaDetail>>>;

interface SjaDetailContentProps {
  initialData: SjaDetailData;
  history: any[];
}

export function SjaDetailContent({ initialData, history }: SjaDetailContentProps) {
  const { data: analysis } = useQuery({
    queryKey: ["sja", initialData.id],
    queryFn: () => fetchSjaDetail(initialData.id),
    initialData,
  });

  if (!analysis) return null;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("no-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const maxRisk = analysis.hazards.length > 0
    ? Math.max(...analysis.hazards.map((h: any) => h.riskLevel))
    : 0;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={getSjaStatusColor(analysis.status)}>
          {getSjaStatusLabel(analysis.status)}
        </Badge>
        <Badge variant="outline" className={getSjaConclusionColor(analysis.conclusion)}>
          {getSjaConclusionLabel(analysis.conclusion)}
        </Badge>
        {maxRisk >= 10 && (
          <Badge variant="destructive">
            Høy risiko (maks {maxRisk})
          </Badge>
        )}
        {analysis.templateName && (
          <Badge variant="secondary" className="text-xs">
            <BookTemplate className="h-3 w-3 mr-1" />
            Fra mal: {analysis.templateName}
          </Badge>
        )}
        {analysis.sourceRiskAssessment && (
          <Link
            href={`/dashboard/risks/assessment/${analysis.sourceRiskAssessment.id}`}
            className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Badge variant="secondary" className="text-xs">
              <ClipboardList className="mr-1 h-3 w-3" />
              Fra risikovurdering: {analysis.sourceRiskAssessment.title}
            </Badge>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {analysis.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardHat className="h-5 w-5" />
                  Beskrivelse av arbeidet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{analysis.description}</p>
              </CardContent>
            </Card>
          )}

          {(analysis.additionalConditions || analysis.weatherConditions) && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <ShieldAlert className="h-5 w-5" />
                  Spesielle forhold
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.weatherConditions && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-1">
                      <CloudSun className="h-4 w-4" /> Værforhold
                    </p>
                    <p className="text-sm">{analysis.weatherConditions}</p>
                  </div>
                )}
                {analysis.additionalConditions && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Tilleggsforhold / endringer</p>
                    <p className="text-sm whitespace-pre-wrap">{analysis.additionalConditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {analysis.electricalWorkType !== "NOT_APPLICABLE" && (
            <Card className="border-amber-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Zap className="h-5 w-5" />
                  FSE og arbeidsforutsetninger
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {[
                  ["Arbeidsmetode", analysis.workMethod],
                  ["Nødvendig utstyr", analysis.requiredEquipment],
                  ["Personlig verneutstyr", analysis.requiredPpe],
                  ["Krav til personell", analysis.personnelRequirements],
                  ["Sikkerhetsbetingelser", analysis.safetyConditions],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label}>
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <p className="whitespace-pre-wrap text-sm">{value}</p>
                    </div>
                  ) : null,
                )}
                {analysis.requiresSecondPerson && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Person nummer to</p>
                    <p className="text-sm">
                      {analysis.participantRecords.length >= 2
                        ? "Registrert"
                        : analysis.secondPersonException || "Ikke dokumentert"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Fareidentifikasjon og tiltak ({analysis.hazards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.hazards.map((hazard: any, index: number) => (
                  <div key={hazard.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                        <Badge variant="secondary">{hazard.activity}</Badge>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskColor(hazard.riskLevel)}`}>
                        Risiko: {hazard.riskLevel} – {getRiskLabel(hazard.riskLevel)}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Fare</p>
                        <p className="text-sm">{hazard.hazard}</p>
                      </div>
                      {hazard.consequence && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Konsekvens</p>
                          <p className="text-sm">{hazard.consequence}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Sannsynlighet</p>
                        <p className="text-sm font-medium">{hazard.probability} / 5</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Konsekvens</p>
                        <p className="text-sm font-medium">{hazard.severity} / 5</p>
                      </div>
                      {hazard.responsibleName && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Ansvarlig</p>
                          <p className="text-sm font-medium">{hazard.responsibleName}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Tiltak / barrierer</p>
                      <p className="text-sm whitespace-pre-wrap bg-green-50 p-2 rounded border border-green-200">
                        {hazard.measures}
                      </p>
                    </div>

                    {hazard.completed && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Tiltak gjennomført
                      </div>
                    )}

                    {hazard.linkedRisk && (
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/dashboard/risks/${hazard.linkedRisk.id}`}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors"
                        >
                          <ShieldAlert className="h-3 w-3" />
                          Risiko: {hazard.linkedRisk.title}
                          {hazard.linkedRisk.score != null && (
                            <span className="font-medium ml-1">(score: {hazard.linkedRisk.score})</span>
                          )}
                        </Link>
                      </div>
                    )}
                    {hazard.riskSnapshot &&
                      typeof hazard.riskSnapshot === "object" &&
                      "capturedAt" in hazard.riskSnapshot &&
                      typeof hazard.riskSnapshot.capturedAt === "string" && (
                        <p className="text-xs text-muted-foreground">
                          Kildeinnholdet ble kopiert{" "}
                          {new Date(hazard.riskSnapshot.capturedAt).toLocaleString("no-NO")}.
                          Senere endringer i risikovurderingen oppdaterer ikke denne SJA-en.
                        </p>
                      )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {analysis.attachments && analysis.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Bilder ({analysis.attachments.filter((a: any) => a.mime.startsWith("image/")).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {analysis.attachments
                    .filter((a: any) => a.mime.startsWith("image/"))
                    .map((img: any) => (
                      <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border">
                        <Image
                          src={`/api/files/${img.fileKey}`}
                          alt={img.name}
                          fill
                          className="object-cover"
                        />
                        <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                          {img.name}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analysis.conclusionComment && (
            <Card>
              <CardHeader>
                <CardTitle>Konklusjonskommentar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{analysis.conclusionComment}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <MocRelatedCard
            links={analysis.mocLinks}
            moduleEnabled={analysis.mocModuleEnabled}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detaljer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Planlagt dato</p>
                  <p className="font-medium">{formatDate(analysis.plannedDate)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Arbeidssted</p>
                  <p className="font-medium">{analysis.workLocation}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Ansvarlig</p>
                  <p className="font-medium">{analysis.responsibleName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Opprettet av</p>
                  <p className="font-medium">{analysis.createdByName}</p>
                </div>
              </div>

              {analysis.participants && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Deltakere</p>
                    <p className="font-medium whitespace-pre-wrap">{analysis.participants}</p>
                  </div>
                </div>
              )}

              {analysis.participantRecords.length > 0 && (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Deltakerbekreftelser</p>
                  {analysis.participantRecords.map((participant: any) => (
                    <div key={participant.id} className="rounded border p-2">
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Kompetanse: {participant.competenceStatus}
                        {participant.isExternal
                          ? " · Ekstern deltaker, manuelt kontrollert"
                          : participant.acknowledgedAt &&
                        participant.acknowledgedVersion &&
                        new Date(participant.acknowledgedVersion).getTime() ===
                          new Date(analysis.contentVersion).getTime()
                          ? ` · Bekreftet ${formatDate(participant.acknowledgedAt)}`
                          : " · Ikke bekreftet"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-sm">
                <p className="text-muted-foreground">Opprettet</p>
                <p className="font-medium">{formatDate(analysis.createdAt)}</p>
              </div>

              {analysis.approvedAt && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Godkjent</p>
                  <p className="font-medium">{formatDate(analysis.approvedAt)}</p>
                  {analysis.approvedByName && (
                    <p className="text-xs text-muted-foreground">av {analysis.approvedByName}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {analysis.canApproveSja && (
            <SjaStatusActions
              analysisId={analysis.id}
              currentStatus={analysis.status}
              currentConclusion={analysis.conclusion}
            />
          )}

          {history.length > 0 && <ResourceHistory entries={history} />}
        </div>
      </div>
    </>
  );
}
