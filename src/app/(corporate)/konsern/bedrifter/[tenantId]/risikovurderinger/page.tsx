import {
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantRiskAssessments } from "@/server/actions/corporate-group-read.actions";
import { KonsernPagination } from "@/components/konsern-pagination";
import { AssessmentList } from "./assessment-list";

const PAGE_SIZE = 15;

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function TenantRiskAssessmentsPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { assessments, total } = await getGroupTenantRiskAssessments(tenantId, { limit: PAGE_SIZE, offset });

  const allRisks = assessments.flatMap((a) => a.risks);
  const highRisks = allRisks.filter((r) => r.score >= 9);
  const openRisks = allRisks.filter((r) => r.status === "OPEN" || r.status === "MITIGATING");
  const allMeasures = allRisks.flatMap((r) => r.measures);
  const overdueMeasures = allMeasures.filter((m) => m.status !== "DONE" && new Date(m.dueAt) < new Date());
  const completedMeasures = allMeasures.filter((m) => m.status === "DONE");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Risikovurderinger</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Klikk en vurdering for å se risikoer og tiltak — ekspandér risiko for detaljer
          </p>
        </div>
        <span className="text-sm text-gray-500">{total} vurderinger</span>
      </div>

      {/* Oppsummering */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className={highRisks.length > 0 ? "border-red-200" : ""}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{highRisks.length}</p>
              <p className="text-xs text-gray-500">Høy/kritisk risiko</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Shield className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{openRisks.length}</p>
              <p className="text-xs text-gray-500">Åpne risikoer</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Wrench className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{completedMeasures.length}/{allMeasures.length}</p>
              <p className="text-xs text-gray-500">Tiltak fullført</p>
            </div>
          </CardContent>
        </Card>
        <Card className={overdueMeasures.length > 0 ? "border-red-200" : ""}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="rounded-lg bg-red-100 p-2">
              <Clock className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{overdueMeasures.length}</p>
              <p className="text-xs text-gray-500">Forfalte tiltak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen risikovurderinger registrert</p>
          </CardContent>
        </Card>
      ) : (
        <AssessmentList assessments={assessments} />
      )}

      <KonsernPagination
        currentPage={page}
        totalItems={total}
        pageSize={PAGE_SIZE}
        basePath={`/konsern/bedrifter/${tenantId}/risikovurderinger`}
      />
    </div>
  );
}
