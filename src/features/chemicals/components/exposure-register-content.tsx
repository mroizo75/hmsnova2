"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { ExposureRegisterList } from "@/app/(dashboard)/dashboard/exposure-register/exposure-register-list";
import { fetchExposureRegister } from "@/server/queries/exposure-register.queries";

type ExposureData = Awaited<ReturnType<typeof fetchExposureRegister>>;

interface ExposureRegisterContentProps {
  initialData: ExposureData;
}

function effectiveStatus(e: { status: string; exposureEndDate: string | null }) {
  if (e.status !== "ARCHIVED" && e.exposureEndDate && new Date(e.exposureEndDate) < new Date()) {
    return "INACTIVE";
  }
  return e.status;
}

export function ExposureRegisterContent({ initialData }: ExposureRegisterContentProps) {
  const { data: entries } = useQuery({
    queryKey: ["chemicals"],
    queryFn: () => fetchExposureRegister(),
    initialData,
  });

  const stats = {
    total: entries.length,
    active: entries.filter((e: any) => effectiveStatus(e) === "ACTIVE").length,
    inactive: entries.filter((e: any) => effectiveStatus(e) === "INACTIVE").length,
    healthCheckPending: entries.filter(
      (e: any) => e.healthCheckRequired && !e.healthCheckDone
    ).length,
  };

  return (
    <>
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
    </>
  );
}
