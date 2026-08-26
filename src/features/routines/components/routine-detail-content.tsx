"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { UserCircle2, CalendarClock, CalendarCheck, Tag, Sparkles, AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoutineStructuredBlocks } from "@/features/routines/components/routine-structured-blocks";
import { RoutineChangelog } from "@/features/routines/components/routine-changelog";
import { ROUTINE_DASHBOARD_CONTENT_LABELS } from "@/lib/routine-content-labels-dashboard";
import { fetchRoutineDetail } from "@/server/queries/routine.queries";

type RoutineDetailData = NonNullable<Awaited<ReturnType<typeof fetchRoutineDetail>>>;

interface RoutineDetailContentProps {
  initialData: RoutineDetailData;
  categoryDisplay: string;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Aktiv",
    DRAFT: "Kladd",
    NEEDS_REVIEW: "Krever revisjon",
    ARCHIVED: "Arkivert",
  };
  return labels[status] || status;
}

export function RoutineDetailContent({ initialData, categoryDisplay }: RoutineDetailContentProps) {
  const { data } = useQuery({
    queryKey: ["routines", initialData.routine.id],
    queryFn: () => fetchRoutineDetail(initialData.routine.id),
    initialData,
  });

  if (!data) return null;

  const { routine, linkedIncidents, linkedRisks, versions } = data;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-lg">
              <Badge variant={routine.status === "ACTIVE" ? "default" : "outline"}>
                {statusLabel(routine.status)}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Kategori</CardDescription>
            <CardTitle className="text-base inline-flex items-center gap-1.5">
              <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="leading-snug">{categoryDisplay}</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ansvarlig</CardDescription>
            <CardTitle className="text-base inline-flex items-center gap-1.5">
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
              {routine.responsibleUser?.name || routine.responsibleUser?.email || "Ikke satt"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sist revidert</CardDescription>
            <CardTitle className="text-base inline-flex items-center gap-1.5">
              <CalendarCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              {routine.lastReviewedAt
                ? new Date(routine.lastReviewedAt).toLocaleDateString("nb-NO")
                : "Ikke registrert"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Neste revisjon</CardDescription>
            <CardTitle className="text-base inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              {routine.nextReviewAt
                ? new Date(routine.nextReviewAt).toLocaleDateString("nb-NO")
                : "Ikke satt"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beskrivelse</CardTitle>
        </CardHeader>
        <CardContent className="text-sm whitespace-pre-wrap">
          {routine.description || "Ingen beskrivelse"}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Innhold</CardTitle>
          <CardDescription>
            Lovforankring: {routine.legalReference || "Ikke satt"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoutineStructuredBlocks
            content={routine.content}
            labels={ROUTINE_DASHBOARD_CONTENT_LABELS}
            density="compact"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Koblede avvik ({linkedIncidents.length})
          </CardTitle>
          <CardDescription>Avvik som er knyttet til denne rutinen under behandling</CardDescription>
        </CardHeader>
        <CardContent>
          {linkedIncidents.length > 0 ? (
            <div className="space-y-2">
              {linkedIncidents.map((incident: any) => (
                <Link
                  key={incident.id}
                  href={`/dashboard/incidents/${incident.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{incident.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(incident.occurredAt).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{incident.type}</Badge>
                    <Badge variant={incident.status === "CLOSED" ? "default" : "secondary"}>
                      {incident.status === "CLOSED" ? "Lukket" : incident.status === "INVESTIGATING" ? "Under utredning" : "Åpen"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen avvik er koblet til denne rutinen.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Koblede risikoer ({linkedRisks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linkedRisks.length > 0 ? (
            <div className="space-y-2">
              {linkedRisks.map(({ risk }: any) => (
                <Link
                  key={risk.id}
                  href={`/dashboard/risks/${risk.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{risk.title}</p>
                    <p className="text-xs text-muted-foreground">{risk.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        risk.score >= 15
                          ? "border-red-300 text-red-700"
                          : risk.score >= 8
                            ? "border-yellow-300 text-yellow-700"
                            : "border-green-300 text-green-700"
                      }
                    >
                      Score: {risk.score}
                    </Badge>
                    <Badge variant="outline">{risk.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen risikoer er koblet til denne rutinen.</p>
          )}
        </CardContent>
      </Card>

      <RoutineChangelog
        routineId={routine.id}
        routineTitle={routine.title}
        versions={versions}
      />
    </>
  );
}
