import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getRuhCategoryLabel,
  getRuhCategoryColor,
  getRuhStatusLabel,
  getRuhStatusColor,
} from "@/features/ruh/schemas/ruh.schema";
import { RuhPDFExport } from "@/components/ruh/ruh-pdf-export";
import { RuhStatusActions } from "@/components/ruh/ruh-status-actions";
import { ArrowLeft, User, MapPin, Clock, FileWarning, AlertTriangle, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function RuhDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const report = await prisma.ruhReport.findUnique({
    where: { id, tenantId },
    include: {
      attachments: true,
    },
  });

  if (!report) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">RUH-rapport ikke funnet</h2>
        <Link href="/dashboard/ruh" className="text-primary hover:underline mt-4 block">
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

  const images = report.attachments.filter((a) => a.mime.startsWith("image/"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/ruh" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{report.title}</h1>
            </div>
            {report.ruhNummer && (
              <p className="text-sm text-muted-foreground font-mono">{report.ruhNummer}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RuhPDFExport
            ruhId={report.id}
            ruhNummer={report.ruhNummer}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={getRuhCategoryColor(report.category)}>
          {getRuhCategoryLabel(report.category)}
        </Badge>
        <Badge variant="outline" className={getRuhStatusColor(report.status)}>
          {getRuhStatusLabel(report.status)}
        </Badge>
        {report.injuryOccurred && (
          <Badge variant="destructive">Personskade</Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="h-5 w-5" />
                Hendelsebeskrivelse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{report.description}</p>
            </CardContent>
          </Card>

          {report.involvedPersons && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Involverte personer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{report.involvedPersons}</p>
              </CardContent>
            </Card>
          )}

          {report.injuryOccurred && report.injuryDescription && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Skadebeskrivelse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{report.injuryDescription}</p>
              </CardContent>
            </Card>
          )}

          {report.immediateAction && (
            <Card>
              <CardHeader>
                <CardTitle>Umiddelbare tiltak</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{report.immediateAction}</p>
              </CardContent>
            </Card>
          )}

          {report.suggestedActions && (
            <Card>
              <CardHeader>
                <CardTitle>Foreslåtte forebyggende tiltak</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{report.suggestedActions}</p>
              </CardContent>
            </Card>
          )}

          {images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Bilder ({images.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img) => (
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

          {(report.reviewComment || report.completedComment) && (
            <Card>
              <CardHeader>
                <CardTitle>Behandlingskommentarer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.reviewComment && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Vurderingskommentar:</p>
                    <p className="whitespace-pre-wrap">{report.reviewComment}</p>
                  </div>
                )}
                {report.completedComment && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Avslutningskommentar:</p>
                    <p className="whitespace-pre-wrap">{report.completedComment}</p>
                  </div>
                )}
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
                  <p className="text-muted-foreground">Hendelsestidspunkt</p>
                  <p className="font-medium">{formatDate(report.occurredAt)}</p>
                </div>
              </div>

              {report.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Sted</p>
                    <p className="font-medium">{report.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Rapportert av</p>
                  <p className="font-medium">{report.reportedBy}</p>
                </div>
              </div>

              {report.witnessName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Vitner</p>
                    <p className="font-medium">{report.witnessName}</p>
                  </div>
                </div>
              )}

              <div className="text-sm">
                <p className="text-muted-foreground">Innsendt</p>
                <p className="font-medium">{formatDate(report.createdAt)}</p>
              </div>

              {report.reviewedAt && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Gjennomgått</p>
                  <p className="font-medium">{formatDate(report.reviewedAt)}</p>
                </div>
              )}

              {report.completedAt && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Ferdigbehandlet</p>
                  <p className="font-medium">{formatDate(report.completedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <RuhStatusActions reportId={report.id} currentStatus={report.status} />
        </div>
      </div>
    </div>
  );
}
