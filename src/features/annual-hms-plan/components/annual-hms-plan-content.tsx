"use client";

import { useQuery } from "@tanstack/react-query";
import { AnnualPlanChecklist } from "@/features/annual-hms-plan/components/annual-plan-checklist";
import { fetchAnnualHmsPlan } from "@/server/queries/annual-hms-plan.queries";

type AnnualPlanData = NonNullable<Awaited<ReturnType<typeof fetchAnnualHmsPlan>>>;

interface AnnualHmsPlanContentProps {
  initialData: AnnualPlanData;
  tenantId: string;
  userId: string | null;
  canEdit: boolean;
}

export function AnnualHmsPlanContent({ initialData, tenantId, userId, canEdit }: AnnualHmsPlanContentProps) {
  const { data } = useQuery({
    queryKey: ["goals"],
    queryFn: () => fetchAnnualHmsPlan(),
    initialData,
  });

  if (!data) return null;

  return (
    <AnnualPlanChecklist
      initialData={data}
      tenantId={tenantId}
      userId={userId}
      canEdit={canEdit}
    />
  );
}
