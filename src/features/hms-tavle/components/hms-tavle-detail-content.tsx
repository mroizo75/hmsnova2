"use client";

import { useQuery } from "@tanstack/react-query";
import { TavleAdminClient } from "@/features/hms-tavle/components/tavle-admin-client";
import { fetchHmsTavleDetail } from "@/server/queries/hms-tavle.queries";

type HmsTavleDetailData = NonNullable<Awaited<ReturnType<typeof fetchHmsTavleDetail>>>;

interface HmsTavleDetailContentProps {
  initialData: HmsTavleDetailData;
  tavleId: string;
  canManage: boolean;
  canReview: boolean;
  appUrl: string;
  defaultTab?: string;
}

export function HmsTavleDetailContent({
  initialData,
  tavleId,
  canManage,
  canReview,
  appUrl,
  defaultTab,
}: HmsTavleDetailContentProps) {
  const { data } = useQuery({
    queryKey: ["settings", "tavle", tavleId],
    queryFn: () => fetchHmsTavleDetail(tavleId),
    initialData,
  });

  if (!data) return null;

  return (
    <TavleAdminClient
      tavle={data.tavle}
      subscription={data.subscription}
      hmsStats={data.hmsStats}
      canManage={canManage}
      canReview={canReview}
      isAddon={data.subscription.isAddon}
      appUrl={appUrl}
      defaultTab={defaultTab}
      teamMembers={data.teamMembers}
    />
  );
}
