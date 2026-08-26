import { Shield, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantRiskAssessments } from "@/server/actions/corporate-group-read.actions";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantRiskAssessmentsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const assessments = await getGroupTenantRiskAssessments(tenantId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Risikovurderinger</h2>
        <span className="text-sm text-gray-500">{assessments.length} totalt</span>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen risikovurderinger registrert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assessments.map((ra) => (
            <Card key={ra.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{ra.title}</h3>
                    {ra.isLockedByGroup && (
                      <span className="flex shrink-0 items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        <Lock className="h-2.5 w-2.5" />
                        Konsern-styrt
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>{ra.assessmentYear}</span>
                    <span>·</span>
                    <span>{ra._count.risks} risikoer</span>
                    {ra.approvedAt && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-600">Godkjent {ra.approvedAt.toLocaleDateString("nb-NO")}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="shrink-0 ml-3 text-xs text-gray-400">
                  Oppdatert {ra.updatedAt.toLocaleDateString("nb-NO")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
