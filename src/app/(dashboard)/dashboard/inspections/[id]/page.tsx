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
import { nb } from "date-fns/locale";
import { InspectionFindingForm } from "@/features/inspections/components/inspection-finding-form";
import { InspectionFindingList } from "@/features/inspections/components/inspection-finding-list";
import { UpdateInspectionStatusForm } from "@/features/inspections/components/update-inspection-status-form";

export const dynamic = "force-dynamic";

function getStatusBadge(status: string) {
  const variants: Record<
    string,
    { className: string; label: string }
  > = {
    PLANNED: { className: "bg-blue-100 text-blue-800", label: "Planlagt" },
    IN_PROGRESS: { className: "bg-yellow-100 text-yellow-800", label: "Pågår" },
    COMPLETED: { className: "bg-green-100 text-green-800", label: "Fullført" },
    CANCELLED: { className: "bg-red-100 text-red-800", label: "Avbrutt" },
  };
  const config = variants[status] || variants.PLANNED;
  return <Badge className={config.className}>{config.label}</Badge>;
}

function getTypeBadge(type: string) {
  const labels: Record<string, string> = {
    VERNERUNDE: "Vernerunde",
    HMS_INSPEKSJON: "HMS-inspeksjon",
    BRANNØVELSE: "Brannøvelse",
    SHA_PLAN: "SHA-plan",
    SIKKERHETSVANDRING: "Sikkerhetsvandring",
    ANDRE: "Annet",
  };
  return <Badge variant="outline">{labels[type] || type}</Badge>;
}

function getSeverityBadge(severity: number) {
  const config: Record<number, { className: string; label: string }> = {
    1: { className: "bg-blue-100 text-blue-800", label: "Lav" },
    2: { className: "bg-green-100 text-green-800", label: "Moderat" },
    3: { className: "bg-yellow-100 text-yellow-800", label: "Betydelig" },
    4: { className: "bg-orange-100 text-orange-800", label: "Alvorlig" },
    5: { className: "bg-red-100 text-red-800", label: "Kritisk" },
  };
  const severityConfig = config[severity] || config[1];
  return <Badge className={severityConfig.className}>{severityConfig.label}</Badge>;
}

function getFindingStatusBadge(status: string) {
  const config: Record<string, { className: string; label: string }> = {
    OPEN: { className: "bg-red-100 text-red-800", label: "Åpen" },
    IN_PROGRESS: { className: "bg-yellow-100 text-yellow-800", label: "Pågår" },
    RESOLVED: { className: "bg-green-100 text-green-800", label: "Løst" },
    CLOSED: { className: "bg-gray-100 text-gray-800", label: "Lukket" },
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
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!currentUser || currentUser.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = currentUser.tenants[0].tenantId;

  const inspection = await prisma.inspection.findUnique({
    where: { id, tenantId },
    include: {
      findings: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!inspection) {
    return <div>Inspeksjon ikke funnet</div>;
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

  // Hent alle brukere for tenant (for å kunne legge til funn)
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
            <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til inspeksjoner
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{inspection.title}</h1>
            <p className="text-muted-foreground">Inspeksjonsdetaljer</p>
          </div>
          <div className="flex items-center gap-2">
            {getTypeBadge(inspection.type)}
            {getStatusBadge(inspection.status)}
            <UpdateInspectionStatusForm inspectionId={inspection.id} currentStatus={inspection.status} />
            <Link href={`/dashboard/inspections/${inspection.id}/mobil`}>
              <Button className="bg-green-600 hover:bg-green-700" size="sm">
                <Smartphone className="mr-2 h-4 w-4" />
                Mobilvisning
              </Button>
            </Link>
            <Link href={`/dashboard/inspections/${inspection.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Rediger
              </Button>
            </Link>
            <Link href={`/api/inspections/${inspection.id}/report`} target="_blank">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Last ned rapport
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Planlagt dato</p>
                <p className="font-medium">
                  {format(new Date(inspection.scheduledDate), "d. MMMM yyyy", { locale: nb })}
                </p>
              </div>
            </div>

            {inspection.completedDate && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Fullført</p>
                  <p className="font-medium">
                    {format(new Date(inspection.completedDate), "d. MMMM yyyy", { locale: nb })}
                  </p>
                </div>
              </div>
            )}

            {inspection.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Lokasjon</p>
                  <p className="font-medium">{inspection.location}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle>Gjennomført av</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Ansvarlig</p>
                <p className="font-medium">{conductedByUser?.name || "Ukjent"}</p>
                <p className="text-sm text-muted-foreground">{conductedByUser?.email}</p>
              </div>
            </div>

            {participants.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Deltakere</p>
                  {participants.map((participant) => (
                    <div key={participant.id} className="mt-1">
                      <p className="font-medium">{participant.name || "Ukjent"}</p>
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
            <CardTitle>Beskrivelse</CardTitle>
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
            <CardTitle className="text-orange-900">Funn fra inspeksjon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-orange-900">Kritiske</p>
                <p className="text-3xl font-bold text-red-600">{findingStats.critical}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Alvorlige</p>
                <p className="text-3xl font-bold text-orange-600">{findingStats.high}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Moderate</p>
                <p className="text-3xl font-bold text-yellow-600">{findingStats.medium}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Lave</p>
                <p className="text-3xl font-bold text-green-600">{findingStats.low}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-orange-200">
              <div className="grid gap-4 md:grid-cols-4 text-sm">
                <div>
                  <p className="text-orange-900 font-medium">Åpne</p>
                  <p className="text-2xl font-bold">{findingStats.open}</p>
                </div>
                <div>
                  <p className="text-orange-900 font-medium">Pågår</p>
                  <p className="text-2xl font-bold">{findingStats.inProgress}</p>
                </div>
                <div>
                  <p className="text-orange-900 font-medium">Løst</p>
                  <p className="text-2xl font-bold">{findingStats.resolved}</p>
                </div>
                <div>
                  <p className="text-orange-900 font-medium">Lukket</p>
                  <p className="text-2xl font-bold">{findingStats.closed}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Funn og observasjoner</CardTitle>
              <CardDescription>
                {findingStats.total > 0
                  ? `${findingStats.total} funn registrert`
                  : "Dokumenter avvik, observasjoner eller forbedringsområder"}
              </CardDescription>
            </div>
            <InspectionFindingForm inspectionId={inspection.id} users={tenantUsers} />
          </div>
        </CardHeader>
        <CardContent>
          {inspection.findings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Ingen funn registrert ennå</p>
              <p className="text-sm mt-1">Bruk knappen over for å legge til funn</p>
            </div>
          ) : (
            <InspectionFindingList findings={inspection.findings} />
          )}
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 HMS Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>Inspeksjon planlagt og dokumentert</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>Ansvarlig person utnevnt</span>
          </div>
          <div className="flex items-center gap-2">
            {inspection.completedDate ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span>
              Inspeksjon {inspection.completedDate ? "fullført" : "ikke fullført ennå"}
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
                ? `${findingStats.total} funn dokumentert`
                : "Ingen funn dokumentert"}
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
                ? `${findingStats.open} åpne funn (krever oppfølging)`
                : findingStats.total > 0
                ? "Alle funn er lukket"
                : "Ingen funn"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

