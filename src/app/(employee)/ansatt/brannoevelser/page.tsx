import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Calendar,
  MapPin,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  FIRE_DRILL_TYPE_LABELS,
  type FireDrillStatus,
  type FireDrillType,
} from "@/features/fire-drills/schemas/fire-drill.schema";

export const dynamic = "force-dynamic";

function getStatusConfig(status: FireDrillStatus) {
  const map: Record<FireDrillStatus, { label: string; className: string; icon: React.ReactNode }> = {
    PLANNED: {
      label: "Planlagt",
      className: "bg-blue-100 text-blue-800",
      icon: <Clock className="h-3 w-3" />,
    },
    IN_PROGRESS: {
      label: "Pågår",
      className: "bg-yellow-100 text-yellow-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    COMPLETED: {
      label: "Gjennomført",
      className: "bg-orange-100 text-orange-800",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    EVALUATED: {
      label: "Evaluert",
      className: "bg-green-100 text-green-800",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    CANCELLED: {
      label: "Avlyst",
      className: "bg-gray-100 text-gray-600",
      icon: null,
    },
  };
  return map[status] ?? map.PLANNED;
}

export default async function AnsattBrannoevelserPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const tenantId = session.user.tenantId;

  const drills = await prisma.fireDrill.findMany({
    where: { tenantId },
    orderBy: { plannedDate: "desc" },
  });

  const responsibleIds = [...new Set(drills.map((d) => d.responsibleId))];
  const responsibleUsers = await prisma.user.findMany({
    where: { id: { in: responsibleIds } },
    select: { id: true, name: true },
  });
  const userMap = new Map(responsibleUsers.map((u) => [u.id, u.name]));

  const upcoming = drills.filter(
    (d) => d.status === "PLANNED" || d.status === "IN_PROGRESS"
  );
  const past = drills.filter(
    (d) => d.status === "COMPLETED" || d.status === "EVALUATED" || d.status === "CANCELLED"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Flame className="h-7 w-7 text-red-600" />
          Brannøvelser
        </h1>
        <p className="text-muted-foreground text-sm">
          Oversikt over planlagte og gjennomførte brannøvelser i din bedrift
        </p>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          Kommende øvelser
        </h2>
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="text-center py-10">
                <Flame className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm">
                  Ingen kommende brannøvelser planlagt
                </p>
              </CardContent>
            </Card>
          ) : (
            upcoming.map((drill) => {
              const statusCfg = getStatusConfig(drill.status as FireDrillStatus);
              return (
                <Card key={drill.id} className="border-l-4 border-l-red-400">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{drill.title}</h3>
                          <Badge className={`${statusCfg.className} flex items-center gap-1 text-xs`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {FIRE_DRILL_TYPE_LABELS[drill.drillType as FireDrillType]}
                          </Badge>
                          {!drill.isAnnounced && (
                            <Badge variant="secondary" className="text-xs">
                              Uvarslet
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground mt-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {format(new Date(drill.plannedDate), "EEEE d. MMMM yyyy", { locale: nb })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>{drill.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span>Øvingsleder: {userMap.get(drill.responsibleId) ?? "Ukjent"}</span>
                          </div>
                        </div>

                        {drill.objectives && (
                          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                            <span className="font-medium text-foreground">Mål:</span> {drill.objectives}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Tidligere øvelser
          </h2>
          <div className="space-y-3">
            {past.map((drill) => {
              const statusCfg = getStatusConfig(drill.status as FireDrillStatus);
              return (
                <Card key={drill.id} className="opacity-80">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{drill.title}</h3>
                          <Badge className={`${statusCfg.className} flex items-center gap-1 text-xs`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {FIRE_DRILL_TYPE_LABELS[drill.drillType as FireDrillType]}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {format(new Date(drill.plannedDate), "d. MMMM yyyy", { locale: nb })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>{drill.location}</span>
                          </div>
                          {drill.actualParticipantCount != null && (
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              <span>{drill.actualParticipantCount} deltakere</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Card className="border-l-4 border-l-red-500 bg-red-50">
        <CardContent className="p-4">
          <p className="text-sm text-red-900">
            <strong>Viktig:</strong> Brannøvelser er påkrevd iht. Forskrift om brannforebygging § 12 og § 13.
            Alle ansatte skal kjenne rømningsveier og samlingsplasser. Kontakt din leder om du har spørsmål.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
