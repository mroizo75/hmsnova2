import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileWarning, Clock, Search, CheckCircle, Plus } from "lucide-react";
import Link from "next/link";
import {
  getRuhCategoryLabel,
  getRuhCategoryColor,
  getRuhStatusLabel,
  getRuhStatusColor,
} from "@/features/ruh/schemas/ruh.schema";

export default async function RuhDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = user.tenants[0].tenantId;

  const reports = await prisma.ruhReport.findMany({
    where: { tenantId },
    include: {
      attachments: {
        select: { id: true, name: true },
      },
    },
    orderBy: { occurredAt: "desc" },
  });

  const stats = {
    total: reports.length,
    submitted: reports.filter((r) => r.status === "SUBMITTED").length,
    underReview: reports.filter((r) => r.status === "UNDER_REVIEW").length,
    completed: reports.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileWarning className="h-8 w-8 text-amber-600" />
            RUH – Uønskede hendelser
          </h1>
          <p className="text-muted-foreground">
            Rapport om uønskede hendelser (RUH) – oversikt og behandling
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/ruh/new">
            <Plus className="mr-2 h-4 w-4" />
            Registrer RUH
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">RUH-rapporter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Innsendt</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.submitted}</div>
            <p className="text-xs text-muted-foreground">Venter på behandling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under behandling</CardTitle>
            <Search className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.underReview}</div>
            <p className="text-xs text-muted-foreground">Blir gjennomgått</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Behandlet</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Ferdig behandlet</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle RUH-rapporter</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileWarning className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ingen RUH-rapporter</h3>
              <p className="text-muted-foreground mb-4">
                Det er ikke sendt inn noen RUH-rapporter ennå.
              </p>
              <Button asChild>
                <Link href="/dashboard/ruh/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrer første RUH
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Nr.</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Tittel</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Kategori</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Rapportert av</th>
                    <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Dato</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Skade</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 pr-4">
                        <Link href={`/dashboard/ruh/${report.id}`} className="text-sm font-mono text-primary hover:underline">
                          {report.ruhNummer || "-"}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <Link href={`/dashboard/ruh/${report.id}`} className="text-sm font-medium hover:underline">
                          {report.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={`text-xs ${getRuhCategoryColor(report.category)}`}>
                          {getRuhCategoryLabel(report.category)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={`text-xs ${getRuhStatusColor(report.status)}`}>
                          {getRuhStatusLabel(report.status)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {report.reportedBy}
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {new Date(report.occurredAt).toLocaleDateString("nb-NO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        {report.injuryOccurred ? (
                          <Badge variant="destructive" className="text-xs">Ja</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Nei</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
