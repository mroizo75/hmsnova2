import type { IncidentType, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  canRoleSeeIncident,
  prismaIncidentWhereForRole,
} from "@/lib/incident-visibility";
import { leaderDepartmentIds } from "@/server/queries/department.queries";

export async function opensIncidentOverview(input: {
  role: Role | null | undefined;
  extraRoles?: readonly Role[] | null;
  tenantId: string | null | undefined;
  userId: string;
}): Promise<boolean> {
  if (input.role === "LEDER" || input.extraRoles?.includes("LEDER")) return true;
  if (!input.tenantId) return false;
  const managed = await managedProjectIdsFor(input.tenantId, input.userId);
  return managed.length > 0;
}

export async function managedProjectIdsFor(tenantId: string, userId: string): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: { tenantId, projectManagerId: userId },
    select: { id: true },
  });
  return projects.map((project) => project.id);
}

export async function incidentListWhere(input: {
  role: Role;
  tenantId: string;
  userId: string;
  canReadIncidents: boolean;
  canReadOwnIncidents: boolean;
  departmentId: string | null;
}): Promise<Record<string, unknown> | null> {
  const departmentIds =
    input.role === "LEDER"
      ? await leaderDepartmentIds(input.tenantId, input.userId, input.departmentId)
      : [];
  const [managedProjectIds, departmentMembers] = await Promise.all([
    managedProjectIdsFor(input.tenantId, input.userId),
    departmentIds.length > 0
      ? prisma.userTenant.findMany({
          where: { tenantId: input.tenantId, departmentId: { in: departmentIds } },
          select: { userId: true },
        })
      : Promise.resolve([]),
  ]);

  return prismaIncidentWhereForRole({
    ...input,
    departmentIds,
    departmentUserIds: departmentMembers.map((member) => member.userId),
    managedProjectIds,
  });
}

export async function viewerCanSeeIncident(input: {
  role: Role;
  tenantId: string;
  userId: string;
  canReadIncidents: boolean;
  canReadOwnIncidents: boolean;
  departmentId: string | null;
  incident: {
    reportedBy: string;
    type: IncidentType;
    subcategoryKeys: string | null;
    departmentId: string | null;
    responsibleId: string | null;
    projectId: string | null;
  };
}): Promise<boolean> {
  const [managedProjectIds, reporter, departmentIds] = await Promise.all([
    managedProjectIdsFor(input.tenantId, input.userId),
    prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: input.incident.reportedBy, tenantId: input.tenantId } },
      select: { departmentId: true },
    }),
    input.role === "LEDER"
      ? leaderDepartmentIds(input.tenantId, input.userId, input.departmentId)
      : Promise.resolve([]),
  ]);

  return canRoleSeeIncident({
    role: input.role,
    canReadIncidents: input.canReadIncidents,
    canReadOwnIncidents: input.canReadOwnIncidents,
    viewerId: input.userId,
    reportedBy: input.incident.reportedBy,
    type: input.incident.type,
    subcategoryKeysRaw: input.incident.subcategoryKeys,
    reporterDepartmentId: reporter?.departmentId ?? null,
    viewerDepartmentId: input.departmentId,
    viewerDepartmentIds: departmentIds,
    incidentDepartmentId: input.incident.departmentId,
    responsibleId: input.incident.responsibleId,
    projectId: input.incident.projectId,
    managedProjectIds,
  });
}
