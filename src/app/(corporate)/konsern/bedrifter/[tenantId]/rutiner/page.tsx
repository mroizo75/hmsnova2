import { FileText, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantRoutines } from "@/server/actions/corporate-group-read.actions";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Aktiv",
    DRAFT: "Utkast",
    NEEDS_REVIEW: "Trenger gjennomgang",
    ARCHIVED: "Arkivert",
  };
  return labels[status] ?? status;
}

function statusColor(status: string): string {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "NEEDS_REVIEW") return "bg-amber-50 text-amber-700";
  if (status === "DRAFT") return "bg-gray-100 text-gray-600";
  return "bg-gray-50 text-gray-500";
}

export default async function TenantRoutinesPage({ params }: PageProps) {
  const { tenantId } = await params;
  const routines = await getGroupTenantRoutines(tenantId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Rutiner</h2>
        <span className="text-sm text-gray-500">{routines.length} totalt</span>
      </div>

      {routines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen rutiner registrert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {routines.map((routine) => (
            <Card key={routine.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{routine.title}</h3>
                    {routine.isLockedByGroup && (
                      <span className="flex shrink-0 items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        <Lock className="h-2.5 w-2.5" />
                        Konsern-styrt
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    {routine.category && <span>{routine.category}</span>}
                    {routine.legalReference && (
                      <>
                        <span>·</span>
                        <span className="text-blue-600">{routine.legalReference}</span>
                      </>
                    )}
                    {routine.nextReviewAt && (
                      <>
                        <span>·</span>
                        <span>Neste gjennomgang: {routine.nextReviewAt.toLocaleDateString("nb-NO")}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 ml-3 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(routine.status)}`}>
                  {statusLabel(routine.status)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
