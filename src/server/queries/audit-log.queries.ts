"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchAuditLogs() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const logs = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const serialized = logs.map((log) => {
    const user = userMap.get(log.userId);
    return {
      id: log.id,
      userId: log.userId,
      userName: user?.name ?? user?.email ?? "Ukjent bruker",
      action: log.action,
      resource: log.resource,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    };
  });

  const actions = [...new Set(serialized.map((l) => l.action))].sort();

  return JSON.parse(JSON.stringify({ logs: serialized, actions }));
}
