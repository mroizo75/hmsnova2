import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantIncidents } from "@/server/actions/corporate-group-read.actions";
import { KonsernPagination } from "@/components/konsern-pagination";

const PAGE_SIZE = 25;

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ page?: string }>;
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    AVVIK: "Avvik",
    NESTEN: "Nestenulykke",
    ULYKKE: "Ulykke",
    FARLIG_SITUASJON: "Farlig situasjon",
    YRKESSYKDOM: "Yrkessykdom",
    MILJO: "Miljøavvik",
    KVALITET: "Kvalitetsavvik",
    CUSTOMER: "Kundeklage",
    HMS: "HMS",
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

function typeColor(type: string): string {
  if (type === "ULYKKE" || type === "YRKESSYKDOM") return "bg-red-50 text-red-700";
  if (type === "NESTEN" || type === "FARLIG_SITUASJON") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

export default async function TenantIncidentsPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { incidents, total } = await getGroupTenantIncidents(tenantId, { limit: PAGE_SIZE, offset });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Hendelser og avvik</h2>
        <span className="text-sm text-gray-500">{total} totalt</span>
      </div>

      {incidents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen hendelser registrert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => (
            <Card key={inc.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {inc.avviksnummer && (
                      <span className="text-xs font-mono text-gray-400">#{inc.avviksnummer}</span>
                    )}
                    <h3 className="text-sm font-medium text-gray-900 truncate">{inc.title}</h3>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor(inc.type)}`}>
                      {formatType(inc.type)}
                    </span>
                    {inc.location && <span>· {inc.location}</span>}
                    <span>· {inc.occurredAt.toLocaleDateString("nb-NO")}</span>
                  </div>
                </div>
                <span className={`shrink-0 ml-3 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(inc.status)}`}>
                  {formatStatus(inc.status)}
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
        basePath={`/konsern/bedrifter/${tenantId}/avvik`}
      />
    </div>
  );
}
