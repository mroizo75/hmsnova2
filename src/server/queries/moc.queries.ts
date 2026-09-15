"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { canRoleSeeIncident } from "@/lib/incident-visibility";
import type { IncidentType } from "@prisma/client";

function canSeeMoc(opts: {
  canReadAll: boolean;
  canReadOwn: boolean;
  userId: string;
  proposedById: string;
  affectedUserIds: string[];
}): boolean {
  if (opts.canReadAll) return true;
  if (!opts.canReadOwn) return false;
  return opts.proposedById === opts.userId || opts.affectedUserIds.includes(opts.userId);
}

export async function fetchMocList() {
  const auth = await getAuthContext();
  if (!auth) return { items: [], moduleEnabled: false };
  const { tenantId, userId, permissions } = auth;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { mocModuleEnabled: true },
  });
  if (!tenant?.mocModuleEnabled) {
    return { items: [], moduleEnabled: false };
  }

  const canReadAll = permissions.canReadMoc;
  const canReadOwn = permissions.canReadOwnMoc;
  if (!canReadAll && !canReadOwn && !permissions.canCreateMoc) {
    return { items: [], moduleEnabled: true };
  }

  const items = await prisma.managementOfChange.findMany({
    where: canReadAll
      ? { tenantId }
      : {
          tenantId,
          OR: [
            { proposedById: userId },
            { affectedUsers: { some: { userId } } },
          ],
        },
    include: {
      proposedBy: { select: { id: true, name: true } },
      responsible: { select: { id: true, name: true } },
      _count: { select: { riskLinks: true, affectedUsers: true, measures: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify({ items, moduleEnabled: true }));
}

export async function fetchMocDetail(id: string) {
  const auth = await getAuthContext();
  if (!auth) return null;
  const { tenantId, userId, permissions, role, departmentId } = auth;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { mocModuleEnabled: true },
  });
  if (!tenant?.mocModuleEnabled) return null;

  const moc = await prisma.managementOfChange.findFirst({
    where: { id, tenantId },
    include: {
      proposedBy: { select: { id: true, name: true, email: true } },
      responsible: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      verifiedBy: { select: { id: true, name: true } },
      voReviewedBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, code: true } },
      riskLinks: { include: { risk: { select: { id: true, title: true, score: true } } } },
      documentLinks: { include: { document: { select: { id: true, title: true } } } },
      routineLinks: { include: { routine: { select: { id: true, title: true } } } },
      sjaLinks: { include: { sjaAnalysis: { select: { id: true, title: true, sjaNummer: true } } } },
      incidentLinks: { include: { incident: { select: { id: true, title: true, avviksnummer: true, type: true } } } },
      environmentalAspectLinks: {
        include: { environmentalAspect: { select: { id: true, title: true, category: true } } },
      },
      affectedUsers: { include: { user: { select: { id: true, name: true, email: true } } } },
      measures: {
        include: { responsible: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!moc) return null;

  const visible = canSeeMoc({
    canReadAll: permissions.canReadMoc,
    canReadOwn: permissions.canReadOwnMoc,
    userId,
    proposedById: moc.proposedById,
    affectedUserIds: moc.affectedUsers.map((row) => row.userId),
  });
  if (!visible) return null;

  const [users, risks, documents, routines, sjaAnalyses, incidents, environmentalAspects] = await Promise.all([
    prisma.user.findMany({
      where: { tenants: { some: { tenantId } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    permissions.canReadRisks
      ? prisma.risk.findMany({
          where: { tenantId },
          select: { id: true, title: true, score: true },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    permissions.canReadDocuments
      ? prisma.document.findMany({
          where: { tenantId },
          select: { id: true, title: true },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    permissions.canReadRoutines
      ? prisma.routine.findMany({
          where: { tenantId },
          select: { id: true, title: true },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    permissions.canReadSja || permissions.canReadOwnSja
      ? prisma.sjaAnalysis.findMany({
          where: permissions.canReadSja ? { tenantId } : { tenantId, createdById: userId },
          select: { id: true, title: true, sjaNummer: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.incident.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        avviksnummer: true,
        type: true,
        reportedBy: true,
        subcategoryKeys: true,
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    permissions.canReadEnvironment
      ? prisma.environmentalAspect.findMany({
          where: { tenantId, status: { not: "CLOSED" } },
          select: { id: true, title: true, category: true },
          orderBy: { significanceScore: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const reporterIds = [...new Set(incidents.map((item) => item.reportedBy))];
  const reporters = await prisma.userTenant.findMany({
    where: { tenantId, userId: { in: reporterIds } },
    select: { userId: true, departmentId: true },
  });
  const deptByUser = new Map(reporters.map((row) => [row.userId, row.departmentId]));

  const visibleIncidents = incidents.filter((incident) =>
    canRoleSeeIncident({
      role,
      canReadIncidents: permissions.canReadIncidents,
      canReadOwnIncidents: permissions.canReadOwnIncidents,
      viewerId: userId,
      reportedBy: incident.reportedBy,
      type: incident.type as IncidentType,
      subcategoryKeysRaw: incident.subcategoryKeys,
      reporterDepartmentId: deptByUser.get(incident.reportedBy) ?? null,
      viewerDepartmentId: departmentId,
    }),
  );

  return JSON.parse(
    JSON.stringify({
      moc,
      users,
      risks,
      documents,
      routines,
      sjaAnalyses,
      incidents: visibleIncidents,
      environmentalAspects,
      permissions: {
        canApprove: permissions.canApproveMoc,
        canCreate: permissions.canCreateMoc,
        isVerneombud: role === "VERNEOMBUD",
        canInvestigate: permissions.canInvestigateIncidents,
      },
    }),
  );
}

export async function fetchMocCreateOptions() {
  const auth = await getAuthContext();
  if (!auth) return null;
  const { tenantId } = auth;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { mocModuleEnabled: true },
  });
  if (!tenant?.mocModuleEnabled) return null;

  const projects = await prisma.project.findMany({
    where: { tenantId, status: { in: ["PLANNING", "ACTIVE"] } },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return JSON.parse(JSON.stringify({ projects, moduleEnabled: true }));
}
