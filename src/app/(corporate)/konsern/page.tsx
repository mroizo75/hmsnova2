import Link from "next/link";
import {
  Building2,
  Users,
  AlertTriangle,
  ShieldCheck,
  FileText,
  ClipboardCheck,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Settings,
  ArrowRight,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCorporateGroupDetails } from "@/server/actions/corporate-group.actions";
import {
  getGroupComplianceScores,
  getGroupIncidentStats,
  getGroupAlerts,
  getGroupOverviewStats,
} from "@/server/actions/corporate-group-stats.actions";
import { IncidentTrendChart } from "./components/incident-trend-chart";
import { ScoreRing } from "./components/score-ring";

function scoreBadge(score: number) {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export default async function CorporateGroupDashboardPage() {
  const [group, scores, incidents, alerts, overview] = await Promise.all([
    getCorporateGroupDetails(),
    getGroupComplianceScores(),
    getGroupIncidentStats(),
    getGroupAlerts(),
    getGroupOverviewStats(),
  ]);

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s, t) => s + t.overallScore, 0) / scores.length)
    : 0;

  const criticalAlerts = alerts.filter((a) => a.type === "critical").length;
  const warningAlerts = alerts.filter((a) => a.type === "warning").length;

  const isNewGroup = overview.totalTenants <= 1 && overview.totalRoutines === 0 && overview.openIncidents === 0;

  const sortedScores = [...scores].sort((a, b) => b.overallScore - a.overallScore);
  const topPerformers = sortedScores.slice(0, 3);
  const needsAttention = sortedScores.filter((s) => s.overallScore < 60).slice(0, 5);

  const onboardingSteps = [
    { title: "Legg til bedrifter", description: "Importer fra Excel eller legg til manuelt.", href: "/konsern/bedrifter", icon: Building2, done: overview.totalTenants > 1, color: "bg-blue-50 text-blue-600" },
    { title: "Last opp konsern-logo", description: "Branding og logo for konsernet.", href: "/konsern/innstillinger", icon: Settings, done: !!group.logo, color: "bg-purple-50 text-purple-600" },
    { title: "Opprett HMS-innhold", description: "Rutiner og dokumenter for distribusjon.", href: "/konsern/innhold", icon: FileText, done: false, color: "bg-teal-50 text-teal-600" },
    { title: "Konfigurer varsler", description: "E-postvarsler for HMS-score og hendelser.", href: "/konsern/innstillinger", icon: AlertCircle, done: false, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          HMS-kontrollpanel
          {group.orgNumber && ` · Org.nr: ${group.orgNumber}`}
        </p>
      </div>

      {/* Velkomst-guide */}
      {isNewGroup && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="rounded-xl bg-blue-100 p-3">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Velkommen til konsern-dashboardet!</h2>
                <p className="mt-1 text-sm text-gray-600">Kom i gang med stegene under.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {onboardingSteps.map((step) => (
                <Link key={step.title} href={step.href} className="group flex items-start gap-3 rounded-xl border border-white/60 bg-white/80 p-4 transition-all hover:bg-white hover:shadow-md">
                  <div className={`rounded-lg p-2 ${step.color}`}><step.icon className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                      {step.done && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Ferdig</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-gray-300 group-hover:text-blue-500" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hovedscore + KPI-er i samlet seksjon */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* HMS-puls – stor score-ring */}
        <Card className="lg:col-span-3">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">HMS-puls</p>
            <ScoreRing score={avgScore} size={96} strokeWidth={8} />
            <p className="mt-3 text-sm font-semibold text-gray-700">Snitt alle bedrifter</p>
            <p className="text-xs text-gray-400">{overview.totalTenants} bedrifter</p>
          </CardContent>
        </Card>

        {/* KPI-grid */}
        <div className="lg:col-span-9 grid gap-3 grid-cols-2 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2.5"><Building2 className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Bedrifter</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.totalTenants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2.5"><Users className="h-4 w-4 text-indigo-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Ansatte</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${overview.openIncidents > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                  <AlertTriangle className={`h-4 w-4 ${overview.openIncidents > 0 ? "text-red-600" : "text-emerald-600"}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Åpne hendelser</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.openIncidents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-50 p-2.5"><FileText className="h-4 w-4 text-purple-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Aktive rutiner</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.totalRoutines}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-50 p-2.5"><ClipboardCheck className="h-4 w-4 text-teal-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Vernerunder</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.completedInspections}</p>
                  <p className="text-[10px] text-gray-400">siste 12 mnd</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${overview.openWhistleblowing > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                  <ShieldAlert className={`h-4 w-4 ${overview.openWhistleblowing > 0 ? "text-red-600" : "text-gray-500"}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Varslingssaker</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.totalWhistleblowing}</p>
                  {overview.openWhistleblowing > 0 && (
                    <p className="text-[10px] text-red-600">{overview.openWhistleblowing} åpne</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Varsler-banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">Krever oppmerksomhet</h3>
              {criticalAlerts > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">{criticalAlerts} kritisk{criticalAlerts !== 1 ? "e" : ""}</span>
              )}
              {warningAlerts > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{warningAlerts} advarsel{warningAlerts !== 1 ? "er" : ""}</span>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.slice(0, 6).map((alert, i) => (
              <Link
                key={`${alert.tenantId}-${alert.category}-${i}`}
                href={`/konsern/bedrifter/${alert.tenantId}`}
                className="flex items-center gap-2.5 rounded-lg bg-white/80 px-3 py-2.5 transition-all hover:bg-white hover:shadow-sm"
              >
                <div className={`h-2 w-2 shrink-0 rounded-full ${
                  alert.type === "critical" ? "bg-red-500" : "bg-amber-500"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{alert.tenantName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{alert.message}</p>
                </div>
                <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" />
              </Link>
            ))}
          </div>
          {alerts.length > 6 && (
            <p className="mt-2 text-center text-xs text-gray-500">
              + {alerts.length - 6} flere varsler
            </p>
          )}
        </div>
      )}

      {/* Midt-seksjon: Hendelsestrend + Topp/Bunn bedrifter */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Hendelsestrend – tar 3/5 */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Hendelser siste 12 måneder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IncidentTrendChart data={incidents.trend} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-gray-50 py-2">
                <p className="text-lg font-bold text-gray-900">{incidents.totals.total}</p>
                <p className="text-[10px] text-gray-500">Totalt</p>
              </div>
              <div className="rounded-lg bg-red-50 py-2">
                <p className="text-lg font-bold text-red-700">{incidents.totals.open}</p>
                <p className="text-[10px] text-gray-500">Åpne</p>
              </div>
              <div className="rounded-lg bg-emerald-50 py-2">
                <p className="text-lg font-bold text-emerald-700">{incidents.totals.closed}</p>
                <p className="text-[10px] text-gray-500">Lukket</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topp + Bunn – tar 2/5 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Topp 3 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Beste bedrifter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topPerformers.length === 0 ? (
                <p className="text-xs text-gray-400">Ingen data</p>
              ) : (
                topPerformers.map((t, i) => (
                  <Link
                    key={t.tenantId}
                    href={`/konsern/bedrifter/${t.tenantId}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-900 truncate">{t.tenantName}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${scoreBadge(t.overallScore)}`}>
                      {t.overallScore}%
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Trenger oppfølging */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Trenger oppfølging
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {needsAttention.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-emerald-700">Alle bedrifter over 60%</p>
                </div>
              ) : (
                needsAttention.map((t) => (
                  <Link
                    key={t.tenantId}
                    href={`/konsern/bedrifter/${t.tenantId}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
                  >
                    <span className="flex-1 text-sm text-gray-900 truncate">{t.tenantName}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${scoreBadge(t.overallScore)}`}>
                      {t.overallScore}%
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Rask-lenke */}
          <Link href="/konsern/bedrifter" className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-sm text-gray-500 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600">
            Se alle bedrifter
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
