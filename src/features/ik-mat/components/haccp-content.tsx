"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHaccpData } from "@/server/queries/settings.queries";
import { HaccpBuilderClient } from "./haccp-builder-client";

type HaccpData = Awaited<ReturnType<typeof fetchHaccpData>>;

interface HaccpContentProps {
  initialData: HaccpData;
  canEdit: boolean;
}

export function HaccpContent({ initialData, canEdit }: HaccpContentProps) {
  const { data } = useQuery({
    queryKey: ["ik-mat", "haccp"],
    queryFn: () => fetchHaccpData(),
    initialData,
  });

  return (
    <HaccpBuilderClient
      planer={data}
      canEdit={canEdit}
    />
  );
}
