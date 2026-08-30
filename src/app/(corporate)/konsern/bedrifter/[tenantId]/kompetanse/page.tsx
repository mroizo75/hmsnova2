import { GraduationCap, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantTraining } from "@/server/actions/corporate-group-read.actions";
import { KonsernPagination } from "@/components/konsern-pagination";

const PAGE_SIZE = 25;

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ page?: string }>;
}

function trainingStatus(validUntil: Date | null): { label: string; color: string } {
  if (!validUntil) return { label: "Permanent", color: "bg-blue-50 text-blue-700" };
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (validUntil < now) return { label: "Utgått", color: "bg-red-50 text-red-700" };
  if (validUntil < thirtyDays) return { label: "Utløper snart", color: "bg-amber-50 text-amber-700" };
  return { label: "Gyldig", color: "bg-emerald-50 text-emerald-700" };
}

export default async function TenantTrainingPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { training, total } = await getGroupTenantTraining(tenantId, { limit: PAGE_SIZE, offset });

  const now = new Date();
  const expiredCount = training.filter((t) => t.validUntil && t.validUntil < now).length;
  const validCount = training.filter((t) => !t.validUntil || t.validUntil >= now).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Kompetanse og opplæring</h2>
        <span className="text-sm text-gray-500">{total} registreringer</span>
      </div>

      {/* Sammendrag */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Gyldige</p>
              <p className="text-xl font-bold text-gray-900">{validCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-red-50 p-2.5">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Utgåtte</p>
              <p className="text-xl font-bold text-gray-900">{expiredCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {training.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen opplæring registrert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {training.map((t) => {
            const status = trainingStatus(t.validUntil);
            return (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{t.title}</h3>
                      {t.isRequired && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          Obligatorisk
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span>{t.userName}</span>
                      <span>·</span>
                      <span>{t.provider}</span>
                      {t.completedAt && (
                        <>
                          <span>·</span>
                          <span>Fullført {t.completedAt.toLocaleDateString("nb-NO")}</span>
                        </>
                      )}
                      {t.validUntil && (
                        <>
                          <span>·</span>
                          <span>Gyldig til {t.validUntil.toLocaleDateString("nb-NO")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 ml-3 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <KonsernPagination
        currentPage={page}
        totalItems={total}
        pageSize={PAGE_SIZE}
        basePath={`/konsern/bedrifter/${tenantId}/kompetanse`}
      />
    </div>
  );
}
