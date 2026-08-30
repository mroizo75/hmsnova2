import Link from "next/link";
import {
  Users,
  AlertTriangle,
  FileText,
  Shield,
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  ChevronRight,
  ShieldAlert,
  CalendarCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupTenantOverview } from "@/server/actions/corporate-group-read.actions";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

function formatIncidentType(type: string): string {
  const labels: Record<string, string> = {
    AVVIK: "Avvik",
    NESTEN: "Nestenulykke",
    ULYKKE: "Ulykke",
    FARLIG_SITUASJON: "Farlig situasjon",
    YRKESSYKDOM: "Yrkessykdom",
    MILJO: "Miljøavvik",
    KVALITET: "Kvalitetsavvik",
    CUSTOMER: "Kundeklage",
  };
  return labels[type] ?? type;
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    OPEN: "Åpen",
    INVESTIGATING: "Under behandling",
    ACTION_TAKEN: "Tiltak iverksatt",
    CLOSED: "Lukket",
  };
  return labels[status] ?? status;
}

function statusColor(status: string): string {
  if (status === "OPEN") return "bg-red-50 text-red-700";
  if (status === "INVESTIGATING") return "bg-amber-50 text-amber-700";
  if (status === "ACTION_TAKEN") return "bg-blue-50 text-blue-700";
  return "bg-emerald-50 text-emerald-700";
}

export default async function TenantOverviewPage({ params }: PageProps) {
  const { tenantId } = await params;
  const overview = await getGroupTenantOverview(tenantId);

  const basePath = `/konsern/bedrifter/${tenantId}`;

  const kpiCards = [
    {
      title: "Ansatte",
      value: overview.employeeCount,
      icon: Users,
      color: "text-indigo-600 bg-indigo-50",
      href: `${basePath}/ansatte`,
    },
    {
      title: "Åpne hendelser",
      value: overview.openIncidents,
      icon: AlertTriangle,
      color: overview.openIncidents > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50",
      href: `${basePath}/avvik`,
    },
    {
      title: "Aktive rutiner",
      value: overview.activeRoutines,
      icon: FileText,
      color: "text-purple-600 bg-purple-50",
      href: `${basePath}/rutiner`,
      subtitle: overview.needsReviewRoutines > 0 ? `${overview.needsReviewRoutines} trenger gjennomgang` : undefined,
    },
    {
      title: "Dokumenter",
      value: overview.approvedDocuments,
      icon: BookOpen,
      color: "text-blue-600 bg-blue-50",
      href: `${basePath}/dokumenter`,
    },
    {
      title: "Risikovurderinger",
      value: overview.riskAssessments,
      icon: Shield,
      color: "text-amber-600 bg-amber-50",
      href: `${basePath}/risikovurderinger`,
    },
    {
      title: "Vernerunder (12 mnd)",
      value: overview.completedInspections,
      icon: ClipboardCheck,
      color: "text-teal-600 bg-teal-50",
      href: `${basePath}/vernerunder`,
      subtitle: overview.plannedInspections > 0 ? `${overview.plannedInspections} planlagt` : undefined,
    },
    {
      title: "Gyldig opplæring",
      value: overview.validTraining,
      icon: GraduationCap,
      color: "text-green-600 bg-green-50",
      href: `${basePath}/kompetanse`,
      subtitle: overview.expiredTraining > 0 ? `${overview.expiredTraining} utgått` : undefined,
    },
    {
      title: "Varslingssaker",
      value: overview.totalWhistleblowing,
      icon: ShieldAlert,
      color: overview.openWhistleblowing > 0 ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-50",
      href: `${basePath}/varsling`,
      subtitle: overview.openWhistleblowing > 0 ? `${overview.openWhistleblowing} åpne` : undefined,
    },
    {
      title: "HMS Årshjul",
      value: `${overview.annualPlanCompletions}/${overview.annualPlanTotal}`,
      icon: CalendarCheck,
      color: overview.annualPlanCompletions >= overview.annualPlanTotal
        ? "text-emerald-600 bg-emerald-50"
        : "text-amber-600 bg-amber-50",
      href: `${basePath}/arshjul`,
      subtitle: overview.annualPlanCompletions >= overview.annualPlanTotal ? "Komplett" : "Under arbeid",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI-kort */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Link key={kpi.title} href={kpi.href ?? "#"} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg p-2.5 ${kpi.color}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{kpi.title}</p>
                  <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                  {kpi.subtitle && (
                    <p className="text-[10px] text-amber-600">{kpi.subtitle}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Siste hendelser */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Siste hendelser
            </CardTitle>
            <Link
              href={`${basePath}/avvik`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Se alle <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {overview.recentIncidents.length === 0 ? (
            <p className="text-sm text-gray-400">Ingen hendelser registrert</p>
          ) : (
            <div className="space-y-2">
              {overview.recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{incident.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatIncidentType(incident.type)}</span>
                      <span>·</span>
                      <span>{incident.occurredAt.toLocaleDateString("nb-NO")}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 ml-3 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(incident.status)}`}>
                    {formatStatus(incident.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
