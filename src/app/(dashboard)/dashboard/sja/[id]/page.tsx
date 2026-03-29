import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  ArrowLeft,
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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function SjaDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = selectedMembership.tenantId;

  const analysis = await prisma.sjaAnalysis.findUnique({
    where: { id, tenantId },
    include: {
      hazards: { orderBy: { sortOrder: "asc" } },
      attachments: true,
    },
  });

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">SJA ikke funnet</h2>
        <Link href="/dashboard/sja" className="text-primary hover:underline mt-4 block">
          Tilbake til oversikt
        </Link>
      </div>
    );
  }

  const formatDate = (date: Date | null) => {
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
    ? Math.max(...analysis.hazards.map((h) => h.riskLevel))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sja" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{analysis.title}</h1>
            </div>
            {analysis.sjaNummer && (
              <p className="text-sm text-muted-foreground font-mono">{analysis.sjaNummer}</p>
            )}
          </div>
        </div>
      </div>

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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Fareidentifikasjon og tiltak ({analysis.hazards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.hazards.map((hazard, index) => (
                  <div key={hazard.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <Badge variant="secondary">{hazard.activity}</Badge>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskColor(
                          hazard.riskLevel
                        )}`}
                      >
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
                  Bilder ({analysis.attachments.filter((a) => a.mime.startsWith("image/")).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {analysis.attachments
                    .filter((a) => a.mime.startsWith("image/"))
                    .map((img) => (
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

          <SjaStatusActions
            analysisId={analysis.id}
            currentStatus={analysis.status}
            currentConclusion={analysis.conclusion}
          />
        </div>
      </div>
    </div>
  );
}
