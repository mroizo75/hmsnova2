"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { MeasureEditForm } from "@/features/measures/components/measure-edit-form";
import { getMeasureStatusLabel, getMeasureStatusColor } from "@/features/measures/schemas/measure.schema";
import { fetchMeasureDetail } from "@/server/queries/measure-detail.queries";

type MeasureData = NonNullable<Awaited<ReturnType<typeof fetchMeasureDetail>>>;

interface MeasureDetailContentProps {
  initialData: MeasureData;
  measureId: string;
}

export function MeasureDetailContent({ initialData, measureId }: MeasureDetailContentProps) {
  const { data } = useQuery({
    queryKey: ["measures", measureId],
    queryFn: () => fetchMeasureDetail(measureId),
    initialData,
  });

  if (!data) return null;

  const { measure, tenantUsers } = data;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{measure.title}</h1>
        <Badge className={getMeasureStatusColor(measure.status)}>
          {getMeasureStatusLabel(measure.status)}
        </Badge>
      </div>
      {measure.risk && (
        <p className="text-muted-foreground mt-1">
          Knyttet til risiko: {measure.risk.title}
        </p>
      )}

      <MeasureEditForm measure={measure} users={tenantUsers} />
    </>
  );
}
