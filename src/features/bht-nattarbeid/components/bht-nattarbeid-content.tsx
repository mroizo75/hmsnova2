"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBhtNattarbeidData } from "@/server/queries/settings.queries";
import { BhtNattarbeidClient } from "./bht-nattarbeid-client";

type BhtData = Awaited<ReturnType<typeof fetchBhtNattarbeidData>>;

interface BhtNattarbeidContentProps {
  initialData: BhtData;
  canEdit: boolean;
}

export function BhtNattarbeidContent({ initialData, canEdit }: BhtNattarbeidContentProps) {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchBhtNattarbeidData(),
    initialData,
  });

  return (
    <BhtNattarbeidClient
      avtaler={data.avtaler}
      vurderinger={data.vurderinger}
      bhtExpired={data.bhtExpired}
      canEdit={canEdit}
    />
  );
}
