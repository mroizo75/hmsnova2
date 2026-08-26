"use client";

import { useQuery } from "@tanstack/react-query";
import { CustomizableDashboard } from "@/features/dashboard/components/customizable-dashboard";
import { fetchDashboardData } from "@/server/queries/dashboard.queries";

type DashboardData = NonNullable<Awaited<ReturnType<typeof fetchDashboardData>>>;

interface DashboardContentProps {
  initialData: DashboardData;
}

export function DashboardContent({ initialData }: DashboardContentProps) {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboardData(),
    initialData,
  });

  if (!data) return null;

  return (
    <CustomizableDashboard
      data={{
        moduleCounts: data.moduleCounts,
        formLinkOptions: [],
        statusItems: data.statusItems,
        weeklyTrendData: data.weeklyTrendData,
        recentIncidents: data.recentIncidents,
      }}
      dashboardLocked={data.dashboardLocked}
      setupGuideProgress={data.setupGuideProgress}
      tenantId={data.tenantId}
      showTavleBanner={data.showTavleBanner}
    />
  );
}
