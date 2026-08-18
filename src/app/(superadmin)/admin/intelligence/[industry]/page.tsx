import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getIndustryDetail } from "@/server/actions/intelligence-admin.actions";
import { IntelligenceTrendChart } from "@/features/intelligence/components/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const INDUSTRY_LABELS: Record<string, string> = {
  construction: "Bygg og anlegg",
  elektro: "Elektro og energi",
  offshore: "Offshore og petroleum",
  marine: "Maritime og sjofart",
  oil_gas: "Olje og gass",
  fiskeri: "Fiskeri og havbruk",
  bergverk: "Bergverk og gruvedrift",
  healthcare: "Helsevesen",
  manufacturing: "Industri og produksjon",
  retail: "Handel og service",
  transport: "Transport og logistikk",
  hospitality: "Hotell og restaurant",
  education: "Utdanning",
  technology: "Teknologi og IT",
  agriculture: "Landbruk",
  other: "Annet",
};

export default async function IndustryDetailPage({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) redirect("/admin");

  const { industry } = await params;
  const data = await getIndustryDetail(industry);

  const label = INDUSTRY_LABELS[industry] || industry;
  const latestSnapshot = data.snapshots[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/intelligence" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{label}</h1>
          <p className="text-muted-foreground">
            Detaljert bransjestatistikk og trender
          </p>
        </div>
      </div>

      {latestSnapshot && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{latestSnapshot.tenantCount}</p>
              <p className="text-xs text-muted-foreground">Bidragende bedrifter</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{latestSnapshot.incidentCount}</p>
              <p className="text-xs text-muted-foreground">Avvik (90 dager)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{latestSnapshot.trir?.toFixed(1) ?? "—"}</p>
              <p className="text-xs text-muted-foreground">TRIR</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">
                {latestSnapshot.trainingComplianceRate?.toFixed(0) ?? "—"}%
              </p>
              <p className="text-xs text-muted-foreground">Opplaeringsdekning</p>
            </CardContent>
          </Card>
        </div>
      )}

      {latestSnapshot && (
        <Card>
          <CardHeader>
            <CardTitle>Detaljmetrikker — {latestSnapshot.period}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Apne risikoer</p>
                <p className="text-xl font-bold">{latestSnapshot.risksOpenCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Tiltak fullfort</p>
                <p className="text-xl font-bold">
                  {latestSnapshot.measuresCompleted}/{latestSnapshot.measuresTotal}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Snitt lukketid (dager)</p>
                <p className="text-xl font-bold">{latestSnapshot.avgMttr?.toFixed(1) ?? "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Inspeksjoner</p>
                <p className="text-xl font-bold">{latestSnapshot.inspectionCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Hoyrisiko kjemikalier</p>
                <p className="text-xl font-bold">{latestSnapshot.highRiskChemicalCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Ansatte totalt</p>
                <p className="text-xl font-bold">{latestSnapshot.employeeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <IntelligenceTrendChart
        trends={data.trends.map((t) => ({
          industry: t.industry,
          metric: t.metric,
          period: t.period,
          value: t.value,
          changePercent: t.changePercent,
        }))}
        title={`Trender — ${label}`}
      />

      {data.scores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Score-fordeling i bransjen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.scores.slice(0, 10).map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-20">{s.period}</span>
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${s.overallScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12">{Math.round(s.overallScore)}</span>
                  <span className={`text-xs ${s.trendDirection === "IMPROVING" ? "text-green-600" : s.trendDirection === "DECLINING" ? "text-red-600" : "text-muted-foreground"}`}>
                    {s.trendDirection === "IMPROVING" ? "Bedring" : s.trendDirection === "DECLINING" ? "Nedgang" : "Stabil"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.snapshots.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              Ingen data for denne bransjen enda. Minimum 5 opted-in bedrifter kreves.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
