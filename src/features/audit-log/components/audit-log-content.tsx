"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/server/queries/audit-log.queries";
import { AktivitetsloggClient } from "@/app/(dashboard)/dashboard/aktivitetslogg/client";

type AuditLogData = Awaited<ReturnType<typeof fetchAuditLogs>>;

interface AuditLogContentProps {
  initialData: AuditLogData;
}

export function AuditLogContent({ initialData }: AuditLogContentProps) {
  const { data } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => fetchAuditLogs(),
    initialData,
  });

  return <AktivitetsloggClient logs={data.logs} actions={data.actions} />;
}
