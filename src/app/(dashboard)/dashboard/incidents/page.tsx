import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IncidentList } from "@/features/incidents/components/incident-list";
import { Plus, AlertCircle, Clock, CheckCircle, FileSearch } from "lucide-react";
import Link from "next/link";

export default async function IncidentsPage() {
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

  const incidents = await prisma.incident.findMany({
    where: { tenantId },
    include: {
      measures: true,
    },
    orderBy: { occurredAt: "desc" },
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === "OPEN").length,
    investigating: incidents.filter(i => i.status === "INVESTIGATING").length,
    actionTaken: incidents.filter(i => i.status === "ACTION_TAKEN").length,
    closed: incidents.filter(i => i.status === "CLOSED").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Avvik og hendelser</h1>
          <p className="text-muted-foreground">
            ISO 9001: Rapporter og følg opp avvik systematisk
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/incidents/new">
            <Plus className="mr-2 h-4 w-4" />
            Rapporter avvik
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registrerte avvik</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Åpne</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Venter på utredning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under håndtering</CardTitle>
            <FileSearch className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.investigating + stats.actionTaken}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.investigating} utredning, {stats.actionTaken} tiltak
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lukket</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
            <p className="text-xs text-muted-foreground">Avsluttede avvik</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle avvik</CardTitle>
        </CardHeader>
        <CardContent>
          <IncidentList incidents={incidents} />
        </CardContent>
      </Card>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 ISO 9001 - 10.2 Avvik og korrigerende tiltak</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">Organisasjonen skal:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Reagere på avvik (umiddelbare tiltak)</li>
              <li>Vurdere behov for korrigerende tiltak</li>
              <li>Implementere nødvendige tiltak</li>
              <li>Gjennomgå effektiviteten av tiltak</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Dokumentasjon:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Natur av avvik og påfølgende tiltak</li>
              <li>Resultater av korrigerende tiltak</li>
              <li>Årsaksanalyse (root cause)</li>
              <li>Læringspunkter for forbedring</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
