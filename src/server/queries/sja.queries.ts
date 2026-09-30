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
  const { tenantId, userId, permissions } = auth;
  if (!permissions.canReadSja && !permissions.canReadOwnSja) return null;
  const ownerFilter = permissions.canReadSja
    ? {}
    : {
        OR: [
          { createdById: userId },
          { participantRecords: { some: { userId } } },
        ],
      };

  const [analysis, tenant] = await Promise.all([
    prisma.sjaAnalysis.findFirst({
      where: { id, tenantId, ...ownerFilter },
      include: {
        hazards: {
          orderBy: { sortOrder: "asc" },
          include: {
            linkedRisk: { select: { id: true, title: true, score: true } },
          },
        },
        participantRecords: { orderBy: { createdAt: "asc" } },
        attachments: true,
        mocLinks: {
          include: {
            moc: { select: { id: true, number: true, title: true, status: true } },
          },
        },
      },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mocModuleEnabled: true },
    }),
  ]);

  if (!analysis) return null;

  return JSON.parse(JSON.stringify({
    ...analysis,
    mocModuleEnabled: tenant?.mocModuleEnabled ?? false,
    canApproveSja: permissions.canApproveSja,
  }));
}
