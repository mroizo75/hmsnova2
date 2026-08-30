import { CalendarCheck, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupTenantAnnualPlan } from "@/server/actions/corporate-group-read.actions";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

const DEFAULT_STEPS: Record<string, { label: string; month: number }> = {
  management_review: { label: "Ledelsens gjennomgang", month: 1 },
  risk_assessment: { label: "Risikovurdering", month: 2 },
  emergency_drill: { label: "Beredskapsøvelse", month: 3 },
  employee_survey: { label: "Medarbeiderundersøkelse", month: 4 },
  training_plan: { label: "Opplæringsplan", month: 5 },
  inspection_round: { label: "Vernerunde", month: 6 },
  routine_review: { label: "Rutinegjennomgang", month: 7 },
  chemical_review: { label: "Stoffkartotek-gjennomgang", month: 8 },
  incident_analysis: { label: "Hendelsesanalyse", month: 9 },
  document_review: { label: "Dokumentgjennomgang", month: 10 },
  goal_review: { label: "Målgjennomgang", month: 11 },
  annual_report: { label: "HMS-årsrapport", month: 12 },
};

export default async function TenantAnnualPlanPage({ params }: PageProps) {
  const { tenantId } = await params;
  const data = await getGroupTenantAnnualPlan(tenantId);

  const completedKeys = new Set(data.completions.map((c) => c.stepKey));
  const completionMap = new Map(data.completions.map((c) => [c.stepKey, c]));

  const steps = Object.entries(DEFAULT_STEPS);
  const completedCount = steps.filter(([key]) => completedKeys.has(key)).length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">HMS Årshjul {data.year}</h2>
        {!data.enabled && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">Deaktivert</span>
        )}
      </div>

      {/* Fremdriftsindikator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Fremdrift</span>
            <span className="text-sm font-bold text-gray-900">{completedCount}/{steps.length} ({progress}%)</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steg-liste */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-4 w-4" />
            Aktiviteter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {steps.map(([key, step]) => {
              const completed = completedKeys.has(key);
              const detail = completionMap.get(key);
              const monthName = new Date(data.year, step.month - 1).toLocaleDateString("nb-NO", { month: "long" });

              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-lg p-3 ${completed ? "bg-emerald-50/50" : "bg-gray-50/50"}`}
                >
                  {completed ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-gray-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${completed ? "text-emerald-800" : "text-gray-700"}`}>
                        {step.label}
                      </p>
                      <span className="text-xs text-gray-400 capitalize">{monthName}</span>
                    </div>
                    {detail && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Fullført {detail.completedAt.toLocaleDateString("nb-NO")}
                        {detail.completedBy?.name && ` av ${detail.completedBy.name}`}
                        {detail.note && ` — ${detail.note}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
