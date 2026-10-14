"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Wine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkjenkingStatus } from "./skjenking-status";
import { SkjenkingBevillingForm } from "./skjenking-bevilling";
import { SkjenkingRutiner } from "./skjenking-rutiner";
import { SkjenkingHendelser } from "./skjenking-hendelser";
import { SkjenkingKompetanse } from "./skjenking-kompetanse";
import { SkjenkingGjennomgang } from "./skjenking-gjennomgang";
import { SkjenkingKontroll } from "./skjenking-kontroll";
import type {
  AlcoholTrainingStatus,
  SkjenkeBevillingView,
  SkjenkeGjennomgangView,
  SkjenkeHendelseView,
  SkjenkeRutineView,
} from "./skjenking-types";

interface Props {
  bevilling: SkjenkeBevillingView | null;
  hendelser: SkjenkeHendelseView[];
  rutiner: SkjenkeRutineView[];
  gjennomganger: SkjenkeGjennomgangView[];
  alcoholTraining: AlcoholTrainingStatus;
  canEdit: boolean;
}

export function SkjenkingClient({
  bevilling,
  hendelser,
  rutiner,
  gjennomganger,
  alcoholTraining,
  canEdit,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("status");

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["skjenking"] });
    router.refresh();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Wine className="h-6 w-6 text-purple-600" />
          Internkontroll skjenking
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Alkoholforskriften § 8-1 til § 8-3. Dokumentasjonen skal være oppdatert og tilgjengelig når kommunen kontrollerer bevillingen.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="bevilling">Bevilling</TabsTrigger>
          <TabsTrigger value="rutiner">Rutiner</TabsTrigger>
          <TabsTrigger value="hendelser">Hendelser</TabsTrigger>
          <TabsTrigger value="kompetanse">Kompetanse</TabsTrigger>
          <TabsTrigger value="gjennomgang">Gjennomgang</TabsTrigger>
          <TabsTrigger value="kontroll">For kontroll</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          <SkjenkingStatus
            bevilling={bevilling}
            hendelser={hendelser}
            rutiner={rutiner}
            gjennomganger={gjennomganger}
            alcoholTraining={alcoholTraining}
            onOpen={setTab}
          />
        </TabsContent>
        <TabsContent value="bevilling" className="mt-4">
          <SkjenkingBevillingForm bevilling={bevilling} canEdit={canEdit} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="rutiner" className="mt-4">
          <SkjenkingRutiner bevilling={bevilling} rutiner={rutiner} canEdit={canEdit} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="hendelser" className="mt-4">
          <SkjenkingHendelser hendelser={hendelser} canEdit={canEdit} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="kompetanse" className="mt-4">
          <SkjenkingKompetanse bevilling={bevilling} alcoholTraining={alcoholTraining} />
        </TabsContent>
        <TabsContent value="gjennomgang" className="mt-4">
          <SkjenkingGjennomgang items={gjennomganger} canEdit={canEdit} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="kontroll" className="mt-4">
          <SkjenkingKontroll
            bevilling={bevilling}
            hendelser={hendelser}
            rutiner={rutiner}
            gjennomganger={gjennomganger}
            alcoholTraining={alcoholTraining}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
