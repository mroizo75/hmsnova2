import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getIncidentStatusColor, getIncidentStatusLabel } from "@/features/incidents/schemas/incident.schema";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";

function formatDate(date?: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ComplaintsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    redirect("/login");
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    redirect("/login");
  }

  const tenantId = selectedMembership.tenantId;

  const complaints = await prisma.incident.findMany({
    where: { tenantId, type: "CUSTOMER" },
    include: {
      measures: true,
    },
    orderBy: { occurredAt: "desc" },
  });

  const openComplaints = complaints.filter((incident) => incident.status !== "CLOSED");
  const overdue = complaints.filter(
    (incident) =>
      incident.responseDeadline &&
      incident.status !== "CLOSED" &&
      incident.responseDeadline < new Date(),
  );
  const satisfactionValues = complaints
    .map((incident) => incident.customerSatisfaction)
    .filter((value): value is number => typeof value === "number");
  const avgSatisfaction =
    satisfactionValues.length > 0
      ? (satisfactionValues.reduce((sum, current) => sum + current, 0) / satisfactionValues.length).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Kunde- og brukerklager</h1>
            <p className="text-muted-foreground">
              ISO 10002: Samle inn, vurder og lukk kundetilbakemeldinger på en strukturert måte
            </p>
          </div>
          <PageHelpDialog content={helpContent.complaints} />
        </div>
        <Button asChild>
          <Link href="/dashboard/incidents/new?type=CUSTOMER">Registrer klage</Link>
        </Button>
      </div>

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
          {complaints.map((complaint) => {
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
                    Tiltak: {complaint.measures.filter((measure) => measure.status === "DONE").length}/
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
    </div>
  );
}

