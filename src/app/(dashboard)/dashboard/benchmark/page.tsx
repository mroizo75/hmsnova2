import { getTenantBenchmark } from "@/server/actions/benchmark.actions";
import { BenchmarkRadar } from "@/features/intelligence/components/benchmark-radar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function BenchmarkPage() {
  const data = await getTenantBenchmark();

  if (!data.isOptedIn) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Bransje-benchmark
          </h1>
          <p className="text-muted-foreground mt-1">
            Sammenlign din bedrift med andre i samme bransje
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <h2 className="text-xl font-semibold">Aktiver bransjestatistikk</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                For a se benchmark-data ma du aktivere deltakelse i anonymisert bransjestatistikk
                i innstillingene. Din data anonymiseres og ingen kan identifisere bedriften.
              </p>
              <Link
                href="/dashboard/settings?tab=intelligence"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Ga til innstillinger <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const TrendIcon = data.tenantScore?.trendDirection === "IMPROVING"
    ? TrendingUp
    : data.tenantScore?.trendDirection === "DECLINING"
      ? TrendingDown
      : Minus;

  const trendColor = data.tenantScore?.trendDirection === "IMPROVING"
    ? "text-green-600"
    : data.tenantScore?.trendDirection === "DECLINING"
      ? "text-red-600"
      : "text-muted-foreground";

  const trendLabel = data.tenantScore?.trendDirection === "IMPROVING"
    ? "Forbedring"
    : data.tenantScore?.trendDirection === "DECLINING"
      ? "Nedgang"
      : "Stabil";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="h-8 w-8" />
          Bransje-benchmark
        </h1>
        <p className="text-muted-foreground mt-1">
          {data.industryLabel} — sammenlign din bedrift med bransjesnittet
        </p>
      </div>

      {data.tenantScore && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{Math.round(data.tenantScore.overallScore)}</p>
                <p className="text-xs text-muted-foreground">Total score (0-100)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold">
                    {data.tenantScore.industryPercentile ?? "—"}
                  </p>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bedre enn {data.tenantScore.industryPercentile}% i din bransje
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendIcon className={`h-6 w-6 ${trendColor}`} />
                  <p className={`text-lg font-semibold ${trendColor}`}>{trendLabel}</p>
                </div>
                <p className="text-xs text-muted-foreground">Trend siste periode</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{Math.round(100 - data.tenantScore.riskScore)}</p>
                <p className="text-xs text-muted-foreground">Sikkerhetsscore (0-100)</p>
              </CardContent>
            </Card>
          </div>

          <BenchmarkRadar
            tenantScores={{
              incidentScore: data.tenantScore.incidentScore,
              trainingScore: data.tenantScore.trainingScore,
              measureScore: data.tenantScore.measureScore,
              inspectionScore: data.tenantScore.inspectionScore,
              complianceScore: data.tenantScore.complianceScore,
            }}
            industryLabel={data.industryLabel}
          />
        </>
      )}

      {data.industrySnapshot && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Bransjesnitt — {data.industryLabel}</span>
              <Badge variant="secondary">{data.industrySnapshot.tenantCount} bedrifter</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">TRIR (bransjesnitt)</p>
                <p className="text-xl font-bold">{data.industrySnapshot.trir?.toFixed(1) ?? "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Snitt lukketid avvik</p>
                <p className="text-xl font-bold">{data.industrySnapshot.avgMttr?.toFixed(0) ?? "—"} dager</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Opplaeringsdekning</p>
                <p className="text-xl font-bold">{data.industrySnapshot.trainingComplianceRate?.toFixed(0) ?? "—"}%</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Tiltak fullfort</p>
                <p className="text-xl font-bold">
                  {data.industrySnapshot.measuresTotal > 0
                    ? Math.round((data.industrySnapshot.measuresCompleted / data.industrySnapshot.measuresTotal) * 100)
                    : "—"}%
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Avvik (90 dager)</p>
                <p className="text-xl font-bold">{data.industrySnapshot.incidentCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Apne risikoer</p>
                <p className="text-xl font-bold">{data.industrySnapshot.risksOpenCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!data.tenantScore && data.isOptedIn && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              Benchmark-data genereres ukentlig. Sjekk tilbake etter neste kjoring.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
