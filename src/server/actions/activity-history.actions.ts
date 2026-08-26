"use server";

import { AuditLog } from "@/lib/audit-log";

export async function getResourceHistory(resourceId: string) {
  const logs = await AuditLog.getLogsForResource(resourceId);
  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    userId: log.userId,
    metadata: log.metadata ? JSON.parse(log.metadata as string) : null,
    createdAt: log.createdAt.toISOString(),
  }));
}
