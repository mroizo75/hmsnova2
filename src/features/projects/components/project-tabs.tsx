"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, HardHat, ClipboardCheck, ListTodo, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getIncidentTypeLabel, getIncidentStatusLabel } from "@/features/incidents/schemas/incident.schema";

interface Incident {
  id: string;
  avviksnummer: string | null;
  title: string;
  type: string;
  severity: number;
  status: string;
  occurredAt: Date;
}

interface SjaAnalysis {
  id: string;
  sjaNummer: string | null;
  title: string;
  status: string;
  plannedDate: Date;
  workLocation: string;
}

interface Inspection {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledDate: Date;
  location: string | null;
}

interface Measure {
  id: string;
  title: string;
  status: string;
  dueAt: Date;
  category: string;
}

interface ProjectTabsProps {
  projectId: string;
  incidents: Incident[];
  sjaAnalyses: SjaAnalysis[];
  inspections: Inspection[];
  measures: Measure[];
}

const sjaStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Utkast", color: "bg-gray-100 text-gray-700 border-gray-300" },
  SUBMITTED: { label: "Innsendt", color: "bg-blue-100 text-blue-800 border-blue-300" },
  APPROVED: { label: "Godkjent", color: "bg-green-100 text-green-800 border-green-300" },
  REJECTED: { label: "Avvist", color: "bg-red-100 text-red-800 border-red-300" },
};

const inspectionStatusMap: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Planlagt", color: "bg-blue-100 text-blue-800 border-blue-300" },
  IN_PROGRESS: { label: "Pågår", color: "bg-amber-100 text-amber-800 border-amber-300" },
  COMPLETED: { label: "Fullført", color: "bg-green-100 text-green-800 border-green-300" },
  CANCELLED: { label: "Avlyst", color: "bg-gray-100 text-gray-700 border-gray-300" },
};

const measureStatusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Venter", color: "bg-gray-100 text-gray-700 border-gray-300" },
  IN_PROGRESS: { label: "Pågår", color: "bg-blue-100 text-blue-800 border-blue-300" },
  DONE: { label: "Fullført", color: "bg-green-100 text-green-800 border-green-300" },
  CANCELLED: { label: "Kansellert", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function ProjectTabs({
  projectId,
  incidents,
  sjaAnalyses,
  inspections,
  measures,
}: ProjectTabsProps) {
  return (
    <Tabs defaultValue="incidents">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="incidents" className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          Avvik
          {incidents.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{incidents.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="sja" className="flex items-center gap-1.5">
          <HardHat className="h-3.5 w-3.5" />
          SJA
          {sjaAnalyses.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{sjaAnalyses.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="inspections" className="flex items-center gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Vernerunder
          {inspections.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{inspections.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="measures" className="flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5" />
          Tiltak
          {measures.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{measures.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Avvik ── */}
      <TabsContent value="incidents" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">Avvik og hendelser registrert på dette prosjektet</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/incidents/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Registrer avvik
            </Link>
          </Button>
        </div>
        {incidents.length === 0 ? (
          <EmptyState icon={<AlertCircle className="h-8 w-8 text-muted-foreground" />} text="Ingen avvik registrert på dette prosjektet" />
        ) : (
          <div className="divide-y rounded-lg border">
            {incidents.map((inc) => (
              <Link key={inc.id} href={`/dashboard/incidents/${inc.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {inc.avviksnummer && (
                      <span className="font-mono text-xs text-muted-foreground">{inc.avviksnummer}</span>
                    )}
                    <span className="text-sm font-medium truncate">{inc.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getIncidentTypeLabel(inc.type as any)} · {new Date(inc.occurredAt).toLocaleDateString("nb-NO")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{getIncidentStatusLabel(inc.status)}</Badge>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── SJA ── */}
      <TabsContent value="sja" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">Sikker Jobb Analyser for dette prosjektet</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/sja/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ny SJA
            </Link>
          </Button>
        </div>
        {sjaAnalyses.length === 0 ? (
          <EmptyState icon={<HardHat className="h-8 w-8 text-muted-foreground" />} text="Ingen SJA-analyser registrert på dette prosjektet" />
        ) : (
          <div className="divide-y rounded-lg border">
            {sjaAnalyses.map((sja) => {
              const sc = sjaStatusMap[sja.status] ?? { label: sja.status, color: "" };
              return (
                <Link key={sja.id} href={`/dashboard/sja/${sja.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      {sja.sjaNummer && (
                        <span className="font-mono text-xs text-muted-foreground">{sja.sjaNummer}</span>
                      )}
                      <span className="text-sm font-medium">{sja.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sja.workLocation} · {new Date(sja.plannedDate).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs border ${sc.color}`}>{sc.label}</Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* ── Vernerunder ── */}
      <TabsContent value="inspections" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">Vernerunder og inspeksjoner på prosjektstedet</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/inspections/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ny vernerunde
            </Link>
          </Button>
        </div>
        {inspections.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="h-8 w-8 text-muted-foreground" />} text="Ingen vernerunder registrert på dette prosjektet" />
        ) : (
          <div className="divide-y rounded-lg border">
            {inspections.map((insp) => {
              const sc = inspectionStatusMap[insp.status] ?? { label: insp.status, color: "" };
              return (
                <Link key={insp.id} href={`/dashboard/inspections/${insp.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{insp.title}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {insp.location ?? "—"} · {new Date(insp.scheduledDate).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs border ${sc.color}`}>{sc.label}</Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* ── Tiltak ── */}
      <TabsContent value="measures" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">Tiltak knyttet direkte til prosjektet</p>
        </div>
        {measures.length === 0 ? (
          <EmptyState icon={<ListTodo className="h-8 w-8 text-muted-foreground" />} text="Ingen tiltak registrert direkte på dette prosjektet" />
        ) : (
          <div className="divide-y rounded-lg border">
            {measures.map((m) => {
              const sc = measureStatusMap[m.status] ?? { label: m.status, color: "" };
              const overdue = m.status !== "DONE" && m.status !== "CANCELLED" && new Date(m.dueAt) < new Date();
              return (
                <Link key={m.id} href={`/dashboard/actions`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{m.title}</span>
                    <p className={`text-xs mt-0.5 ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      Frist: {new Date(m.dueAt).toLocaleDateString("nb-NO")}
                      {overdue && " — forfalt"}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs border ${sc.color}`}>{sc.label}</Badge>
                </Link>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
      <div className="mb-2 opacity-40">{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
