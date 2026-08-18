import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getIntelligenceDashboard } from "@/server/actions/intelligence-admin.actions";
import { IndustryHeatmap } from "@/features/intelligence/components/industry-heatmap";
import { InsightCards } from "@/features/intelligence/components/insight-cards";
import { IntelligenceTrendChart } from "@/features/intelligence/components/trend-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Building2, Users, TrendingUp, Key } from "lucide-react";
import { QuarterlyReportButton } from "@/features/intelligence/components/quarterly-report-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function IntelligencePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) redirect("/admin");

  const data = await getIntelligenceDashboard();
  if (!data) redirect("/admin");

  const coveragePercent = data.totalTenants > 0
    ? Math.round((data.totalOptedIn / data.totalTenants) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8" />
            Safety Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Anonymisert bransjestatistikk og prediktiv risikoanalyse
          </p>
        </div>
        <div className="flex gap-2">
          <QuarterlyReportButton />
          <Link href="/admin/intelligence/api-keys">
            <Button variant="outline">
              <Key className="h-4 w-4 mr-2" />
              API-nokler
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{data.totalOptedIn}</p>
                <p className="text-xs text-muted-foreground">Bedrifter opted-in</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{coveragePercent}%</p>
                <p className="text-xs text-muted-foreground">Dekningsgrad</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{data.latestSnapshots.length}</p>
                <p className="text-xs text-muted-foreground">Bransjer dekket</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{data.topInsights.length}</p>
                <p className="text-xs text-muted-foreground">Aktive innsikter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <InsightCards insights={data.topInsights} />

      <IndustryHeatmap snapshots={data.latestSnapshots} />

      <IntelligenceTrendChart trends={data.globalTrends} />

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Dekningsgrad per bransje</h3>
          <div className="space-y-2">
            {data.coverageByIndustry.map((c) => (
              <div key={c.industry} className="flex items-center gap-3">
                <span className="text-sm w-48 truncate">{c.industry}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${c.total > 0 ? (c.count / c.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {c.count}/{c.total}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
