"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSkjenkingData } from "@/server/queries/settings.queries";
import { SkjenkingClient } from "./skjenking-client";

type Data = Awaited<ReturnType<typeof fetchSkjenkingData>>;

interface Props {
  initialData: Data;
  canEdit: boolean;
}

export function SkjenkingContent({ initialData, canEdit }: Props) {
  const { data } = useQuery({
    queryKey: ["skjenking"],
    queryFn: () => fetchSkjenkingData(),
    initialData,
  });

  return (
    <SkjenkingClient
      bevilling={data.bevilling}
      hendelser={data.hendelser}
      alcoholTraining={data.alcoholTraining ?? { courseKey: "hospitality_alcohol_service", title: "Ansvarlig alkoholservering", users: [] }}
      canEdit={canEdit}
    />
  );
}
