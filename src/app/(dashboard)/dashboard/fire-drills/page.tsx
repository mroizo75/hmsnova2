import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { format, differenceInMonths } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Plus,
  Flame,
  CheckCircle,
  Clock,
  AlertTriangle,
  CalendarDays,
  MapPin,
  User,
  ClipboardCheck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FIRE_DRILL_TYPE_LABELS,
  FIRE_DRILL_STATUS_LABELS,
} from "@/features/fire-drills/schemas/fire-drill.schema";
import type { FireDrillStatus, FireDrillType } from "@/features/fire-drills/schemas/fire-drill.schema";

function getStatusBadge(status: FireDrillStatus) {
  const map: Record<FireDrillStatus, { label: string; className: string }> = {
    PLANNED: { label: "Planlagt", className: "bg-blue-100 text-blue-800 border-blue-200" },
    IN_PROGRESS: { label: "Pågår", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    COMPLETED: { label: "Gjennomført", className: "bg-orange-100 text-orange-800 border-orange-200" },
    EVALUATED: { label: "Evaluert", className: "bg-green-100 text-green-800 border-green-200" },
    CANCELLED: { label: "Avlyst", className: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  return map[status] ?? map.PLANNED;
}

function getTypeBadge(type: FireDrillType) {
  const map: Record<FireDrillType, string> = {
    EVACUATION: "bg-red-50 text-red-700 border-red-200",
    FIRE_SUPPRESSION: "bg-orange-50 text-orange-700 border-orange-200",
    ALARM_TEST: "bg-purple-50 text-purple-700 border-purple-200",
    FULL_SCALE: "bg-red-100 text-red-900 border-red-300",
  };
  return map[type] ?? "";
}

export default async function FireDrillsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);
  if (!permissions.canReadInspections) {
    redirect("/dashboard");
  }

  const [drills, users] = await Promise.all([
    prisma.fireDrill.findMany({
      where: { tenantId: session.user.tenantId },
      include: { measures: { select: { id: true, status: true } } },
      orderBy: { plannedDate: "desc" },
    }),
    prisma.userTenant.findMany({
      where: { tenantId: session.user.tenantId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const userMap = Object.fromEntries(
    users.map((ut) => [ut.userId, ut.user.name ?? ut.user.id]),
  );

  const stats = {
    total: drills.length,
    planned: drills.filter((d) => d.status === "PLANNED").length,
    completed: drills.filter((d) => d.status === "COMPLETED").length,
    evaluated: drills.filter((d) => d.status === "EVALUATED").length,
  };

  // DSB-anbefaling: minst én fullskala/evakueringsøvelse per år
  const lastEvaluation = drills
    .filter((d) => d.status === "EVALUATED" && d.evaluatedAt)
    .sort((a, b) => (b.evaluatedAt?.getTime() ?? 0) - (a.evaluatedAt?.getTime() ?? 0))[0];

  const monthsSinceLast = lastEvaluation?.evaluatedAt
    ? differenceInMonths(new Date(), lastEvaluation.evaluatedAt)
    : null;

  const showAnnualReminder = monthsSinceLast === null || monthsSinceLast >= 10;

  return (
    <div className="space-y-6">
      {/* Topptekst */}
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <Flame className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Brannøvelser</h1>
            <p className="text-muted-foreground mt-1">
              Planlegg, gjennomfør og evaluer brannøvelser — Forskrift om brannforebygging § 12 og § 13
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/fire-drills/new">
            <Plus className="mr-2 h-4 w-4" />
            Planlegg ny øvelse
          </Link>
        </Button>
      </div>

      {/* DSB-påminnelse om årlig øvelse */}
      {showAnnualReminder && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>DSB-anbefaling:</strong>{" "}
            {monthsSinceLast === null
              ? "Ingen fullskala brannøvelse er registrert ennå."
              : `Siste evaluerte øvelse var for ${monthsSinceLast} måneder siden.`}{" "}
            Det anbefales minst én fullskala evakueringsøvelse per år (Forskrift om brannforebygging § 12).
          </AlertDescription>
        </Alert>
      )}

      {/* Statistikk-kort */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Alle registrerte øvelser</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Planlagte</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.planned}</div>
            <p className="text-xs text-muted-foreground">Kommende øvelser</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gjennomført</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Venter på evaluering</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Evaluert</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.evaluated}</div>
            <p className="text-xs text-muted-foreground">§ 13 dokumentasjon fullført</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabell */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Øvelseshistorikk
          </CardTitle>
        </CardHeader>
        <CardContent>
          {drills.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Flame className="mx-auto mb-4 h-10 w-10 opacity-30" />
              <p className="font-medium">Ingen øvelser registrert ennå</p>
              <p className="mt-1 text-sm">
                Planlegg din første brannøvelse for å oppfylle kravene i§ 12 og § 13.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/dashboard/fire-drills/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Planlegg ny øvelse
                </Link>
              </Button>
            </div>
          ) : (
            <>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tittel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Planlagt dato</TableHead>
                  <TableHead>Lokasjon</TableHead>
                  <TableHead>Øvingsleder</TableHead>
                  <TableHead>Deltakere</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tiltak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drills.map((drill) => {
                  const statusStyle = getStatusBadge(drill.status);
                  const typeStyle = getTypeBadge(drill.drillType);
                  const openMeasures = drill.measures.filter(
                    (m) => m.status === "PENDING" || m.status === "IN_PROGRESS",
                  ).length;
                  return (
                    <TableRow key={drill.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link
                          href={`/dashboard/fire-drills/${drill.id}`}
                          className="font-medium hover:underline"
                        >
                          {drill.title}
                        </Link>
                        {!drill.isAnnounced && (
                          <span className="ml-2 text-xs text-muted-foreground">(uvarslet)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeStyle}>
                          {FIRE_DRILL_TYPE_LABELS[drill.drillType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(drill.plannedDate), "d. MMM yyyy", { locale: nb })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {drill.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {userMap[drill.responsibleId] ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {drill.actualParticipantCount != null ? (
                          <span className="text-sm font-medium">{drill.actualParticipantCount}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusStyle.className}`}
                        >
                          {statusStyle.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {openMeasures > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {openMeasures} åpne
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            <div className="space-y-3 md:hidden">
              {drills.map((drill) => {
                const statusStyle = getStatusBadge(drill.status);
                const typeStyle = getTypeBadge(drill.drillType);
                const openMeasures = drill.measures.filter(
                  (m) => m.status === "PENDING" || m.status === "IN_PROGRESS",
                ).length;
                return (
                  <div key={drill.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/dashboard/fire-drills/${drill.id}`} className="font-medium hover:underline">
                          {drill.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">{drill.location}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-xs ${statusStyle.className}`}>
                        {statusStyle.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className={typeStyle}>
                        {FIRE_DRILL_TYPE_LABELS[drill.drillType]}
                      </Badge>
                      <span>{format(new Date(drill.plannedDate), "d. MMM yyyy", { locale: nb })}</span>
                      {openMeasures > 0 ? (
                        <Badge variant="destructive" className="text-xs">{openMeasures} åpne</Badge>
                      ) : null}
                    </div>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={`/dashboard/fire-drills/${drill.id}`}>Åpne</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lovgrunnlag-footer */}
      <div className="rounded-lg border border-red-100 bg-red-50 p-5">
        <h3 className="font-semibold text-red-900 mb-2">Lovkrav — Forskrift om brannforebygging</h3>
        <div className="grid gap-3 text-sm text-red-800 md:grid-cols-2">
          <div>
            <p className="font-medium mb-1">§ 12 — Systematisk sikkerhetsarbeid</p>
            <ul className="space-y-0.5 list-disc list-inside text-xs">
              <li>§ 12b: Rutiner for evakuering og redning</li>
              <li>§ 12c: Kunnskap og ferdigheter hos ansatte</li>
              <li>§ 12d: Informasjon til alle i byggverket</li>
              <li>§ 12e: Avdekke og rette opp mangler</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">§ 13 — Dokumentasjonskrav</p>
            <ul className="space-y-0.5 list-disc list-inside text-xs">
              <li>Dato, scenario og antall deltakere</li>
              <li>Observasjoner under øvelsen</li>
              <li>Evaluering og forbedringspunkter</li>
              <li>Tilgjengelig for tilsynsmyndigheter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
