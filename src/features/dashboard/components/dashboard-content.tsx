"use client";

import { CustomizableDashboard } from "@/features/dashboard/components/customizable-dashboard";
import { fetchDashboardData } from "@/server/queries/dashboard.queries";
import { useServerQuery } from "@/hooks/use-server-query";

type DashboardData = NonNullable<Awaited<ReturnType<typeof fetchDashboardData>>>;

interface DashboardContentProps {
  initialData: DashboardData;
}

export function DashboardContent({ initialData }: DashboardContentProps) {
  const { data } = useServerQuery({
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
        visibleNavItems: data.visibleNavItems,
        pendingApprovals: data.pendingApprovals ?? [],
        currentUserId: data.currentUserId ?? "",
        canApproveDocuments: Boolean(data.canApproveDocuments),
      }}
      dashboardLocked={data.dashboardLocked}
      setupGuideProgress={data.setupGuideProgress}
      tenantId={data.tenantId}
      showTavleBanner={data.showTavleBanner}
    />
  );
}
