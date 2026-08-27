"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTransportData } from "@/server/queries/settings.queries";
import { TransportClient } from "./transport-client";

type TransportData = Awaited<ReturnType<typeof fetchTransportData>>;

interface TransportContentProps {
  initialData: TransportData;
  canEdit: boolean;
}

export function TransportContent({ initialData, canEdit }: TransportContentProps) {
  const { data } = useQuery({
    queryKey: ["transport"],
    queryFn: () => fetchTransportData(),
    initialData,
  });

  return (
    <TransportClient
      journaler={data.journaler}
      sjaforDokumenter={data.sjaforDokumenter}
      loyveRegister={data.loyveRegister}
      expiringCount={data.expiringCount}
      canEdit={canEdit}
    />
  );
}
