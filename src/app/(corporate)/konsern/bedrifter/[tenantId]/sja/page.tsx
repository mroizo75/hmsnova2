import { HardHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantSjaAnalyses } from "@/server/actions/corporate-group-read.actions";
import { KonsernPagination } from "@/components/konsern-pagination";

const PAGE_SIZE = 25;

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ page?: string }>;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Utkast",
    ACTIVE: "Aktiv",
    COMPLETED: "Fullført",
    CANCELLED: "Kansellert",
  };
  return labels[status] ?? status;
}

function conclusionLabel(conclusion: string): string {
  const labels: Record<string, string> = {
    NOT_DECIDED: "Ikke besluttet",
    APPROVED: "Godkjent",
    CONDITIONAL: "Betinget",
    REJECTED: "Avvist",
  };
  return labels[conclusion] ?? conclusion;
}

function statusColor(status: string): string {
  if (status === "ACTIVE") return "bg-blue-50 text-blue-700";
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "bg-gray-100 text-gray-500";
  return "bg-gray-100 text-gray-600";
}

export default async function TenantSjaPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { analyses, total } = await getGroupTenantSjaAnalyses(tenantId, { limit: PAGE_SIZE, offset });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Sikker Jobb-Analyser (SJA)</h2>
        <span className="text-sm text-gray-500">{total} totalt</span>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HardHat className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen SJA-er registrert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {analyses.map((sja) => (
            <Card key={sja.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {sja.sjaNummer && (
                      <span className="text-xs font-mono text-gray-400">#{sja.sjaNummer}</span>
                    )}
                    <h3 className="text-sm font-medium text-gray-900 truncate">{sja.title}</h3>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>{sja.workLocation}</span>
                    <span>·</span>
                    <span>{sja.plannedDate.toLocaleDateString("nb-NO")}</span>
                    <span>·</span>
                    <span>Konklusjon: {conclusionLabel(sja.conclusion)}</span>
                    {sja.createdByName && (
                      <>
                        <span>·</span>
                        <span>{sja.createdByName}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 ml-3 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(sja.status)}`}>
                  {statusLabel(sja.status)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <KonsernPagination
        currentPage={page}
        totalItems={total}
        pageSize={PAGE_SIZE}
        basePath={`/konsern/bedrifter/${tenantId}/sja`}
      />
    </div>
  );
}
