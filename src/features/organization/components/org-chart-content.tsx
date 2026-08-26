"use client";

import { useQuery } from "@tanstack/react-query";
import { OrgChartTree } from "@/features/organization/components/org-chart-tree";
import { fetchOrgChartNodes } from "@/server/queries/org-chart.queries";

type OrgChartData = Awaited<ReturnType<typeof fetchOrgChartNodes>>;

interface OrgChartContentProps {
  initialData: OrgChartData;
  canManage: boolean;
}

export function OrgChartContent({ initialData, canManage }: OrgChartContentProps) {
  const { data: nodes } = useQuery({
    queryKey: ["settings", "org-chart"],
    queryFn: () => fetchOrgChartNodes(),
    initialData,
  });

  return <OrgChartTree nodes={nodes} canManage={canManage} />;
}
