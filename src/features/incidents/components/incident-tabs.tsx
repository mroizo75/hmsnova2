"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncidentList } from "./incident-list";
import { getMainCategory } from "@/features/incidents/schemas/incident.schema";
import type { Incident, Measure } from "@prisma/client";

type IncidentWithRelations = Incident & {
  measures: Measure[];
  risk?: { id: string; title: string; category: string | null } | null;
};

interface IncidentTabsProps {
  incidents: IncidentWithRelations[];
}

export function IncidentTabs({ incidents }: IncidentTabsProps) {
  const [tab, setTab] = useState<"ALL" | "AVVIK" | "RUH">("ALL");

  const { avvikIncidents, ruhIncidents } = useMemo(() => {
    const avvik: IncidentWithRelations[] = [];
    const ruh: IncidentWithRelations[] = [];
    for (const incident of incidents) {
      if (getMainCategory(incident.type) === "RUH") {
        ruh.push(incident);
      } else {
        avvik.push(incident);
      }
    }
    return { avvikIncidents: avvik, ruhIncidents: ruh };
  }, [incidents]);

  const displayedIncidents =
    tab === "AVVIK"
      ? avvikIncidents
      : tab === "RUH"
        ? ruhIncidents
        : incidents;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList>
        <TabsTrigger value="ALL">
          Alle ({incidents.length})
        </TabsTrigger>
        <TabsTrigger value="AVVIK" className="gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          Avvik ({avvikIncidents.length})
        </TabsTrigger>
        <TabsTrigger value="RUH" className="gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
          RUH ({ruhIncidents.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value={tab} className="mt-4">
        <IncidentList incidents={displayedIncidents} />
      </TabsContent>
    </Tabs>
  );
}
