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
  Upload,
  Settings,
  ArrowRight,
  ShieldAlert,
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
import { ComplianceBar } from "./components/compliance-bar";

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

  const statCards = [
    {
      title: "Bedrifter",
      value: overview.totalTenants,
      icon: Building2,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Ansatte totalt",
      value: overview.totalEmployees,
      icon: Users,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      title: "HMS-score snitt",
      value: `${avgScore}%`,
      icon: ShieldCheck,
      color: avgScore >= 80 ? "text-emerald-600 bg-emerald-50" : avgScore >= 60 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50",
    },
    {
      title: "Åpne hendelser",
      value: overview.openIncidents,
      icon: AlertTriangle,
      color: overview.openIncidents > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Aktive rutiner",
      value: overview.totalRoutines,
      icon: FileText,
      color: "text-purple-600 bg-purple-50",
    },
    {
      title: "Vernerunder (12 mnd)",
      value: overview.completedInspections,
      icon: ClipboardCheck,
      color: "text-teal-600 bg-teal-50",
    },
    {
      title: "Varslingssaker",
      value: overview.totalWhistleblowing,
      icon: ShieldAlert,
      color: overview.openWhistleblowing > 0 ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-50",
      subtitle: overview.openWhistleblowing > 0 ? `${overview.openWhistleblowing} åpne` : undefined,
    },
  ];

  const isNewGroup = overview.totalTenants <= 1 && overview.totalRoutines === 0 && overview.openIncidents === 0;

  const onboardingSteps = [
    {
      title: "Legg til bedrifter",
      description: "Importer bedriftene dine fra en Excel-liste eller legg dem til manuelt.",
      href: "/konsern/bedrifter",
      icon: Building2,
      done: overview.totalTenants > 1,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Last opp konsern-logo",
      description: "Gjør konsern-dashboardet ditt til deres eget med logo og branding.",
      href: "/konsern/innstillinger",
      icon: Settings,
      done: !!group.logo,
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Opprett HMS-innhold",
      description: "Lag rutiner, dokumenter og annet HMS-innhold som kan distribueres til bedriftene.",
      href: "/konsern/innhold",
      icon: FileText,
      done: false,
      color: "bg-teal-50 text-teal-600",
    },
    {
      title: "Konfigurer varsler",
      description: "Sett opp e-postvarsler for HMS-score, hendelser og rutinegjennomgang.",
      href: "/konsern/innstillinger",
      icon: AlertCircle,
      done: false,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          HMS-kontrollpanel
          {group.orgNumber && ` · Org.nr: ${group.orgNumber}`}
        </p>
      </div>

      {/* Velkomst-guide for nye konsern */}
      {isNewGroup && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="rounded-xl bg-blue-100 p-3">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Velkommen til konsern-dashboardet!</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Her administrerer du HMS-arbeidet for alle bedriftene i {group.name}.
                  Følg stegene under for å komme i gang.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {onboardingSteps.map((step) => (
                <Link
                  key={step.title}
                  href={step.href}
                  className="group flex items-start gap-3 rounded-xl border border-white/60 bg-white/80 p-4 transition-all hover:bg-white hover:shadow-md"
                >
                  <div className={`rounded-lg p-2 ${step.color}`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                      {step.done && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Ferdig</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{step.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-gray-300 transition-colors group-hover:text-blue-500" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI-kort */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2.5 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{stat.title}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                {"subtitle" in stat && stat.subtitle && (
                  <p className="text-[10px] text-amber-600">{stat.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compliance-score per hotell */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                Compliance-score per bedrift
              </CardTitle>
              <Link
                href="/konsern/bedrifter"
                className="text-xs text-blue-600 hover:underline"
              >
                Se alle
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {scores.length === 0 ? (
              <p className="text-sm text-gray-400">Ingen bedrifter registrert</p>
            ) : (
              scores
                .sort((a, b) => a.overallScore - b.overallScore)
                .map((tenant) => (
                  <Link
                    key={tenant.tenantId}
                    href={`/konsern/bedrifter/${tenant.tenantId}`}
                    className="block rounded-lg p-3 -mx-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{tenant.tenantName}</span>
                      {tenant.city && (
                        <span className="text-xs text-gray-400">{tenant.city}</span>
                      )}
                    </div>
                    <ComplianceBar score={tenant.overallScore} showLabel={false} />
                    <div className="mt-2 flex gap-3 text-[10px] text-gray-400">
                      <span>Rutiner {tenant.routineScore}%</span>
                      <span>Risiko {tenant.riskScore}%</span>
                      <span>Dok. {tenant.documentScore}%</span>
                      <span>Vernerunder {tenant.inspectionScore}%</span>
                      <span>Opplæring {tenant.trainingScore}%</span>
                    </div>
                  </Link>
                ))
            )}
          </CardContent>
        </Card>

        {/* Hendelsestrend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Hendelser siste 12 måneder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IncidentTrendChart data={incidents.trend} />
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-lg font-bold text-gray-900">{incidents.totals.total}</p>
                <p className="text-[10px] text-gray-500">Totalt</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2">
                <p className="text-lg font-bold text-red-700">{incidents.totals.open}</p>
                <p className="text-[10px] text-gray-500">Åpne</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2">
                <p className="text-lg font-bold text-emerald-700">{incidents.totals.closed}</p>
                <p className="text-[10px] text-gray-500">Lukket</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Varsler */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Varsler som krever oppmerksomhet
              {criticalAlerts > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {criticalAlerts} kritisk{criticalAlerts !== 1 ? "e" : ""}
                </span>
              )}
              {warningAlerts > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {warningAlerts} advarsel{warningAlerts !== 1 ? "er" : ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <Link
                  key={`${alert.tenantId}-${alert.category}-${i}`}
                  href={`/konsern/bedrifter/${alert.tenantId}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      alert.type === "critical" ? "bg-red-500" : alert.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{alert.tenantName}</p>
                      <p className="text-xs text-gray-500">{alert.message}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
