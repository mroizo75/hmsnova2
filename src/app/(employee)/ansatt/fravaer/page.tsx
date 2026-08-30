import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { fetchAbsences } from "@/server/queries/absence.queries";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Venter", className: "bg-yellow-50 text-yellow-700 border-yellow-300" },
  APPROVED: { label: "Godkjent", className: "bg-green-50 text-green-700 border-green-300" },
  REJECTED: { label: "Avslått", className: "bg-red-50 text-red-700 border-red-300" },
  CANCELLED: { label: "Kansellert", className: "bg-gray-50 text-gray-700 border-gray-300" },
};

const TYPE_LABEL: Record<string, string> = {
  SICK_LEAVE: "Sykefravær",
  SICK_LEAVE_CHILD: "Sykt barn",
  VACATION: "Ferie",
  LEAVE_OF_ABSENCE: "Permisjon",
  PARENTAL_LEAVE: "Foreldrepermisjon",
  COMPASSIONATE_LEAVE: "Velferdspermisjon",
  EDUCATIONAL_LEAVE: "Utdanningspermisjon",
  MILITARY_LEAVE: "Militærtjeneste",
  OTHER: "Annet",
};

export default async function AnsattFravaerPage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canReadOwnAbsence) redirect("/ansatt");

  const absences = await fetchAbsences();

  const pendingCount = absences.filter((a) => a.status === "PENDING").length;
  const approvedCount = absences.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = absences.filter((a) => a.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Mine fravær
          </h1>
          <p className="text-muted-foreground">
            Oversikt over dine registrerte fravær, sykmeldinger og ferier.
          </p>
        </div>
        {auth.permissions.canCreateAbsence && (
          <Link href="/ansatt/fravaer/ny">
            <Button size="lg" className="h-12">
              <Plus className="h-5 w-5 mr-2" />
              Registrer fravær
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Venter</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Godkjent</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avslått</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fraværsoversikt ({absences.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {absences.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ingen fravær registrert</h3>
              <p className="text-muted-foreground mb-4">
                Du har ingen registrerte fravær ennå.
              </p>
              {auth.permissions.canCreateAbsence && (
                <Link href="/ansatt/fravaer/ny">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrer fravær
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {absences.map((absence) => {
                const statusInfo = STATUS_BADGE[absence.status] ?? STATUS_BADGE.PENDING;
                const typeLabel = TYPE_LABEL[absence.type] ?? absence.type;

                return (
                  <div
                    key={absence.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {typeLabel}
                          </Badge>
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                          {absence.percentage < 100 && (
                            <Badge variant="secondary" className="text-xs">
                              {absence.percentage}%
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            {format(new Date(absence.startDate), "d. MMM yyyy", { locale: nb })}
                            {" – "}
                            {format(new Date(absence.endDate), "d. MMM yyyy", { locale: nb })}
                            {" "}({absence.workdays} arbeidsdager)
                          </p>
                        </div>
                        {absence.reason && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {absence.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {absence.status === "APPROVED" ? (
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                        ) : absence.status === "REJECTED" ? (
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-red-600" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-yellow-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>Visste du?</strong> Egenmelding kan benyttes i inntil 3 kalenderdager
            sammenhengende. Etter 3 dager kreves sykmelding fra lege.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
