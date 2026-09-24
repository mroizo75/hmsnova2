import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantIncidents } from "@/server/actions/corporate-group-read.actions";
import { KonsernPagination } from "@/components/konsern-pagination";
import { IncidentList } from "./incident-list";

const PAGE_SIZE = 15;

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function TenantIncidentsPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { incidents, total } = await getGroupTenantIncidents(tenantId, { limit: PAGE_SIZE, offset });

  const openCount = incidents.filter((i) => i.status === "OPEN").length;
  const overdueCount = incidents.filter((i) => {
    if (i.status === "CLOSED") return false;
    const days = Math.floor((Date.now() - new Date(i.occurredAt).getTime()) / (1000 * 60 * 60 * 24));
    return i.status === "OPEN" && days > 30;
  }).length;
  const withoutMeasures = incidents.filter((i) => i.status !== "CLOSED" && i._count.measures === 0).length;
  const overdueMeasureCount = incidents.reduce(
    (sum, i) => sum + i.measures.filter((m) => m.status !== "DONE" && new Date(m.dueAt) < new Date()).length,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Hendelser og avvik</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Detaljert oversikt — klikk på en hendelse for tiltak og oppfølging
          </p>
        </div>
        <span className="text-sm text-gray-500">{total} totalt</span>
      </div>

      {/* Oppsummering */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className={openCount > 0 ? "border-red-200" : ""}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{openCount}</p>
              <p className="text-xs text-gray-500">Åpne saker</p>
            </div>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? "border-red-200" : ""}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{overdueCount}</p>
              <p className="text-xs text-gray-500">Over 30 dager</p>
            </div>
          </CardContent>
        </Card>
        <Card className={withoutMeasures > 0 ? "border-amber-200" : ""}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{withoutMeasures}</p>
              <p className="text-xs text-gray-500">Uten tiltak</p>
            </div>
          </CardContent>
        </Card>
        <Card className={overdueMeasureCount > 0 ? "border-red-200" : ""}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{overdueMeasureCount}</p>
              <p className="text-xs text-gray-500">Forfalte tiltak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {incidents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen hendelser registrert</p>
          </CardContent>
        </Card>
      ) : (
        <IncidentList incidents={incidents} />
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
