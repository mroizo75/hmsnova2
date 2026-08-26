"use client";

import { useQuery } from "@tanstack/react-query";
import { HandbokViewer } from "@/features/hms-handbok/components/handbok-viewer";
import { HandbokVersionHistory } from "@/features/hms-handbok/components/handbok-version-history";
import { fetchHmsHandbok } from "@/server/queries/hms-handbok.queries";

type HandbokData = NonNullable<Awaited<ReturnType<typeof fetchHmsHandbok>>>;

interface HmsHandbokContentProps {
  initialData: HandbokData;
}

export function HmsHandbokContent({ initialData }: HmsHandbokContentProps) {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchHmsHandbok(),
    initialData,
  });

  if (!data) return null;

  return (
    <>
      <HandbokViewer
        tenantId={data.tenantId}
        tenantName={data.tenantName}
        orgNumber={data.orgNumber}
        industry={data.industry}
        hmsContactName={data.hmsContactName}
        hmsContactPhone={data.hmsContactPhone}
        handbook={data.handbook}
        stats={data.stats}
        currentUserId={data.currentUserId}
        canManage={data.canManage}
        canApprove={data.canApprove}
        isEmployee={data.isEmployee}
        suggestions={data.suggestions}
      />

      {data.canManage && data.versionHistory.length > 0 && (
        <HandbokVersionHistory versions={data.versionHistory} />
      )}
    </>
  );
}
