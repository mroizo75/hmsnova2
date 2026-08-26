"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchHmsTavleList() {
  const auth = await getAuthContext();
  if (!auth || !auth.permissions.canViewHmsTavle) return null;

  const [tavler, subscription, tenant] = await Promise.all([
    prisma.hmsTavle.findMany({
      where: { tenantId: auth.tenantId },
      include: {
        sections: { select: { id: true, type: true, isVisible: true } },
        subcontractorPortal: { select: { id: true, portalToken: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { checkins: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.hmsTavleSubscription.findUnique({ where: { tenantId: auth.tenantId } }),
    prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { isTavleOnly: true, name: true } }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todayCheckins = await prisma.tavleCheckin.count({
    where: {
      tavle: { tenantId: auth.tenantId },
      date: today,
    },
  });

  return JSON.parse(JSON.stringify({ tavler, subscription, tenant, todayCheckins }));
}

export async function fetchHmsTavleDetail(id: string) {
  const auth = await getAuthContext();
  if (!auth || !auth.permissions.canViewHmsTavle) return null;

  const [tavle, subscription] = await Promise.all([
    prisma.hmsTavle.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: {
        sections: { orderBy: { order: "asc" } },
        externalLinks: { orderBy: { order: "asc" } },
        subcontractorPortal: {
          include: {
            submissions: {
              orderBy: { createdAt: "desc" },
              take: 50,
            },
          },
        },
        project: {
          include: {
            constructionShaPlan: {
              select: { id: true, status: true, updatedAt: true, availableOnSite: true },
            },
            constructionPreNotification: {
              select: { id: true, status: true, sentAt: true },
            },
            constructionRosterEntries: {
              orderBy: { createdAt: "desc" },
              take: 100,
            },
          },
        },
        checkins: {
          where: { date: new Date().toISOString().slice(0, 10) },
          orderBy: { checkedInAt: "asc" },
        },
        guestSubmissions: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    }),
    prisma.hmsTavleSubscription.findUnique({ where: { tenantId: auth.tenantId } }),
  ]);

  if (!tavle || !subscription) return null;

  const tenantInfo = await prisma.tenant.findUnique({
    where: { id: auth.tenantId },
    select: { isTavleOnly: true },
  });

  let hmsStats = null;
  if (!tenantInfo?.isTavleOnly && tavle.projectId) {
    const [openIncidents, openActions] = await Promise.all([
      prisma.incident.count({
        where: {
          tenantId: auth.tenantId,
          projectId: tavle.projectId,
          status: { not: "CLOSED" },
        },
      }),
      prisma.measure.count({
        where: {
          tenantId: auth.tenantId,
          status: { not: "DONE" },
        },
      }),
    ]);
    hmsStats = { openIncidents, openActions };
  }

  const medlemmer = await prisma.userTenant.findMany({
    where: { tenantId: auth.tenantId, role: { in: ["ADMIN", "HMS", "LEDER", "VERNEOMBUD"] } },
    select: { userId: true, user: { select: { name: true, email: true } } },
    orderBy: { role: "asc" },
  });

  const teamMembers = medlemmer.map((medlem) => ({
    id: medlem.userId,
    name: medlem.user.name ?? medlem.user.email ?? "Ukjent bruker",
  }));

  return JSON.parse(JSON.stringify({ tavle, subscription, hmsStats, teamMembers }));
}
