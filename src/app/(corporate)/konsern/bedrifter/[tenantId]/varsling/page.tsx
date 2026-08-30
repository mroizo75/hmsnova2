import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantWhistleblowing } from "@/server/actions/corporate-group-read.actions";
import { KonsernPagination } from "@/components/konsern-pagination";

const PAGE_SIZE = 25;

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ page?: string }>;
}

const categoryLabels: Record<string, string> = {
  HARASSMENT: "Trakassering",
  DISCRIMINATION: "Diskriminering",
  WORK_ENVIRONMENT: "Arbeidsmiljø",
  SAFETY: "HMS/Sikkerhet",
  CORRUPTION: "Korrupsjon/Underslag",
  ETHICS: "Etikk",
  LEGAL: "Lovbrudd",
  OTHER: "Annet",
};

const statusLabels: Record<string, string> = {
  RECEIVED: "Mottatt",
  ACKNOWLEDGED: "Bekreftet",
  UNDER_INVESTIGATION: "Under etterforskning",
  ACTION_TAKEN: "Tiltak iverksatt",
  RESOLVED: "Løst",
  CLOSED: "Avsluttet",
  DISMISSED: "Avvist",
};

function statusColor(status: string): string {
  if (status === "RECEIVED" || status === "ACKNOWLEDGED") return "bg-amber-50 text-amber-700";
  if (status === "UNDER_INVESTIGATION") return "bg-blue-50 text-blue-700";
  if (status === "ACTION_TAKEN") return "bg-purple-50 text-purple-700";
  if (status === "RESOLVED" || status === "CLOSED") return "bg-emerald-50 text-emerald-700";
  return "bg-gray-50 text-gray-700";
}

function severityColor(severity: string): string {
  if (severity === "CRITICAL") return "bg-red-100 text-red-800";
  if (severity === "HIGH") return "bg-orange-50 text-orange-700";
  if (severity === "MEDIUM") return "bg-amber-50 text-amber-700";
  return "bg-gray-50 text-gray-600";
}

export default async function TenantWhistleblowingPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { cases, total } = await getGroupTenantWhistleblowing(tenantId, { limit: PAGE_SIZE, offset });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Varslingssaker</h2>
        <span className="text-sm text-gray-500">{total} totalt</span>
      </div>

      <div className="rounded-lg border bg-amber-50/50 p-3">
        <p className="text-xs text-amber-800">
          <strong>GDPR / Varslerloven:</strong> Konsernet ser kun saksstatus, kategori og alvorlighetsgrad.
          Innhold, varsleridentitet og etterforsknignsnotater er ikke tilgjengelige.
        </p>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen varslingssaker registrert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{c.caseNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityColor(c.severity)}`}>
                      {c.severity}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>{categoryLabels[c.category] ?? c.category}</span>
                    <span>·</span>
                    <span>{c.receivedAt.toLocaleDateString("nb-NO")}</span>
                    {c.isAnonymous && <span className="text-amber-600">· Anonym</span>}
                    {c.closedAt && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-600">Avsluttet {c.closedAt.toLocaleDateString("nb-NO")}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 ml-3 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(c.status)}`}>
                  {statusLabels[c.status] ?? c.status}
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
        basePath={`/konsern/bedrifter/${tenantId}/varsling`}
      />
    </div>
  );
}
