import { ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantInspections } from "@/server/actions/corporate-group-read.actions";
import { KonsernPagination } from "@/components/konsern-pagination";

const PAGE_SIZE = 25;

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ page?: string }>;
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    VERNERUNDE: "Vernerunde",
    HMS_INSPEKSJON: "HMS-inspeksjon",
    BRANNØVELSE: "Brannøvelse",
    SHA_PLAN: "SHA-plan",
    SIKKERHETSVANDRING: "Sikkerhetsvandring",
    ANDRE: "Annet",
  };
  return labels[type] ?? type;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PLANNED: "Planlagt",
    IN_PROGRESS: "Pågår",
    COMPLETED: "Fullført",
    CANCELLED: "Kansellert",
  };
  return labels[status] ?? status;
}

function statusColor(status: string): string {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "IN_PROGRESS") return "bg-blue-50 text-blue-700";
  if (status === "PLANNED") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-500";
}

export default async function TenantInspectionsPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { inspections, total } = await getGroupTenantInspections(tenantId, { limit: PAGE_SIZE, offset });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Vernerunder og inspeksjoner</h2>
        <span className="text-sm text-gray-500">{total} totalt</span>
      </div>

      {inspections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen vernerunder registrert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {inspections.map((insp) => (
            <Card key={insp.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{insp.title}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">{typeLabel(insp.type)}</span>
                    <span>Planlagt: {insp.scheduledDate.toLocaleDateString("nb-NO")}</span>
                    {insp.completedDate && (
                      <>
                        <span>·</span>
                        <span>Fullført: {insp.completedDate.toLocaleDateString("nb-NO")}</span>
                      </>
                    )}
                    {insp.location && (
                      <>
                        <span>·</span>
                        <span>{insp.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 ml-3 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(insp.status)}`}>
                  {statusLabel(insp.status)}
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
        basePath={`/konsern/bedrifter/${tenantId}/vernerunder`}
      />
    </div>
  );
}
