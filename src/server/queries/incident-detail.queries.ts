"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export async function fetchIncidentDetail(id: string) {
  const { tenantId } = await getRequiredTenantContext();

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
        },
      },
      attachments: true,
      risk: {
        select: {
          id: true,
          title: true,
          category: true,
          score: true,
        },
      },
    },
  });

  if (!rawIncident) {
    return null;
  }

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
    incident: rawIncident,
    tenantUsers,
    tenantProjects,
    tenant,
    tenantRoutines,
  }));
}
