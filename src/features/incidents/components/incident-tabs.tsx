"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncidentList } from "./incident-list";
import type { Incident, Measure } from "@prisma/client";

type IncidentWithRelations = Incident & {
  measures: Measure[];
  risk?: { id: string; title: string; category: string | null } | null;
};

interface IncidentTabsProps {
  incidents: IncidentWithRelations[];
}

export function IncidentTabs({ incidents }: IncidentTabsProps) {
  const [tab, setTab] = useState<"ALL" | "INTERNAL" | "EXTERNAL">("ALL");

  const internalCount = incidents.filter((i) => (i.source ?? "INTERNAL") === "INTERNAL").length;
  const externalCount = incidents.filter((i) => (i.source ?? "INTERNAL") === "EXTERNAL").length;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList>
        <TabsTrigger value="ALL">
          Alle ({incidents.length})
        </TabsTrigger>
        <TabsTrigger value="INTERNAL">
          Interne ({internalCount})
        </TabsTrigger>
        <TabsTrigger value="EXTERNAL">
          Eksterne ({externalCount})
        </TabsTrigger>
      </TabsList>
      <TabsContent value={tab} className="mt-4">
        <IncidentList incidents={incidents} sourceFilter={tab} />
      </TabsContent>
    </Tabs>
  );
}
