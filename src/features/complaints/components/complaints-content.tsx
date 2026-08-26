"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getIncidentStatusColor, getIncidentStatusLabel } from "@/features/incidents/schemas/incident.schema";
import { fetchComplaints } from "@/server/queries/complaint.queries";

type ComplaintData = NonNullable<Awaited<ReturnType<typeof fetchComplaints>>>;

function formatDate(date?: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface ComplaintsContentProps {
  initialData: ComplaintData;
}

export function ComplaintsContent({ initialData }: ComplaintsContentProps) {
  const { data: complaints } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => fetchComplaints(),
    initialData,
  });

  if (!complaints) return null;

  const openComplaints = complaints.filter((incident: any) => incident.status !== "CLOSED");
  const overdue = complaints.filter(
    (incident: any) =>
      incident.responseDeadline &&
      incident.status !== "CLOSED" &&
      new Date(incident.responseDeadline) < new Date(),
  );
  const satisfactionValues = complaints
    .map((incident: any) => incident.customerSatisfaction)
    .filter((value: any): value is number => typeof value === "number");
  const avgSatisfaction =
    satisfactionValues.length > 0
      ? (satisfactionValues.reduce((sum: number, current: number) => sum + current, 0) / satisfactionValues.length).toFixed(1)
      : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Åpne klager</CardTitle>
            <CardDescription>Som krever oppfølging</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{openComplaints.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Snitt tilfredshet</CardTitle>
            <CardDescription>Rapportert av kundene</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{avgSatisfaction ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Over frist</CardTitle>
            <CardDescription>Krever rask respons</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-red-600">{overdue.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Totalt siste 12 mnd</CardTitle>
            <CardDescription>Alle registrerte klager</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{complaints.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktive kundeklager</CardTitle>
          <CardDescription>Sorter etter status og svarfrist</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {complaints.length === 0 && (
            <p className="text-sm text-muted-foreground">Ingen kundeklager registrert.</p>
          )}
          {complaints.map((complaint: any) => {
            const statusColor = getIncidentStatusColor(complaint.status);
            const statusLabel = getIncidentStatusLabel(complaint.status);
            return (
              <div key={complaint.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{complaint.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{complaint.description}</p>
                    <p className="text-xs text-purple-800 mt-2">
                      Kunde: {complaint.customerName || "Ukjent"}{" "}
                      {complaint.customerEmail && `• ${complaint.customerEmail}`}
                      {complaint.customerPhone && ` • ${complaint.customerPhone}`}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className={statusColor}>{statusLabel}</Badge>
                    {complaint.customerSatisfaction && (
                      <p className="text-xs text-muted-foreground">
                        Tilfredshet: {complaint.customerSatisfaction}/5
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Registrert {formatDate(complaint.occurredAt)}</span>
                  <span>Frist {formatDate(complaint.responseDeadline)}</span>
                  {complaint.customerTicketId && <span>Sak: {complaint.customerTicketId}</span>}
                  <span>
                    Tiltak: {complaint.measures.filter((measure: any) => measure.status === "DONE").length}/
                    {complaint.measures.length}
                  </span>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/incidents/${complaint.id}`}>Åpne sak</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
