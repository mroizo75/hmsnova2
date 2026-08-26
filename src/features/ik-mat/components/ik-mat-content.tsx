"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIkMatData } from "@/server/queries/settings.queries";
import { IkMatClient } from "./ik-mat-client";

type IkMatData = Awaited<ReturnType<typeof fetchIkMatData>>;

interface IkMatContentProps {
  initialData: IkMatData;
  canEdit: boolean;
}

export function IkMatContent({ initialData, canEdit }: IkMatContentProps) {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchIkMatData(),
    initialData,
  });

  return (
    <IkMatClient
      haccpPlans={data.haccpPlans}
      latestLogs={data.latestLogs}
      allergenItems={data.allergenItems}
      inspeksjoner={data.inspeksjoner}
      deviationCount={data.deviationCount}
      canEdit={canEdit}
    />
  );
}
