"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { isQualityOnlyIncident } from "@/lib/incident-visibility";
import { incidentListWhere } from "@/server/lib/incident-access";
import type { IncidentType } from "@prisma/client";

export async function fetchIncidents(options?: { kilde?: string }) {
  const auth = await getAuthContext();
  if (!auth) return [];
  const { permissions, tenantId, userId, role, departmentId } = auth;

  const where = await incidentListWhere({
    role,
    tenantId,
    userId,
    canReadIncidents: permissions.canReadIncidents,
    canReadOwnIncidents: permissions.canReadOwnIncidents,
    departmentId,
  });

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

  const filtered =
    role === "VERNEOMBUD"
      ? incidents.filter((incident) => !isQualityOnlyIncident(incident.type as IncidentType, incident.subcategoryKeys))
      : incidents;

  return JSON.parse(JSON.stringify(filtered));
}
