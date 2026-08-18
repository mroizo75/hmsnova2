import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import Link from "next/link"
import { ScoreRadar } from "@/features/hms-ai/components/score-radar"
import { ScoreTrendChart } from "@/features/hms-ai/components/score-trend-chart"
import { SuggestionCard } from "@/features/hms-ai/components/suggestion-card"
import { ImprovementTimeline } from "@/features/hms-ai/components/improvement-timeline"
import { AdvisorChat } from "@/features/hms-ai/components/advisor-chat"
import type { UserTenant } from "@prisma/client"

function resolveActiveTenantId(
  tenantMemberships: UserTenant[],
  sessionTenantId?: string,
): string | null {
  if (sessionTenantId) {
    const has = tenantMemberships.some((m) => m.tenantId === sessionTenantId)
    if (!has) return null
    return sessionTenantId
  }
  return tenantMemberships[0]?.tenantId ?? null
}

export default async function HmsCockpitPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  })

  if (!user) redirect("/login")

  const tenantId = resolveActiveTenantId(
    user.tenants,
    (session as any).activeTenantId,
  )
  if (!tenantId) redirect("/velg-bedrift")

  const [latestScore, scoreHistory, activeSuggestions, recentLogs, activePatterns] =
    await Promise.all([
      prisma.tenantHmsScore.findFirst({
        where: { tenantId },
        orderBy: { scoreDate: "desc" },
      }),
      prisma.tenantHmsScore.findMany({
        where: { tenantId },
        orderBy: { scoreDate: "asc" },
        take: 90,
      }),
      prisma.improvementSuggestion.findMany({
        where: { tenantId, status: { in: ["PENDING", "ACCEPTED"] } },
        include: { pattern: true },
        orderBy: { priority: "desc" },
      }),
      prisma.improvementLog.findMany({
        where: { tenantId },
        orderBy: { changedAt: "desc" },
        take: 10,
      }),
      prisma.patternCache.count({
        where: { tenantId, isActive: true },
      }),
    ])

  const score = latestScore
  const overallScore = score?.overallScore ?? 0
  const trend = score?.trend ?? "STABLE"

  const scoreLevel =
    overallScore >= 80 ? "good" : overallScore >= 60 ? "warning" : "critical"

  const scoreColor = {
    good: "text-green-600",
    warning: "text-amber-600",
    critical: "text-red-600",
  }[scoreLevel]

  const scoreBg = {
    good: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
    critical: "bg-red-50 border-red-200",
  }[scoreLevel]

  const trendIcon = {
    IMPROVING: <TrendingUp className="h-5 w-5 text-green-600" />,
    DECLINING: <TrendingDown className="h-5 w-5 text-red-600" />,
    STABLE: <Minus className="h-5 w-5 text-muted-foreground" />,
  }[trend]

  const trendLabel = {
    IMPROVING: "Forbedring",
    DECLINING: "Nedgang",
    STABLE: "Stabil",
  }[trend]

  // Finn de 3 svakeste delscorene for «Neste steg»
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
    : []

  const weakest = [...subscores].sort((a, b) => a.score - b.score).slice(0, 3)

  return (
    <div className="space-y-6">
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

      {/* Samlet score */}
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
            <CardTitle className="text-sm font-medium">
              Aktive mønstre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activePatterns}</p>
            <p className="text-sm text-muted-foreground">
              oppdagede trender
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Ventende forslag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {activeSuggestions.filter((s) => s.status === "PENDING").length}
            </p>
            <p className="text-sm text-muted-foreground">
              forbedringsforslag
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar */}
        {score && (
          <Card>
            <CardHeader>
              <CardTitle>Delscorer</CardTitle>
              <CardDescription>
                7 HMS-områder vektet etter IK-HMS § 5
              </CardDescription>
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

        {/* Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Historisk utvikling</CardTitle>
            <CardDescription>HMS-score over tid</CardDescription>
          </CardHeader>
          <CardContent>
            {scoreHistory.length > 1 ? (
              <ScoreTrendChart data={scoreHistory} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">
                Ikke nok data ennå. Scoren beregnes daglig.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Neste steg */}
      {weakest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Neste steg – størst forbedringspotensial</CardTitle>
            <CardDescription>
              Disse områdene gir størst effekt på HMS-scoren
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {weakest.map((w) => {
                const Icon = w.icon
                return (
                  <Link key={w.label} href={w.link}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{w.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Score: {w.score}/100
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forbedringsforslag */}
      {activeSuggestions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Forbedringsforslag</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {activeSuggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          </div>
        </div>
      )}

      {/* Forbedringshistorikk */}
      <Card>
        <CardHeader>
          <CardTitle>Forbedringshistorikk</CardTitle>
          <CardDescription>
            Dokumenterte endringer – klar for Arbeidstilsynet (IK-HMS § 5 nr. 7–8)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImprovementTimeline entries={recentLogs} />
        </CardContent>
      </Card>

      {/* HMS-rådgiver chat (valgfri – krever OPENAI_API_KEY) */}
      {process.env.OPENAI_API_KEY && <AdvisorChat />}
    </div>
  )
}
