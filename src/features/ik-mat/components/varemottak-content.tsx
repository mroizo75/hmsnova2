"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVaremottakData } from "@/server/queries/settings.queries";
import { VaremottakClient } from "./varemottak-client";

type Data = Awaited<ReturnType<typeof fetchVaremottakData>>;

interface Props {
  initialData: Data;
  canEdit: boolean;
}

export function VaremottakContent({ initialData, canEdit }: Props) {
  const { data } = useQuery({
    queryKey: ["ik-mat", "varemottak"],
    queryFn: () => fetchVaremottakData(),
    initialData,
  });

  return <VaremottakClient items={data.items} canEdit={canEdit} />;
}
