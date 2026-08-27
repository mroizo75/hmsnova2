"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllergenData } from "@/server/queries/settings.queries";
import { AllergenClient } from "./allergen-client";

type AllergenData = Awaited<ReturnType<typeof fetchAllergenData>>;

interface AllergenContentProps {
  initialData: AllergenData;
  canEdit: boolean;
}

export function AllergenContent({ initialData, canEdit }: AllergenContentProps) {
  const { data } = useQuery({
    queryKey: ["ik-mat", "allergen"],
    queryFn: () => fetchAllergenData(),
    initialData,
  });

  return (
    <AllergenClient
      items={data.items}
      categories={data.categories}
      canEdit={canEdit}
    />
  );
}
