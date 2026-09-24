"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  MessageSquare,
  Wrench,
  Search,
  AlertCircle,
  ShieldAlert,
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

interface Comment {
  id: string;
  body: string;
  kind: string;
  createdAt: Date;
  author: { name: string | null };
}

interface Incident {
  id: string;
  avviksnummer: string | null;
  title: string;
  description: string;
  type: string;
  status: string;
  stage: string;
  severity: number | null;
  occurredAt: Date;
  location: string | null;
  rootCause: string | null;
  immediateAction: string | null;
  lessonsLearned: string | null;
  closedAt: Date | null;
  createdAt: Date;
  reportedToAuthorityAt: Date | null;
  measures: Measure[];
  comments: Comment[];
  _count: { measures: number; comments: number };
}

const typeLabels: Record<string, string> = {
  AVVIK: "Avvik", NESTEN: "Nestenulykke", ULYKKE: "Ulykke",
  FARLIG_SITUASJON: "Farlig situasjon", YRKESSYKDOM: "Yrkessykdom",
  MILJO: "Miljøavvik", KVALITET: "Kvalitetsavvik", CUSTOMER: "Kundeklage", HMS: "HMS",
};

const statusLabels: Record<string, string> = {
  OPEN: "Åpen", INVESTIGATING: "Under behandling", ACTION_TAKEN: "Tiltak iverksatt", CLOSED: "Lukket",
};

const stageLabels: Record<string, string> = {
  REPORTED: "Rapportert", UNDER_REVIEW: "Under vurdering", ROOT_CAUSE: "Årsaksanalyse",
  ACTIONS_DEFINED: "Tiltak definert", ACTIONS_COMPLETE: "Tiltak fullført", VERIFIED: "Verifisert",
};

const measureStatusLabels: Record<string, string> = {
  PENDING: "Venter", IN_PROGRESS: "Pågår", DONE: "Fullført", OVERDUE: "Forfalt",
};

const measureCategoryLabels: Record<string, string> = {
  CORRECTIVE: "Korrigerende", PREVENTIVE: "Forebyggende", IMPROVEMENT: "Forbedring", MITIGATION: "Risikored.",
};

function statusColor(status: string): string {
  if (status === "OPEN") return "bg-red-50 text-red-700 border-red-200";
  if (status === "INVESTIGATING") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "ACTION_TAKEN") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function typeColor(type: string): string {
  if (type === "ULYKKE" || type === "YRKESSYKDOM") return "bg-red-50 text-red-700";
  if (type === "NESTEN" || type === "FARLIG_SITUASJON") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

function measureStatusColor(status: string): string {
  if (status === "DONE") return "text-emerald-600";
  if (status === "IN_PROGRESS") return "text-blue-600";
  if (status === "OVERDUE") return "text-red-600";
  return "text-gray-500";
}

function measureStatusIcon(status: string) {
  if (status === "DONE") return CheckCircle2;
  if (status === "IN_PROGRESS") return Loader2;
  if (status === "OVERDUE") return AlertCircle;
  return Circle;
}

function severityLabel(severity: number | null): string {
  if (!severity) return "Ikke vurdert";
  const labels = ["", "Lav", "Moderat", "Middels", "Høy", "Kritisk"];
  return labels[severity] ?? `${severity}`;
}

function severityColor(severity: number | null): string {
  if (!severity) return "bg-gray-100 text-gray-500";
  if (severity >= 4) return "bg-red-100 text-red-700";
  if (severity >= 3) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

function daysAgo(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function IncidentRow({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = useState(false);

  const days = daysAgo(incident.occurredAt);
  const isOverdue = incident.status === "OPEN" && days > 30;
  const overdueMeasures = incident.measures.filter((m) => m.status === "OVERDUE" || (m.status === "PENDING" && new Date(m.dueAt) < new Date()));
  const completedMeasures = incident.measures.filter((m) => m.status === "DONE");

  return (
    <Card className={isOverdue ? "border-red-200 bg-red-50/30" : ""}>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50/50"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {incident.avviksnummer && (
                <span className="text-xs font-mono text-gray-400">#{incident.avviksnummer}</span>
              )}
              <h3 className="text-sm font-medium text-gray-900">{incident.title}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor(incident.type)}`}>
                {typeLabels[incident.type] ?? incident.type}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityColor(incident.severity)}`}>
                {severityLabel(incident.severity)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              <span>{formatDate(incident.occurredAt)}</span>
              {incident.location && <span>· {incident.location}</span>}
              <span>· {stageLabels[incident.stage] ?? incident.stage}</span>
              {incident._count.measures > 0 && (
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  {completedMeasures.length}/{incident._count.measures} tiltak
                </span>
              )}
              {incident._count.comments > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {incident._count.comments}
                </span>
              )}
              {isOverdue && (
                <span className="flex items-center gap-1 font-medium text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {days} dager ubehandlet
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusColor(incident.status)}`}>
              {statusLabels[incident.status] ?? incident.status}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
            {/* Beskrivelse */}
            {incident.description && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Beskrivelse</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{incident.description}</p>
              </div>
            )}

            {/* Umiddelbare tiltak + Årsaksanalyse */}
            <div className="grid gap-4 sm:grid-cols-2">
              {incident.immediateAction && (
                <div className="rounded-lg bg-blue-50/50 p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Umiddelbare tiltak</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{incident.immediateAction}</p>
                </div>
              )}
              {incident.rootCause && (
                <div className="rounded-lg bg-purple-50/50 p-3">
                  <p className="text-xs font-semibold text-purple-700 mb-1">Årsaksanalyse</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{incident.rootCause}</p>
                </div>
              )}
            </div>

            {!incident.immediateAction && !incident.rootCause && incident.status !== "CLOSED" && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
                  Ingen umiddelbare tiltak eller årsaksanalyse registrert.
                  {incident.status === "OPEN" && " Hendelsen er fortsatt ubehandlet."}
                </p>
              </div>
            )}

            {/* Tiltak */}
            {incident.measures.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Tiltak ({incident.measures.length})</p>
                <div className="space-y-1.5">
                  {incident.measures.map((m) => {
                    const Icon = measureStatusIcon(m.status);
                    const isLate = m.status !== "DONE" && new Date(m.dueAt) < new Date();
                    return (
                      <div key={m.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isLate ? "bg-red-50/50" : "bg-gray-50/50"}`}>
                        <Icon className={`h-4 w-4 shrink-0 ${isLate ? "text-red-500" : measureStatusColor(m.status)}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-900 truncate">{m.title}</p>
                          <p className="text-xs text-gray-500">
                            {m.responsible.name ?? "Ingen ansvarlig"}
                            {" · "}
                            <span className={`${measureCategoryLabels[m.category] ? "" : ""}`}>{measureCategoryLabels[m.category] ?? m.category}</span>
                            {" · Frist: "}
                            {formatDate(m.dueAt)}
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
              </div>
            )}

            {incident.measures.length === 0 && incident.status !== "CLOSED" && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-xs text-red-800">Ingen tiltak er definert for denne hendelsen.</p>
              </div>
            )}

            {/* Siste kommentarer */}
            {incident.comments.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-2">
                  Siste kommentarer ({incident._count.comments})
                </p>
                <div className="space-y-2">
                  {incident.comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-gray-50 px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">{c.author.name ?? "Ukjent"}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(c.createdAt)}</span>
                        {c.kind === "TREATMENT" && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">Behandling</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-3">{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Læringspunkter */}
            {incident.lessonsLearned && (
              <div className="rounded-lg bg-emerald-50/50 p-3">
                <p className="text-xs font-semibold text-emerald-700 mb-1">Læringspunkter</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{incident.lessonsLearned}</p>
              </div>
            )}

            {/* Varslet myndigheter */}
            {incident.reportedToAuthorityAt && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldAlert className="h-3 w-3" />
                Varslet til myndigheter {formatDate(incident.reportedToAuthorityAt)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="space-y-2">
      {incidents.map((inc) => (
        <IncidentRow key={inc.id} incident={inc} />
      ))}
    </div>
  );
}
