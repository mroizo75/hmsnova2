"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Measure {
  id: string;
  title: string;
  status: string;
  dueAt: Date;
  completedAt: Date | null;
  category: string;
  responsible: { name: string | null };
}

interface Risk {
  id: string;
  title: string;
  likelihood: number;
  consequence: number;
  score: number;
  status: string;
  category: string;
  residualScore: number | null;
  nextReviewDate: Date | null;
  measures: Measure[];
  _count: { measures: number };
}

interface Assessment {
  id: string;
  title: string;
  assessmentYear: number;
  approvedAt: Date | null;
  reviewedAt: Date | null;
  isLockedByGroup: boolean;
  updatedAt: Date;
  risks: Risk[];
  _count: { risks: number };
}

const riskStatusLabels: Record<string, string> = {
  OPEN: "Åpen", MITIGATING: "Under reduksjon", ACCEPTED: "Akseptert", CLOSED: "Lukket",
};

const riskCategoryLabels: Record<string, string> = {
  STRATEGIC: "Strategisk", OPERATIONAL: "Operasjonell", SAFETY: "Sikkerhet", HEALTH: "Helse",
  ENVIRONMENTAL: "Miljø", LEGAL: "Juridisk", INFORMATION_SECURITY: "Informasjonssikkerhet",
  PSYCHOSOCIAL: "Psykososialt", ERGONOMIC: "Ergonomisk", ORGANISATIONAL: "Organisatorisk", PHYSICAL: "Fysisk",
};

const measureStatusLabels: Record<string, string> = {
  PENDING: "Venter", IN_PROGRESS: "Pågår", DONE: "Fullført", OVERDUE: "Forfalt",
};

const measureCategoryLabels: Record<string, string> = {
  CORRECTIVE: "Korrigerende", PREVENTIVE: "Forebyggende", IMPROVEMENT: "Forbedring", MITIGATION: "Risikored.",
};

function scoreColor(score: number): string {
  if (score >= 16) return "bg-red-600 text-white";
  if (score >= 9) return "bg-orange-500 text-white";
  if (score >= 4) return "bg-amber-400 text-gray-900";
  return "bg-green-500 text-white";
}

function riskStatusColor(status: string): string {
  if (status === "OPEN") return "text-red-600";
  if (status === "MITIGATING") return "text-amber-600";
  if (status === "ACCEPTED") return "text-blue-600";
  return "text-emerald-600";
}

function measureStatusIcon(status: string) {
  if (status === "DONE") return CheckCircle2;
  if (status === "IN_PROGRESS") return Loader2;
  if (status === "OVERDUE") return AlertCircle;
  return Circle;
}

function measureStatusColor(status: string): string {
  if (status === "DONE") return "text-emerald-600";
  if (status === "IN_PROGRESS") return "text-blue-600";
  if (status === "OVERDUE") return "text-red-600";
  return "text-gray-500";
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function RiskRow({ risk }: { risk: Risk }) {
  const [expanded, setExpanded] = useState(false);
  const overdueMeasures = risk.measures.filter((m) => m.status !== "DONE" && new Date(m.dueAt) < new Date());
  const completedMeasures = risk.measures.filter((m) => m.status === "DONE");
  const needsReview = risk.nextReviewDate && new Date(risk.nextReviewDate) < new Date();

  return (
    <div className={`rounded-lg border ${overdueMeasures.length > 0 ? "border-red-200 bg-red-50/20" : "border-gray-100 bg-white"}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50/50"
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${scoreColor(risk.score)}`}>
          {risk.score}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{risk.title}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
            <span className={riskStatusColor(risk.status)}>{riskStatusLabels[risk.status] ?? risk.status}</span>
            <span>· {riskCategoryLabels[risk.category] ?? risk.category}</span>
            <span>· {risk.likelihood}×{risk.consequence}</span>
            {risk.residualScore != null && (
              <span>· Restrisiko: {risk.residualScore}</span>
            )}
            {risk._count.measures > 0 && (
              <span className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {completedMeasures.length}/{risk._count.measures}
              </span>
            )}
            {needsReview && (
              <span className="text-amber-600 font-medium">Gjennomgang forfalt</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      {expanded && risk.measures.length > 0 && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-1.5">
          <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Tiltak ({risk.measures.length})</p>
          {risk.measures.map((m) => {
            const Icon = measureStatusIcon(m.status);
            const isLate = m.status !== "DONE" && new Date(m.dueAt) < new Date();
            return (
              <div key={m.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isLate ? "bg-red-50/50" : "bg-gray-50/50"}`}>
                <Icon className={`h-4 w-4 shrink-0 ${isLate ? "text-red-500" : measureStatusColor(m.status)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 truncate">{m.title}</p>
                  <p className="text-xs text-gray-500">
                    {m.responsible.name ?? "Ingen ansvarlig"}
                    {" · "}{measureCategoryLabels[m.category] ?? m.category}
                    {" · Frist: "}{formatDate(m.dueAt)}
                    {m.completedAt && ` · Fullført ${formatDate(m.completedAt)}`}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium ${isLate ? "text-red-600" : measureStatusColor(m.status)}`}>
                  {isLate && m.status !== "OVERDUE" ? "Forfalt" : measureStatusLabels[m.status] ?? m.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {expanded && risk.measures.length === 0 && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2">
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">Ingen tiltak definert for denne risikoen.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const [expanded, setExpanded] = useState(false);
  const highRisks = assessment.risks.filter((r) => r.score >= 9);
  const openRisks = assessment.risks.filter((r) => r.status === "OPEN" || r.status === "MITIGATING");
  const totalMeasures = assessment.risks.reduce((sum, r) => sum + r._count.measures, 0);
  const completedMeasures = assessment.risks.reduce((sum, r) => sum + r.measures.filter((m) => m.status === "DONE").length, 0);
  const overdueMeasures = assessment.risks.reduce(
    (sum, r) => sum + r.measures.filter((m) => m.status !== "DONE" && new Date(m.dueAt) < new Date()).length,
    0,
  );

  return (
    <Card className={overdueMeasures > 0 ? "border-red-200" : ""}>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50/50"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-gray-900">{assessment.title}</h3>
              {assessment.isLockedByGroup && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                  Konsern-styrt
                </span>
              )}
              {assessment.approvedAt && (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                  Godkjent
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              <span>{assessment.assessmentYear}</span>
              <span>· {assessment._count.risks} risikoer</span>
              {highRisks.length > 0 && (
                <span className="font-medium text-red-600">{highRisks.length} høy/kritisk</span>
              )}
              {totalMeasures > 0 && (
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  {completedMeasures}/{totalMeasures} tiltak
                </span>
              )}
              {overdueMeasures > 0 && (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  {overdueMeasures} forfalt
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400">Oppdatert {formatDate(assessment.updatedAt)}</span>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {expanded && assessment.risks.length > 0 && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
            {assessment.risks.map((risk) => (
              <RiskRow key={risk.id} risk={risk} />
            ))}
          </div>
        )}

        {expanded && assessment.risks.length === 0 && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            <p className="text-sm text-gray-500">Ingen risikoer registrert i denne vurderingen.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AssessmentList({ assessments }: { assessments: Assessment[] }) {
  return (
    <div className="space-y-3">
      {assessments.map((a) => (
        <AssessmentCard key={a.id} assessment={a} />
      ))}
    </div>
  );
}
