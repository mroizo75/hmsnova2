import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { differenceInMonths } from "date-fns";
import {
  Plus,
  Flame,
  CheckCircle,
  Clock,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { fetchFireDrills } from "@/server/queries/fire-drill.queries";
import { FireDrillsContent } from "@/features/fire-drills/components/fire-drills-content";

export default async function FireDrillsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);
  if (!permissions.canReadInspections) {
    redirect("/dashboard");
  }

  const initialData = await fetchFireDrills();
  const { drills } = initialData;

  const stats = {
    total: drills.length,
    planned: drills.filter((d: any) => d.status === "PLANNED").length,
    completed: drills.filter((d: any) => d.status === "COMPLETED").length,
    evaluated: drills.filter((d: any) => d.status === "EVALUATED").length,
  };

  const lastEvaluation = drills
    .filter((d: any) => d.status === "EVALUATED" && d.evaluatedAt)
    .sort((a: any, b: any) => (new Date(b.evaluatedAt).getTime()) - (new Date(a.evaluatedAt).getTime()))[0];

  const monthsSinceLast = lastEvaluation?.evaluatedAt
    ? differenceInMonths(new Date(), new Date(lastEvaluation.evaluatedAt))
    : null;

  const showAnnualReminder = monthsSinceLast === null || monthsSinceLast >= 10;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <Flame className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Brannøvelser</h1>
            <p className="text-muted-foreground mt-1">
              Planlegg, gjennomfør og evaluer brannøvelser — tilpasset virksomhetens risikovurdering
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

      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Risikobasert krav:</strong> Forskrift om brannforebygging krever ikke brannøvelser for alle virksomheter.
          Omfang og hyppighet skal baseres på virksomhetens risikovurdering, byggets kompleksitet og antall personer.
          Gjennomfør en risikovurdering for å avgjøre om og hvor ofte din virksomhet trenger brannøvelser.
        </AlertDescription>
      </Alert>

      {showAnnualReminder && stats.total > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {monthsSinceLast === null
              ? "Ingen evaluerte brannøvelser er registrert."
              : `Siste evaluerte øvelse var for ${monthsSinceLast} måneder siden.`}{" "}
            Dersom risikovurderingen tilsier behov for brannøvelser, anbefaler DSB jevnlige øvelser tilpasset virksomheten.
          </AlertDescription>
        </Alert>
      )}

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

      <FireDrillsContent initialData={initialData} />

      <div className="rounded-lg border border-amber-100 bg-amber-50 p-5">
        <h3 className="font-semibold text-amber-900 mb-2">Regelverk — Forskrift om brannforebygging</h3>
        <p className="text-xs text-amber-800 mb-3">
          Forskriften stiller ikke konkret krav om brannøvelser for alle virksomheter. Kravene er risikobaserte —
          virksomheten skal selv vurdere behov basert på byggets bruk, kompleksitet og antall personer.
        </p>
        <div className="grid gap-3 text-sm text-amber-800 md:grid-cols-2">
          <div>
            <p className="font-medium mb-1">§ 11 — Brukere av byggverk skal ha:</p>
            <ul className="space-y-0.5 list-disc list-inside text-xs">
              <li>Rutiner for varsling, evakuering og slokking</li>
              <li>Kunnskap og ferdigheter hos ansatte</li>
              <li>Tiltak tilpasset byggets risiko</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">§ 12 — Systematisk sikkerhetsarbeid:</p>
            <ul className="space-y-0.5 list-disc list-inside text-xs">
              <li>Mål, planer og tiltak for brannsikkerhet</li>
              <li>Øvelser tilpasset kompleksitet (risikovurdering)</li>
              <li>Dokumentasjon tilgjengelig for tilsynsmyndigheter</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-amber-700 mt-3 italic">
          Virksomheter med overnatting, mange besøkende eller komplekse bygg bør ha jevnlige øvelser.
          Kontorvirksomheter med lav risiko kan løse kravet med opplæring og enkel evakueringsinstruks.
        </p>
      </div>
    </div>
  );
}
