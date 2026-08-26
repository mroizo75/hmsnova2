"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchSjaList() {
  const auth = await getAuthContext();
  if (!auth) return { analyses: [], templates: [] };
  const { permissions, tenantId, userId } = auth;

  const canReadAll = permissions.canReadSja;
  const canReadOwn = permissions.canReadOwnSja;

  if (!canReadAll && !canReadOwn) {
    return { analyses: [], templates: [] };
  }

  const ownerFilter = canReadAll ? {} : { createdById: userId };

  const [analyses, templates] = await Promise.all([
    prisma.sjaAnalysis.findMany({
      where: { tenantId, ...ownerFilter },
      include: {
        hazards: { select: { id: true, riskLevel: true } },
      },
      orderBy: { plannedDate: "desc" },
    }),
    prisma.sjaTemplate.findMany({
      where: { tenantId, isActive: true },
      include: {
        hazards: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return JSON.parse(JSON.stringify({ analyses, templates }));
}

export async function fetchSjaDetail(id: string) {
  const auth = await getAuthContext();
  if (!auth) return null;
  const { tenantId } = auth;

  const analysis = await prisma.sjaAnalysis.findUnique({
    where: { id, tenantId },
    include: {
      hazards: {
        orderBy: { sortOrder: "asc" },
        include: {
          linkedRisk: { select: { id: true, title: true, score: true } },
        },
      },
      attachments: true,
    },
  });

  if (!analysis) return null;

  return JSON.parse(JSON.stringify(analysis));
}
