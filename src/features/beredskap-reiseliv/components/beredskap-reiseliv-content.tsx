"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBeredskapReiselivData } from "@/server/queries/settings.queries";
import { BeredskapReiselivClient } from "./beredskap-reiseliv-client";

type BeredskapData = Awaited<ReturnType<typeof fetchBeredskapReiselivData>>;

interface BeredskapReiselivContentProps {
  initialData: BeredskapData;
  canEdit: boolean;
  isReiseliv: boolean;
}

export function BeredskapReiselivContent({ initialData, canEdit, isReiseliv }: BeredskapReiselivContentProps) {
  const { data } = useQuery({
    queryKey: ["beredskap"],
    queryFn: () => fetchBeredskapReiselivData(),
    initialData,
  });

  return (
    <BeredskapReiselivClient
      hendelser={data.hendelser}
      evakueringsplaner={data.evakueringsplaner}
      canEdit={canEdit}
      isReiseliv={isReiseliv}
    />
  );
}
