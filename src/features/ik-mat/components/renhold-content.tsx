"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRenholdData } from "@/server/queries/settings.queries";
import { RenholdClient } from "./renhold-client";

type Data = Awaited<ReturnType<typeof fetchRenholdData>>;

interface Props {
  initialData: Data;
  canEdit: boolean;
}

export function RenholdContent({ initialData, canEdit }: Props) {
  const { data } = useQuery({
    queryKey: ["ik-mat", "renhold"],
    queryFn: () => fetchRenholdData(),
    initialData,
  });

  return <RenholdClient items={data.items} canEdit={canEdit} />;
}
