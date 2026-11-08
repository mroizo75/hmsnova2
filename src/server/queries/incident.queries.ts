"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { incidentPassesSafetyQualityFilter } from "@/lib/incident-visibility";
import { loadViewerIncidentAccess } from "@/server/lib/incident-access";
import type { IncidentType } from "@prisma/client";

export async function fetchIncidents(options?: { kilde?: string }) {
  const auth = await getAuthContext();
  if (!auth) return [];
  const { permissions, tenantId, userId, role, departmentId } = auth;

  const access = await loadViewerIncidentAccess({
    role,
    tenantId,
    userId,
    canReadIncidents: permissions.canReadIncidents,
    canReadOwnIncidents: permissions.canReadOwnIncidents,
    departmentId,
  });
  const where = access.where;

  if (!where) return [];

  const sourceFilter = options?.kilde === "ik-mat" ? { projectReference: "IK-MAT" } : {};

  const incidents = await prisma.incident.findMany({
    where: { ...(where as object), ...sourceFilter },
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

  const filtered = incidents.filter((incident) =>
    incidentPassesSafetyQualityFilter({
      scope: access.scope,
      leaderDepartmentIds: access.leaderDepartmentIds,
      viewerId: userId,
      reportedBy: incident.reportedBy,
      type: incident.type as IncidentType,
      subcategoryKeys: incident.subcategoryKeys,
      incidentDepartmentId: incident.departmentId,
    }),
  );

  return JSON.parse(JSON.stringify(filtered));
}
