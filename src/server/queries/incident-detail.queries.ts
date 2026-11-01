"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";
import { getAuthContext } from "@/lib/server-authorization";
import { viewerCanSeeIncident } from "@/server/lib/incident-access";
import type { IncidentType } from "@prisma/client";

export async function fetchIncidentDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;
  const auth = await getAuthContext();

  const rawIncident = await prisma.incident.findUnique({
    where: { id, tenantId },
    include: {
      measures: {
        orderBy: { createdAt: "desc" },
        include: {
          responsible: {
            select: {
              name: true,
              email: true,
            },
          },
          moc: { select: { id: true, number: true, title: true } },
        },
      },
      attachments: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
      mocLinks: {
        include: {
          moc: { select: { id: true, number: true, title: true, status: true } },
        },
      },
      risk: {
        select: {
          id: true,
          title: true,
          category: true,
          score: true,
        },
      },
      equipmentApproval: {
        select: { id: true, name: true, supplierName: true },
      },
      checklistAnswers: {
        take: 1,
        select: {
          run: {
            select: {
              id: true,
              reference: true,
              checklistId: true,
              checklist: { select: { title: true } },
            },
          },
        },
      },
      department: {
        select: { id: true, name: true },
      },
    },
  });

  if (!rawIncident) {
    return null;
  }

  if (auth) {
    const visible = await viewerCanSeeIncident({
      role: auth.role,
      tenantId,
      userId: auth.userId,
      canReadIncidents: auth.permissions.canReadIncidents,
      canReadOwnIncidents: auth.permissions.canReadOwnIncidents,
      departmentId: auth.departmentId,
      incident: {
        reportedBy: rawIncident.reportedBy,
        type: rawIncident.type as IncidentType,
        subcategoryKeys: rawIncident.subcategoryKeys,
        departmentId: rawIncident.departmentId,
        responsibleId: rawIncident.responsibleId,
        projectId: rawIncident.projectId,
      },
    });
    if (!visible) return null;
  }

  const comments = auth?.permissions.canInvestigateIncidents
    ? rawIncident.comments
    : rawIncident.comments.filter((comment) => comment.kind === "SUBMITTER");

  const incident = { ...rawIncident, comments };

  const tenantUsers = await prisma.user.findMany({
    where: {
      tenants: {
        some: { tenantId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const tenantProjects = await prisma.project.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      ruhModuleEnabled: true,
      mocModuleEnabled: true,
      aiEnabled: true,
      name: true,
      orgNumber: true,
      address: true,
      contactPhone: true,
    },
  });

  const tenantRoutines = await prisma.routine.findMany({
    where: { tenantId, status: "ACTIVE" },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return JSON.parse(JSON.stringify({
    incident,
    tenantUsers,
    tenantProjects,
    tenant,
    tenantRoutines,
  }));
}
