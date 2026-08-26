"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchIncidents() {
  const auth = await getAuthContext();
  const { permissions, tenantId, userId } = auth;

  const canReadAll = permissions.canReadIncidents;
  const canReadOwn = permissions.canReadOwnIncidents;

  if (!canReadAll && !canReadOwn) {
    return [];
  }

  const ownerFilter = canReadAll ? {} : { reportedBy: userId };

  const incidents = await prisma.incident.findMany({
    where: { tenantId, ...ownerFilter },
    include: {
      measures: true,
      risk: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
    },
    orderBy: { occurredAt: "desc" },
  });

  return JSON.parse(JSON.stringify(incidents));
}
