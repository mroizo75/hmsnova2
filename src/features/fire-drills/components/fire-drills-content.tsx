"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Plus,
  Flame,
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
} from "@/features/fire-drills/schemas/fire-drill.schema";
import type { FireDrillStatus, FireDrillType } from "@/features/fire-drills/schemas/fire-drill.schema";
import { fetchFireDrills } from "@/server/queries/fire-drill.queries";

type FireDrillsData = Awaited<ReturnType<typeof fetchFireDrills>>;

interface FireDrillsContentProps {
  initialData: FireDrillsData;
}

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

export function FireDrillsContent({ initialData }: FireDrillsContentProps) {
  const { data } = useQuery({
    queryKey: ["fire-drills"],
    queryFn: () => fetchFireDrills(),
    initialData,
  });

  const { drills, userMap } = data;

  return (
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
                  {drills.map((drill: any) => {
                    const statusStyle = getStatusBadge(drill.status);
                    const typeStyle = getTypeBadge(drill.drillType);
                    const openMeasures = drill.measures.filter(
                      (m: any) => m.status === "PENDING" || m.status === "IN_PROGRESS",
                    ).length;
                    return (
                      <TableRow key={drill.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Link href={`/dashboard/fire-drills/${drill.id}`} className="font-medium hover:underline">
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
                          <Badge variant="outline" className={`text-xs ${statusStyle.className}`}>
                            {statusStyle.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {openMeasures > 0 && (
                            <Badge variant="destructive" className="text-xs">{openMeasures} åpne</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-3 md:hidden">
              {drills.map((drill: any) => {
                const statusStyle = getStatusBadge(drill.status);
                const typeStyle = getTypeBadge(drill.drillType);
                const openMeasures = drill.measures.filter(
                  (m: any) => m.status === "PENDING" || m.status === "IN_PROGRESS",
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
  );
}
