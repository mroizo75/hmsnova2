import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import Link from "next/link";
import { ChevronLeft, CalendarDays, User, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { fetchAbsenceById } from "@/server/queries/absence.queries";
import { fetchFollowUps } from "@/server/queries/absence.queries";
import { approveAbsence, rejectAbsence, cancelAbsence } from "@/server/actions/absence.actions";
import { AbsenceForm } from "@/features/absence/components/absence-form";
import { FollowUpTimeline } from "@/features/absence/components/follow-up-timeline";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Venter på godkjenning", className: "bg-yellow-50 text-yellow-700 border-yellow-300" },
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

export default async function FravaerDetailPage({ params }: Props) {
  const { id } = await params;
  const auth = await getAuthContext();

  const canRead =
    auth.permissions.canReadOwnAbsence ||
    auth.permissions.canReadAllAbsence;

  if (!canRead) redirect("/dashboard");

  const absence = await fetchAbsenceById(id);

  if (!absence) notFound();

  const followUps = await fetchFollowUps(id);

  const isOwner = absence.userId === auth.userId;
  const isPending = absence.status === "PENDING";
  const canApprove = auth.permissions.canApproveAbsence && isPending;
  const canEdit = isPending && isOwner;
  const canCancel = isPending && isOwner;
  const canEditFollowUp = auth.permissions.canApproveAbsence;

  const statusInfo = STATUS_BADGE[absence.status] ?? STATUS_BADGE.PENDING;
  const typeLabel = TYPE_LABEL[absence.type] ?? absence.type;

  if (canEdit) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/fravaer">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Tilbake
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-xl font-bold">Rediger fravær</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Du kan redigere fraværet så lenge det ikke er godkjent.
          </p>
        </div>

        <AbsenceForm initialData={absence} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/fravaer">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Fraværsdetaljer
            </CardTitle>
            <Badge variant="outline" className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <Badge variant="secondary">{typeLabel}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fraværsprosent</p>
              <p className="text-sm">{absence.percentage}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fra dato</p>
              <p className="text-sm">{format(new Date(absence.startDate), "d. MMMM yyyy", { locale: nb })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Til dato</p>
              <p className="text-sm">{format(new Date(absence.endDate), "d. MMMM yyyy", { locale: nb })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Arbeidsdager</p>
              <p className="text-sm">{absence.workdays} dager</p>
            </div>
          </div>

          {absence.employeeName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ansatt</p>
                <p className="text-sm">{absence.employeeName}</p>
              </div>
            </div>
          )}

          {absence.doctorName && (
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lege</p>
                <p className="text-sm">{absence.doctorName}</p>
              </div>
            </div>
          )}

          {absence.reason && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Kommentar</p>
              <p className="text-sm mt-1">{absence.reason}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {canApprove && (
              <>
                <form action={async () => { "use server"; await approveAbsence({ id: absence.id }); }}>
                  <Button type="submit" variant="default">
                    Godkjenn
                  </Button>
                </form>
                <form action={async () => { "use server"; await rejectAbsence({ id: absence.id }); }}>
                  <Button type="submit" variant="destructive">
                    Avslå
                  </Button>
                </form>
              </>
            )}
            {canCancel && (
              <form action={async () => { "use server"; await cancelAbsence(absence.id); }}>
                <Button type="submit" variant="outline">
                  Kanseller
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      {followUps.length > 0 && (
        <FollowUpTimeline
          followUps={followUps}
          absenceId={id}
          canEdit={canEditFollowUp}
        />
      )}
    </div>
  );
}
