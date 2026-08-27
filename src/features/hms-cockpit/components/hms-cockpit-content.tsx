"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ClipboardList,
  GraduationCap,
  FileText,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { ScoreRadar } from "@/features/hms-ai/components/score-radar";
import { ScoreTrendChart } from "@/features/hms-ai/components/score-trend-chart";
import { SuggestionCard } from "@/features/hms-ai/components/suggestion-card";
import { ImprovementTimeline } from "@/features/hms-ai/components/improvement-timeline";
import { AdvisorChat } from "@/features/hms-ai/components/advisor-chat";
import { fetchHmsCockpitData } from "@/server/queries/hms-cockpit.queries";

type CockpitData = NonNullable<Awaited<ReturnType<typeof fetchHmsCockpitData>>>;

interface HmsCockpitContentProps {
  initialData: CockpitData;
}

export function HmsCockpitContent({ initialData }: HmsCockpitContentProps) {
  const { data } = useQuery({
    queryKey: ["hms-cockpit"],
    queryFn: () => fetchHmsCockpitData(),
    initialData,
  });

  if (!data) return null;

  const score = data.latestScore;
  const overallScore = score?.overallScore ?? 0;
  const trend = score?.trend ?? "STABLE";

  const scoreLevel =
    overallScore >= 80 ? "good" : overallScore >= 60 ? "warning" : "critical";

  const scoreColor = {
    good: "text-green-600",
    warning: "text-amber-600",
    critical: "text-red-600",
  }[scoreLevel];

  const scoreBg = {
    good: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
    critical: "bg-red-50 border-red-200",
  }[scoreLevel];

  const trendIcon = {
    IMPROVING: <TrendingUp className="h-5 w-5 text-green-600" />,
    DECLINING: <TrendingDown className="h-5 w-5 text-red-600" />,
    STABLE: <Minus className="h-5 w-5 text-muted-foreground" />,
  }[trend];

  const trendLabel = {
    IMPROVING: "Forbedring",
    DECLINING: "Nedgang",
    STABLE: "Stabil",
  }[trend];

  const subscores = score
    ? [
        { label: "Avviksbehandling", score: score.incidentScore, link: "/dashboard/incidents", icon: AlertTriangle },
        { label: "Rutiner", score: score.routineScore, link: "/dashboard/rutiner", icon: FileText },
        { label: "Vernerunder", score: score.inspectionScore, link: "/dashboard/inspections", icon: ClipboardList },
        { label: "Opplæring", score: score.trainingScore, link: "/dashboard/training", icon: GraduationCap },
        { label: "Risikovurdering", score: score.riskScore, link: "/dashboard/risks", icon: ShieldAlert },
        { label: "Tiltak", score: score.measureScore, link: "/dashboard/incidents", icon: CheckCircle2 },
        { label: "HMS-håndbok", score: score.handbookScore, link: "/dashboard/hms-handbok", icon: FileText },
      ]
    : [];

  const weakest = [...subscores].sort((a, b) => a.score - b.score).slice(0, 3);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HMS Cockpit</h1>
          <p className="text-muted-foreground">
            Samlet oversikt over bedriftens HMS-status og forbedringsarbeid
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/hms-cockpit/stats-export?months=12" target="_blank">
              <FileText className="h-4 w-4 mr-1" />
              Eksporter statistikk
            </a>
          </Button>
          <Button size="sm" asChild>
            <a href="/api/hms-cockpit/report?months=12" target="_blank">
              <FileText className="h-4 w-4 mr-1" />
              PDF-rapport
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`${scoreBg} border`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Samlet HMS-score
                </p>
                <p className={`text-5xl font-bold ${scoreColor}`}>
                  {overallScore}
                </p>
                <p className="text-sm text-muted-foreground">av 100</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  {trendIcon}
                  <span className="text-sm font-medium">{trendLabel}</span>
                </div>
                {score && (
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <p>{score.openIncidents} åpne avvik</p>
                    <p>{score.overdueMeasures} forfalte tiltak</p>
                    <p>{score.expiredTraining} utgått opplæring</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktive mønstre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.activePatterns}</p>
            <p className="text-sm text-muted-foreground">oppdagede trender</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ventende forslag</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {data.activeSuggestions.filter((s: any) => s.status === "PENDING").length}
            </p>
            <p className="text-sm text-muted-foreground">forbedringsforslag</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {score && (
          <Card>
            <CardHeader>
              <CardTitle>Delscorer</CardTitle>
              <CardDescription>7 HMS-områder vektet etter IK-HMS § 5</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreRadar
                incidentScore={score.incidentScore}
                routineScore={score.routineScore}
                inspectionScore={score.inspectionScore}
                trainingScore={score.trainingScore}
                riskScore={score.riskScore}
                measureScore={score.measureScore}
                handbookScore={score.handbookScore}
              />
              <div className="grid grid-cols-2 gap-2 mt-4">
                {subscores.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between text-sm px-2 py-1 rounded"
                  >
                    <span className="text-muted-foreground">{s.label}</span>
                    <span
                      className={
                        s.score >= 80
                          ? "text-green-600 font-medium"
                          : s.score >= 60
                            ? "text-amber-600 font-medium"
                            : "text-red-600 font-medium"
                      }
                    >
                      {s.score}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Historisk utvikling</CardTitle>
            <CardDescription>HMS-score over tid</CardDescription>
          </CardHeader>
          <CardContent>
            {data.scoreHistory.length > 1 ? (
              <ScoreTrendChart data={data.scoreHistory} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">
                Ikke nok data ennå. Scoren beregnes daglig.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {weakest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Neste steg – størst forbedringspotensial</CardTitle>
            <CardDescription>Disse områdene gir størst effekt på HMS-scoren</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {weakest.map((w) => {
                const Icon = w.icon;
                return (
                  <Link key={w.label} href={w.link}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{w.label}</p>
                        <p className="text-xs text-muted-foreground">Score: {w.score}/100</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data.activeSuggestions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Forbedringsforslag</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {data.activeSuggestions.map((s: any) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Forbedringshistorikk</CardTitle>
          <CardDescription>
            Dokumenterte endringer – klar for Arbeidstilsynet (IK-HMS § 5 nr. 7–8)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImprovementTimeline entries={data.recentLogs} />
        </CardContent>
      </Card>

      {data.hasOpenAiKey && <AdvisorChat />}
    </>
  );
}
