"use client";

import { useQuery } from "@tanstack/react-query";
import { CompetenceMatrix } from "@/features/training/components/competence-matrix";
import { fetchTrainingMatrix } from "@/server/queries/training.queries";

type MatrixData = Awaited<ReturnType<typeof fetchTrainingMatrix>>;

interface MatrixContentProps {
  initialData: MatrixData;
  tenantId: string;
}

export function MatrixContent({ initialData, tenantId }: MatrixContentProps) {
  const { data } = useQuery({
    queryKey: ["training", "matrix"],
    queryFn: () => fetchTrainingMatrix(),
    initialData,
  });

  return (
    <div className="print:pt-0">
      <CompetenceMatrix matrix={data.matrix} courseTemplates={data.courseTemplates} tenantId={tenantId} />
    </div>
  );
}
