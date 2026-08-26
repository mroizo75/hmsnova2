"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrainingEvaluationForm } from "@/features/training/components/training-evaluation-form";
import {
  getTrainingStatus,
  getTrainingStatusLabel,
  getTrainingStatusColor,
} from "@/features/training/schemas/training.schema";
import { Calendar, Building2, User, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { CertificateDownloadButton } from "@/features/training/components/certificate-download-button";
import { fetchTrainingDetail } from "@/server/queries/training.queries";

type TrainingDetailData = NonNullable<Awaited<ReturnType<typeof fetchTrainingDetail>>>;

interface TrainingDetailContentProps {
  initialData: TrainingDetailData;
  currentUserId: string;
}

export function TrainingDetailContent({ initialData, currentUserId }: TrainingDetailContentProps) {
  const { data } = useQuery({
    queryKey: ["training", initialData.training.id],
    queryFn: () => fetchTrainingDetail(initialData.training.id),
    initialData,
  });

  if (!data) return null;

  const { training, trainedUser } = data;
  const status = getTrainingStatus(training);
  const statusLabel = getTrainingStatusLabel(status);
  const statusColor = getTrainingStatusColor(status);

  const daysUntilExpiry = training.validUntil
    ? Math.ceil((new Date(training.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{training.title}</h1>
          <p className="text-muted-foreground">Opplæringsdetaljer</p>
        </div>
        <Badge className={statusColor}>{statusLabel}</Badge>
      </div>

      {(status === "EXPIRING_SOON" || status === "EXPIRED") && (
        <Card className={status === "EXPIRED" ? "border-red-300 bg-red-50" : "border-yellow-300 bg-yellow-50"}>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className={status === "EXPIRED" ? "h-5 w-5 text-red-600" : "h-5 w-5 text-yellow-600"} />
            <div>
              <p className={`font-semibold ${status === "EXPIRED" ? "text-red-900" : "text-yellow-900"}`}>
                {status === "EXPIRED" ? "⚠️ Opplæringen er utløpt" : "⏰ Opplæringen utløper snart"}
              </p>
              <p className={status === "EXPIRED" ? "text-red-800" : "text-yellow-800"}>
                {status === "EXPIRED"
                  ? "Denne opplæringen må fornyes så snart som mulig."
                  : `Opplæringen utløper om ${daysUntilExpiry} dager. Planlegg fornyelse.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kursinformasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leverandør</p>
                <p className="font-medium">{training.provider}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ansatt</p>
                <p className="font-medium">{trainedUser?.name || "Ukjent"}</p>
                <p className="text-sm text-muted-foreground">{trainedUser?.email}</p>
              </div>
            </div>
            {training.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Beskrivelse</p>
                <p className="text-sm">{training.description}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              {training.isRequired ? (
                <Badge variant="destructive">Påkrevd kurs</Badge>
              ) : (
                <Badge variant="outline">Valgfritt kurs</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datoer og gyldighet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gjennomført dato</p>
                <p className="font-medium">
                  {training.completedAt
                    ? new Date(training.completedAt).toLocaleDateString("nb-NO", {
                        day: "numeric", month: "long", year: "numeric",
                      })
                    : "Ikke gjennomført ennå"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gyldig til</p>
                <p className="font-medium">
                  {training.validUntil ? (
                    <>
                      {new Date(training.validUntil).toLocaleDateString("nb-NO", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                      {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({daysUntilExpiry} dager igjen)
                        </span>
                      )}
                    </>
                  ) : (
                    "Utløper ikke"
                  )}
                </p>
              </div>
            </div>
            {training.proofDocKey && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dokumentert bevis</p>
                  <CertificateDownloadButton trainingId={training.id} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Effektivitetsvurdering (ISO 9001 - 7.2c)
          </CardTitle>
          <CardDescription>
            Evaluer om opplæringen har gitt ønsket kompetanse og effekt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {training.effectiveness ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-green-50 p-4">
                <p className="text-sm font-medium text-green-900 mb-2">
                  ✅ Opplæringen er evaluert
                </p>
                <p className="text-sm text-green-800 whitespace-pre-wrap">
                  {training.effectiveness}
                </p>
              </div>
              {training.evaluatedAt && (
                <p className="text-sm text-muted-foreground">
                  Evaluert {new Date(training.evaluatedAt).toLocaleDateString("nb-NO")}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Opplæringen er ikke evaluert ennå. Evaluer effektiviteten for å oppfylle ISO
                9001 krav.
              </p>
              <TrainingEvaluationForm
                trainingId={training.id}
                trainingTitle={training.title}
                userId={currentUserId}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 ISO 9001 Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>Kompetanse dokumentert basert på opplæring</span>
          </div>
          <div className="flex items-center gap-2">
            {training.proofDocKey ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span>Dokumentert bevis (sertifikat) {training.proofDocKey ? "lastet opp" : "mangler"}</span>
          </div>
          <div className="flex items-center gap-2">
            {training.effectiveness ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span>Effektivitet {training.effectiveness ? "evaluert" : "ikke evaluert"}</span>
          </div>
          <div className="flex items-center gap-2">
            {status === "VALID" || status === "COMPLETED" ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span>Status: {statusLabel}</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
