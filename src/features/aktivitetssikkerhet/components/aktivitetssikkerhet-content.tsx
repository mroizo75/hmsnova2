"use client";

import { useQuery } from "@tanstack/react-query";
import { AktivitetssikkerhetClient } from "@/features/aktivitetssikkerhet/components/aktivitetssikkerhet-client";
import { fetchAktivitetssikkerhet } from "@/server/queries/aktivitetssikkerhet.queries";

type SjekkerData = Awaited<ReturnType<typeof fetchAktivitetssikkerhet>>;

interface AktivitetssikkerhetContentProps {
  initialData: SjekkerData;
  canEdit: boolean;
}

export function AktivitetssikkerhetContent({ initialData, canEdit }: AktivitetssikkerhetContentProps) {
  const { data: sjekker } = useQuery({
    queryKey: ["aktivitetssikkerhet"],
    queryFn: () => fetchAktivitetssikkerhet(),
    initialData,
  });

  const avvikCount = sjekker.filter((s: any) => s.status === "AVVIK").length;

  return (
    <AktivitetssikkerhetClient
      sjekker={sjekker}
      avvikCount={avvikCount}
      canEdit={canEdit}
    />
  );
}
