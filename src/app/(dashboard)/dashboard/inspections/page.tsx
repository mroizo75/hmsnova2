import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Plus, Calendar, MapPin, User, Smartphone } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function getInspections(tenantId: string) {
  return await db.inspection.findMany({
    where: { tenantId },
    include: {
      findings: {
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      },
    },
    orderBy: { scheduledDate: "desc" },
  });
}

export default async function InspectionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canReadInspections) {
    redirect("/dashboard");
  }

  const inspections = await getInspections(session.user.tenantId);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      PLANNED: { label: "Planlagt", variant: "secondary" },
      IN_PROGRESS: { label: "Pågår", variant: "default" },
      COMPLETED: { label: "Fullført", variant: "outline" },
      CANCELLED: { label: "Kansellert", variant: "outline" },
    };
    return variants[status] || variants.PLANNED;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      VERNERUNDE: "Vernerunde",
      HMS_INSPEKSJON: "HMS-inspeksjon",
      BRANNØVELSE: "Brannøvelse",
      SHA_PLAN: "SHA-plan",
      SIKKERHETSVANDRING: "Sikkerhetsvandring",
      ANDRE: "Annen",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vernerunde</h1>
          <p className="text-muted-foreground mt-1">
            Gjennomfør og administrer vernerunder og HMS-inspeksjoner
          </p>
        </div>
        {permissions.canCreateInspections && (
          <Link href="/dashboard/inspections/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ny vernerunde
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile Quick Access */}
      <div className="lg:hidden grid grid-cols-1 gap-3">
        {inspections
          .filter((i) => i.status === "IN_PROGRESS" || i.status === "PLANNED")
          .slice(0, 3)
          .map((inspection) => {
            const statusInfo = getStatusBadge(inspection.status);
            return (
              <Link
                key={inspection.id}
                href={`/dashboard/inspections/${inspection.id}/mobil`}
              >
                <Card className="hover:bg-accent transition-colors border-2 border-green-500/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base line-clamp-1">
                          {inspection.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {format(new Date(inspection.scheduledDate), "d. MMM yyyy", {
                            locale: nb,
                          })}
                        </CardDescription>
                      </div>
                      <Smartphone className="h-5 w-5 text-green-600 ml-2" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant} className="text-xs">
                        {statusInfo.label}
                      </Badge>
                      {inspection.findings.length > 0 && (
                        <span className="text-xs text-orange-600 font-medium">
                          {inspection.findings.length} åpne funn
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Totalt</CardDescription>
            <CardTitle className="text-3xl">{inspections.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Planlagt</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {inspections.filter((i) => i.status === "PLANNED").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pågår</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {inspections.filter((i) => i.status === "IN_PROGRESS").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Åpne funn</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {inspections.reduce((sum, i) => sum + i.findings.length, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle vernerunder</CardTitle>
          <CardDescription>Oversikt over gjennomførte og planlagte vernerunder</CardDescription>
        </CardHeader>
        <CardContent>
          {inspections.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ingen vernerunder registrert ennå</p>
              {permissions.canCreateInspections && (
                <Link href="/dashboard/inspections/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Opprett første vernerunde
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tittel</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Planlagt dato</TableHead>
                    <TableHead>Lokasjon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Åpne funn</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((inspection) => {
                    const statusInfo = getStatusBadge(inspection.status);
                    return (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">{inspection.title}</TableCell>
                        <TableCell>{getTypeBadge(inspection.type)}</TableCell>
                        <TableCell>
                          {format(new Date(inspection.scheduledDate), "d. MMM yyyy", {
                            locale: nb,
                          })}
                        </TableCell>
                        <TableCell>
                          {inspection.location ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{inspection.location}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {inspection.findings.length > 0 ? (
                            <Badge variant="outline" className="text-orange-600">
                              {inspection.findings.length}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Link href={`/dashboard/inspections/${inspection.id}`}>
                            <Button variant="ghost" size="sm">
                              Detaljer
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
