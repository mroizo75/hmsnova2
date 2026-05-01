import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, Plus, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ExposureRegisterList } from "./exposure-register-list";

export default async function ExposureRegisterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: { include: { tenant: true } } },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const tenantId = selectedMembership.tenantId;

  const entries = await prisma.exposureRegister.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    omit: { employeeBirthNumber: true },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      chemical: { select: { id: true, productName: true, casNumber: true } },
        ruhReport: { select: { id: true, ruhNummer: true, title: true, occurredAt: true } },
        risk: {
          select: {
            id: true, title: true, score: true, status: true,
            riskAssessment: { select: { title: true, assessmentYear: true } },
          },
        },
    },
    orderBy: { createdAt: "desc" },
  });

  function effectiveStatus(e: { status: string; exposureEndDate: Date | null }) {
    if (e.status !== "ARCHIVED" && e.exposureEndDate && new Date(e.exposureEndDate) < new Date()) {
      return "INACTIVE";
    }
    return e.status;
  }

  const stats = {
    total: entries.length,
    active: entries.filter((e) => effectiveStatus(e) === "ACTIVE").length,
    inactive: entries.filter((e) => effectiveStatus(e) === "INACTIVE").length,
    healthCheckPending: entries.filter(
      (e) => e.healthCheckRequired && !e.healthCheckDone
    ).length,
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <FlaskConical className="h-5 w-5 text-orange-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Eksponeringsregister</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-0.5">
            Oversikt over ansatte eksponert for helseskadelige stoffer og faktorer · Oppbevares 40–60 år
          </p>
        </div>
        <Link href="/dashboard/exposure-register/new">
          <Button className="w-full sm:w-auto shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Registrer eksponering
          </Button>
        </Link>
      </div>

      {/* Statistikk */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="border-0 bg-slate-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Totalt</p>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">registreringer</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-orange-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Pågående</p>
              <FlaskConical className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-orange-700">{stats.active}</p>
            <p className="text-xs text-orange-500 mt-0.5">aktive eksponeringer</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Avsluttet</p>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-700">{stats.inactive}</p>
            <p className="text-xs text-green-500 mt-0.5">historiske</p>
          </CardContent>
        </Card>

        <Card className={`border-0 ${stats.healthCheckPending > 0 ? "bg-red-50" : "bg-gray-50"}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-medium uppercase tracking-wide ${stats.healthCheckPending > 0 ? "text-red-600" : "text-gray-500"}`}>
                Helsekontroll
              </p>
              {stats.healthCheckPending > 0
                ? <AlertTriangle className="h-4 w-4 text-red-500" />
                : <Clock className="h-4 w-4 text-gray-400" />
              }
            </div>
            <p className={`text-3xl font-bold ${stats.healthCheckPending > 0 ? "text-red-700" : "text-gray-600"}`}>
              {stats.healthCheckPending}
            </p>
            <p className={`text-xs mt-0.5 ${stats.healthCheckPending > 0 ? "text-red-500" : "text-gray-400"}`}>
              ikke utført
            </p>
          </CardContent>
        </Card>
      </div>

      {/* HMS-infostripe */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <FlaskConical className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-blue-800">
          <span className="font-semibold">Registreringsplikt:</span> CMR-stoffer (Carc./Mut./Repr. kat. 1A/1B),
          bly, asbest, biologiske faktorer (gruppe 3/4) og ioniserende stråling.
          Fødselsnummer lagres kryptert.{" "}
          <a
            href="https://www.arbeidstilsynet.no/hms/roller-i-hms-arbeidet/arbeidsgiver/register-over-eksponerte-arbeidstakere/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            Les mer hos Arbeidstilsynet
          </a>
        </p>
      </div>

      {/* Liste */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-gray-50/50 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Registrerte eksponeringer</CardTitle>
              <CardDescription className="mt-0.5">
                Én oppføring per ansatt per eksponering
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ExposureRegisterList entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
