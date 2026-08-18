import { getServerSession } from "next-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAggregatedHmsStats } from "@/server/actions/admin-hms-stats.actions";
import { HmsStatsTable } from "@/features/admin/components/hms-stats-table";
import { HmsTrendChart } from "@/features/admin/components/hms-trend-chart";
import { NhoExportButton } from "@/features/admin/components/nho-export-button";
import { redirect } from "next/navigation";

export default async function SuperAdminDashboard() {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isSuperAdmin: true },
      })
    : null;
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;

  const data = await getAggregatedHmsStats();
  if (!data) redirect("/login");

  const { kpi, rows, trends } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HMS-oversikt</h1>
          <p className="text-muted-foreground">
            Aggregert HMS-statistikk og compliance for alle bedrifter
          </p>
        </div>
        {isSuperAdmin && <NhoExportButton />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktive bedrifter
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.activeTenants}</div>
            <p className="text-xs text-muted-foreground">
              Aktive og i prøveperiode
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gj.snittlig compliance
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.avgCompliance}%</div>
            <p className="text-xs text-muted-foreground">
              Basert på aktivitetsdata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avvik denne mnd
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.incidentsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Nye registrerte siste 30 dager
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tiltak fullført
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.measuresCompletedRate}%</div>
            <p className="text-xs text-muted-foreground">
              Andel fullførte tiltak
            </p>
          </CardContent>
        </Card>
      </div>

      <HmsStatsTable rows={rows} />

      <HmsTrendChart data={trends} />
    </div>
  );
}
