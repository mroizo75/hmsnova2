import Link from "next/link";
import {
  Send,
  CheckCircle,
  Clock,
  XCircle,
  MinusCircle,
  Lock,
  Unlock,
  FileText,
  ArrowUpRight,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listDistributions, getDistributionStats, listGroupContent } from "@/server/actions/corporate-group-content.actions";
import { listGroupTenants } from "@/server/actions/corporate-group.actions";
import { KonsernPagination } from "@/components/konsern-pagination";

const PAGE_SIZE = 30;

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

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function CorporateGroupDistributionPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [allDistributions, stats, allContent, tenants] = await Promise.all([
    listDistributions(),
    getDistributionStats(),
    listGroupContent({ status: "PUBLISHED" }),
    listGroupTenants(),
  ]);

  const totalPublished = allContent.length;
  const totalTenants = tenants.length;
  const maxPossible = totalPublished * totalTenants;
  const activeDistributions = allDistributions.filter((d) => d.status === "DISTRIBUTED").length;
  const coveragePercent = maxPossible > 0 ? Math.round((activeDistributions / maxPossible) * 100) : 0;
  const locallyModifiedCount = allDistributions.filter((d) => d.locallyModified && d.status === "DISTRIBUTED").length;

  const total = allDistributions.length;
  const offset = (page - 1) * PAGE_SIZE;
  const distributions = allDistributions.slice(offset, offset + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Distribusjon</h1>
        <p className="mt-1 text-sm text-gray-500">
          Oversikt over alt innhold distribuert til bedriftene
        </p>
      </div>

      {/* Forklaring */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
        <div className="text-sm text-blue-800">
          <p>
            Denne siden er en <strong>leseoversikt</strong> over distribuert innhold.
            For å opprette, redigere eller distribuere innhold, gå til{" "}
            <Link href="/konsern/innhold" className="font-medium underline hover:text-blue-900">
              Innhold
            </Link>.
          </p>
        </div>
      </div>

      {/* KPI-kort */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(distStatusConfig).map(([status, config]) => {
          const count = stats.distributionsByStatus.find((s) => s.status === status)?._count ?? 0;
          if (count === 0 && status !== "DISTRIBUTED") return null;
          const Icon = config.icon;
          return (
            <Card key={status}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Send className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dekning</p>
              <p className="text-xl font-bold text-gray-900">{coveragePercent}%</p>
              <p className="text-[10px] text-gray-400">{activeDistributions}/{maxPossible}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advarsler */}
      {locallyModifiedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{locallyModifiedCount}</strong> distribusjon{locallyModifiedCount > 1 ? "er" : ""} er lokalt endret av bedriften og avviker fra konsernversjonen.
          </p>
        </div>
      )}

      {allDistributions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">Ingen distribusjoner registrert ennå.</p>
            <p className="mt-1 text-xs text-gray-400">Gå til Innhold, opprett og publiser innhold, deretter distribuer til bedriftene.</p>
            <Link href="/konsern/innhold" className="mt-4">
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Gå til innhold
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Alle distribusjoner</CardTitle>
              <span className="text-xs text-gray-500">{total} totalt</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Innhold</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Bedrift</th>
                    <th className="hidden md:table-cell px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Modus</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Dato</th>
                    <th className="px-3 py-3"><span className="sr-only">Handling</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {distributions.map((dist) => {
                    const sc = distStatusConfig[dist.status] ?? distStatusConfig.PENDING;
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={dist.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900 truncate max-w-[220px]">{dist.content.title}</p>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                            {contentTypeLabels[dist.content.contentType] ?? dist.content.contentType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-900 truncate max-w-[180px]">{dist.tenant.name}</p>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            {dist.content.distributionMode === "LOCKED" ? (
                              <><Lock className="h-3 w-3" /> Låst</>
                            ) : (
                              <><Unlock className="h-3 w-3" /> Tilpassbar</>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${sc.color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {sc.label}
                            {dist.locallyModified && dist.status === "DISTRIBUTED" && (
                              <AlertTriangle className="ml-0.5 h-3 w-3 text-amber-500" />
                            )}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 text-xs text-gray-500">
                          {formatDate(dist.distributedAt)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/konsern/innhold/${dist.content.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 pb-4">
              <KonsernPagination
                currentPage={page}
                totalItems={total}
                pageSize={PAGE_SIZE}
                basePath="/konsern/distribusjon"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
