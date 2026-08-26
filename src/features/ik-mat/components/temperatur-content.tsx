"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTemperaturData } from "@/server/queries/settings.queries";
import { TemperaturClient } from "./temperatur-client";

type TemperaturData = Awaited<ReturnType<typeof fetchTemperaturData>>;

interface TemperaturContentProps {
  initialData: TemperaturData;
  canEdit: boolean;
}

export function TemperaturContent({ initialData, canEdit }: TemperaturContentProps) {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchTemperaturData(),
    initialData,
  });

  return (
    <TemperaturClient
      logs={data.logs}
      units={data.units}
      canEdit={canEdit}
    />
  );
}
