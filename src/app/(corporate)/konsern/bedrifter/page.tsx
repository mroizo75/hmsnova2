import Link from "next/link";
import {
  Building2,
  MapPin,
  Users,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { listGroupTenants } from "@/server/actions/corporate-group.actions";
import {
  getGroupComplianceScores,
  getGroupIncidentStats,
} from "@/server/actions/corporate-group-stats.actions";
import { requireCorporateGroupContext } from "@/lib/corporate-group-context";
import { ScoreRing } from "../components/score-ring";
import { ExcelImportTenants } from "../components/excel-import-tenants";
import { AddTenantManual } from "../components/add-tenant-manual";

function scoreBadge(score: number) {
  if (score >= 80) return "bg-emerald-50 text-emerald-700";
  if (score >= 60) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export default async function CorporateGroupTenantsPage() {
  const [context, tenants, scores, incidentStats] = await Promise.all([
    requireCorporateGroupContext(),
    listGroupTenants(),
    getGroupComplianceScores(),
    getGroupIncidentStats(),
  ]);

  const scoreMap = new Map(scores.map((s) => [s.tenantId, s]));
  const incidentMap = new Map(
    incidentStats.byTenant.map((i) => [i.tenantId, i._count])
  );

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s, t) => s + t.overallScore, 0) / scores.length)
    : 0;
  const bestTenant = scores.length > 0 ? scores.reduce((a, b) => a.overallScore > b.overallScore ? a : b) : null;
  const worstTenant = scores.length > 0 ? scores.reduce((a, b) => a.overallScore < b.overallScore ? a : b) : null;
  const totalEmployees = scores.reduce((s, t) => s + (t.employeeCount ?? 0), 0);
  const totalIncidents = incidentStats.byTenant.reduce((s, i) => s + i._count, 0);

  const sortedTenants = [...tenants].sort((a, b) => {
    const scoreA = scoreMap.get(a.tenant.id)?.overallScore ?? 0;
    const scoreB = scoreMap.get(b.tenant.id)?.overallScore ?? 0;
    return scoreA - scoreB;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bedrifter i konsernet</h1>
        <p className="mt-1 text-sm text-gray-500">
          {tenants.length} bedrift{tenants.length !== 1 ? "er" : ""} · {totalEmployees} ansatte · {totalIncidents} hendelser siste 12 mnd
        </p>
      </div>

      {/* Highlight-kort */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-4 p-5">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Gjennomsnittlig HMS-score</p>
              <p className={`text-3xl font-bold ${avgScore >= 80 ? "text-emerald-700" : avgScore >= 60 ? "text-amber-700" : "text-red-700"}`}>
                {avgScore}%
              </p>
            </div>
          </CardContent>
        </Card>

        {bestTenant && (
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="flex items-center gap-4 p-5">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm text-gray-500">Beste bedrift</p>
                <p className="text-lg font-bold text-gray-900">{bestTenant.tenantName}</p>
                <p className="text-sm font-semibold text-emerald-700">{bestTenant.overallScore}% score</p>
              </div>
            </CardContent>
          </Card>
        )}

        {worstTenant && (
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="flex items-center gap-4 p-5">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Trenger oppmerksomhet</p>
                <p className="text-lg font-bold text-gray-900">{worstTenant.tenantName}</p>
                <p className="text-sm font-semibold text-red-700">{worstTenant.overallScore}% score</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">Ingen bedrifter er tilknyttet konsernet ennå.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Bedrift
                </th>
                <th className="hidden md:table-cell px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  HMS-score
                </th>
                <th className="hidden lg:table-cell px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Rutiner
                </th>
                <th className="hidden lg:table-cell px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Risiko
                </th>
                <th className="hidden lg:table-cell px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Dokumenter
                </th>
                <th className="hidden xl:table-cell px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Vernerunder
                </th>
                <th className="hidden xl:table-cell px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Opplæring
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Hendelser
                </th>
                <th className="hidden sm:table-cell px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ansatte
                </th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <span className="sr-only">Detaljer</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTenants.map((gt) => {
                const score = scoreMap.get(gt.tenant.id);
                const incidentCount = incidentMap.get(gt.tenant.id) ?? 0;

                return (
                  <tr
                    key={gt.id}
                    className="group transition-colors hover:bg-blue-50/50"
                  >
                    <td className="px-5 py-4">
                      <Link href={`/konsern/bedrifter/${gt.tenant.id}`} className="block">
                        <div className="flex items-center gap-3">
                          {/* Mobil score-badge */}
                          <div className="md:hidden">
                            <ScoreRing score={score?.overallScore ?? 0} size={40} strokeWidth={4} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                {gt.tenant.name}
                              </span>
                              <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                gt.tenant.status === "ACTIVE"
                                  ? "bg-green-50 text-green-700"
                                  : gt.tenant.status === "TRIAL"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                              }`}>
                                {gt.tenant.status === "ACTIVE" ? "Aktiv" : gt.tenant.status}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                              {gt.tenant.city && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {gt.tenant.city}
                                </span>
                              )}
                              {gt.tenant.orgNumber && (
                                <span>· {gt.tenant.orgNumber}</span>
                              )}
                              {gt.tenant.contactPerson && (
                                <span className="hidden lg:inline">· {gt.tenant.contactPerson}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </td>

                    <td className="hidden md:table-cell px-4 py-4 text-center">
                      <Link href={`/konsern/bedrifter/${gt.tenant.id}`}>
                        <ScoreRing score={score?.overallScore ?? 0} size={44} strokeWidth={4} />
                      </Link>
                    </td>

                    <td className="hidden lg:table-cell px-4 py-4 text-center">
                      <span className={`inline-block rounded-md px-2 py-1 text-xs font-bold ${scoreBadge(score?.routineScore ?? 0)}`}>
                        {score?.routineScore ?? 0}%
                      </span>
                    </td>

                    <td className="hidden lg:table-cell px-4 py-4 text-center">
                      <span className={`inline-block rounded-md px-2 py-1 text-xs font-bold ${scoreBadge(score?.riskScore ?? 0)}`}>
                        {score?.riskScore ?? 0}%
                      </span>
                    </td>

                    <td className="hidden lg:table-cell px-4 py-4 text-center">
                      <span className={`inline-block rounded-md px-2 py-1 text-xs font-bold ${scoreBadge(score?.documentScore ?? 0)}`}>
                        {score?.documentScore ?? 0}%
                      </span>
                    </td>

                    <td className="hidden xl:table-cell px-4 py-4 text-center">
                      <span className={`inline-block rounded-md px-2 py-1 text-xs font-bold ${scoreBadge(score?.inspectionScore ?? 0)}`}>
                        {score?.inspectionScore ?? 0}%
                      </span>
                    </td>

                    <td className="hidden xl:table-cell px-4 py-4 text-center">
                      <span className={`inline-block rounded-md px-2 py-1 text-xs font-bold ${scoreBadge(score?.trainingScore ?? 0)}`}>
                        {score?.trainingScore ?? 0}%
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      {incidentCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          {incidentCount}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">0</span>
                      )}
                    </td>

                    <td className="hidden sm:table-cell px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Users className="h-3 w-3" />
                        {gt.tenant.employeeCount ?? "—"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/konsern/bedrifter/${gt.tenant.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Detaljer
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {context.groupRole === "GROUP_ADMIN" && (
        <div className="space-y-4">
          <AddTenantManual />
          <ExcelImportTenants groupId={context.groupId} />
        </div>
      )}
    </div>
  );
}
