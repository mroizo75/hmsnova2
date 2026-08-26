import Link from "next/link";
import {
  Send,
  CheckCircle,
  Clock,
  XCircle,
  MinusCircle,
  Lock,
  Unlock,
  Building2,
  FileText,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listDistributions, getDistributionStats, listGroupContent } from "@/server/actions/corporate-group-content.actions";
import { listGroupTenants } from "@/server/actions/corporate-group.actions";

const distStatusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  DISTRIBUTED: { label: "Distribuert", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  PENDING: { label: "Venter", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  REJECTED: { label: "Avvist", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  WITHDRAWN: { label: "Trukket tilbake", icon: MinusCircle, color: "text-gray-500", bg: "bg-gray-50" },
};

const contentTypeLabels: Record<string, string> = {
  ROUTINE: "Rutine",
  DOCUMENT: "Dokument",
  RISK_ASSESSMENT: "Risikovurdering",
  INSPECTION_TEMPLATE: "Inspeksjonsmal",
  SJA_TEMPLATE: "SJA-mal",
  TRAINING_COURSE: "Opplæringskurs",
  CHEMICAL: "Kjemikalie",
  HANDBOOK_SECTION: "HMS-håndbok",
};

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export default async function CorporateGroupDistributionPage() {
  const [distributions, stats, allContent, tenants] = await Promise.all([
    listDistributions(),
    getDistributionStats(),
    listGroupContent({ status: "PUBLISHED" }),
    listGroupTenants(),
  ]);

  const totalPublished = allContent.length;
  const totalTenants = tenants.length;
  const maxPossible = totalPublished * totalTenants;
  const activeDistributions = distributions.filter((d) => d.status === "DISTRIBUTED").length;
  const coveragePercent = maxPossible > 0 ? Math.round((activeDistributions / maxPossible) * 100) : 0;
  const locallyModifiedCount = distributions.filter((d) => d.locallyModified && d.status === "DISTRIBUTED").length;

  const distributionsByTenant = new Map<string, typeof distributions>();
  for (const dist of distributions) {
    const key = dist.tenantId;
    if (!distributionsByTenant.has(key)) {
      distributionsByTenant.set(key, []);
    }
    distributionsByTenant.get(key)!.push(dist);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Distribusjon</h1>
        <p className="mt-1 text-sm text-gray-500">
          Oversikt over alt innhold distribuert til bedriftene
        </p>
      </div>

      {/* KPI-kort */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(distStatusConfig).map(([status, config]) => {
          const count = stats.distributionsByStatus.find((s) => s.status === status)?._count ?? 0;
          if (count === 0 && status !== "DISTRIBUTED") return null;
          const Icon = config.icon;
          return (
            <Card key={status}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bg}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{config.label}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dekning</p>
              <p className="text-xl font-bold text-gray-900">{coveragePercent}%</p>
              <p className="text-[10px] text-gray-400">{activeDistributions}/{maxPossible} mulige</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advarsler */}
      {locallyModifiedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{locallyModifiedCount}</strong> distribusjon{locallyModifiedCount > 1 ? "er" : ""} er lokalt endret av bedriften.
            Disse avviker fra konsernversjonen.
          </p>
        </div>
      )}

      {distributions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">Ingen distribusjoner registrert ennå.</p>
            <p className="mt-1 text-xs text-gray-400">Gå til Innhold → velg innhold → Publiser → Distribuer</p>
            <Link href="/konsern/innhold" className="mt-4">
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Gå til innhold
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabell-visning */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Alle distribusjoner</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Innhold</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Bedrift</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Modus</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Dato</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {distributions.map((dist) => {
                      const sc = distStatusConfig[dist.status] ?? distStatusConfig.PENDING;
                      const StatusIcon = sc.icon;
                      return (
                        <tr key={dist.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-3">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{dist.content.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">
                              {contentTypeLabels[dist.content.contentType] ?? dist.content.contentType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-gray-900">{dist.tenant.name}</p>
                              {dist.tenant.city && <p className="text-xs text-gray-400">{dist.tenant.city}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              {dist.content.distributionMode === "LOCKED" ? (
                                <><Lock className="h-3 w-3" /> Låst</>
                              ) : (
                                <><Unlock className="h-3 w-3" /> Tilpassbar</>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {sc.label}
                              {dist.locallyModified && dist.status === "DISTRIBUTED" && (
                                <span className="ml-1 text-amber-500" title="Lokalt endret">⚠</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {formatDate(dist.distributedAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/konsern/innhold/${dist.content.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                <ArrowUpRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Gruppert per bedrift */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Per bedrift</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(distributionsByTenant.entries()).map(([tenantId, dists]) => {
                const tenant = dists[0].tenant;
                const active = dists.filter((d) => d.status === "DISTRIBUTED").length;
                const withdrawn = dists.filter((d) => d.status === "WITHDRAWN").length;
                const modified = dists.filter((d) => d.locallyModified && d.status === "DISTRIBUTED").length;

                return (
                  <Card key={tenantId}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                            <Building2 className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{tenant.name}</p>
                            {tenant.city && <p className="text-xs text-gray-400">{tenant.city}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          {active} aktive
                        </span>
                        {withdrawn > 0 && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <MinusCircle className="h-3 w-3" />
                            {withdrawn} trukket
                          </span>
                        )}
                        {modified > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            {modified} endret
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {dists
                          .filter((d) => d.status === "DISTRIBUTED")
                          .slice(0, 4)
                          .map((d) => (
                            <div key={d.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 truncate max-w-[160px]">{d.content.title}</span>
                              <span className="flex items-center gap-1 text-gray-400 shrink-0">
                                {d.content.distributionMode === "LOCKED" ? (
                                  <Lock className="h-2.5 w-2.5" />
                                ) : (
                                  <Unlock className="h-2.5 w-2.5" />
                                )}
                              </span>
                            </div>
                          ))}
                        {dists.filter((d) => d.status === "DISTRIBUTED").length > 4 && (
                          <p className="text-[10px] text-gray-400">
                            + {dists.filter((d) => d.status === "DISTRIBUTED").length - 4} til
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Bedrifter uten distribusjoner */}
              {tenants
                .filter((t) => !distributionsByTenant.has(t.tenant.id))
                .map((t) => (
                  <Card key={t.tenant.id} className="border-dashed">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50">
                        <Building2 className="h-4 w-4 text-gray-300" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-400">{t.tenant.name}</p>
                        <p className="text-xs text-gray-300">Ingen distribusjoner ennå</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
