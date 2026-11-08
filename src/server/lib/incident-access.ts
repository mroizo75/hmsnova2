import type { IncidentType, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { membershipRoles } from "@/lib/extra-roles";
import {
  canRoleSeeIncident,
  prismaIncidentWhereForRole,
  resolveSafetyIncidentScope,
  type SafetyIncidentScope,
} from "@/lib/incident-visibility";
import { safetyRepresentativeAreaIds } from "@/features/departments/lib/department-tree";
import { leaderDepartmentIds } from "@/server/queries/department.queries";

export interface ViewerIncidentAccess {
  roles: Role[];
  isLeader: boolean;
  scope: SafetyIncidentScope;
  leaderDepartmentIds: string[];
  safetyMemberUserIds: string[];
  managedProjectIds: string[];
  where: Record<string, unknown> | null;
}

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

export async function loadViewerIncidentAccess(input: {
  role: Role;
  tenantId: string;
  userId: string;
  canReadIncidents: boolean;
  canReadOwnIncidents: boolean;
  departmentId: string | null;
}): Promise<ViewerIncidentAccess> {
  const [membership, departments, managedProjectIds] = await Promise.all([
    prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: input.userId, tenantId: input.tenantId } },
      select: { role: true, extraRoles: true, isChiefSafetyRep: true },
    }),
    prisma.department.findMany({
      where: { tenantId: input.tenantId, isActive: true },
      select: { id: true, parentId: true, safetyRepresentativeId: true },
    }),
    managedProjectIdsFor(input.tenantId, input.userId),
  ]);

  const roles = membershipRoles(membership?.role ?? input.role, membership?.extraRoles);
  if (!roles.includes(input.role)) roles.unshift(input.role);
  const isLeader = roles.includes("LEDER");
  const areaDepartmentIds = safetyRepresentativeAreaIds(departments, input.userId);
  const scope = resolveSafetyIncidentScope({
    isChiefSafetyRep: membership?.isChiefSafetyRep ?? false,
    areaDepartmentIds,
    hasSafetyRole: roles.includes("VERNEOMBUD"),
  });
  const leaderIds = isLeader
    ? await leaderDepartmentIds(input.tenantId, input.userId, input.departmentId)
    : [];
  const [departmentMembers, safetyMembers] = await Promise.all([
    leaderIds.length > 0
      ? prisma.userTenant.findMany({
          where: { tenantId: input.tenantId, departmentId: { in: leaderIds } },
          select: { userId: true },
        })
      : Promise.resolve([]),
    scope.kind === "areas"
      ? prisma.userTenant.findMany({
          where: { tenantId: input.tenantId, departmentId: { in: scope.departmentIds } },
          select: { userId: true },
        })
      : Promise.resolve([]),
  ]);

  const where = prismaIncidentWhereForRole({
    ...input,
    roles,
    safetyScope: scope,
    safetyMemberUserIds: safetyMembers.map((member) => member.userId),
    departmentIds: leaderIds,
    departmentUserIds: departmentMembers.map((member) => member.userId),
    managedProjectIds,
  });

  return {
    roles,
    isLeader,
    scope,
    leaderDepartmentIds: leaderIds,
    safetyMemberUserIds: safetyMembers.map((member) => member.userId),
    managedProjectIds,
    where,
  };
}

export async function incidentListWhere(input: {
  role: Role;
  tenantId: string;
  userId: string;
  canReadIncidents: boolean;
  canReadOwnIncidents: boolean;
  departmentId: string | null;
}): Promise<Record<string, unknown> | null> {
  const access = await loadViewerIncidentAccess(input);
  return access.where;
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
  const [access, reporter] = await Promise.all([
    loadViewerIncidentAccess(input),
    prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: input.incident.reportedBy, tenantId: input.tenantId } },
      select: { departmentId: true },
    }),
  ]);
  const managedProjectIds = access.managedProjectIds;

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
    viewerDepartmentIds: access.leaderDepartmentIds,
    incidentDepartmentId: input.incident.departmentId,
    responsibleId: input.incident.responsibleId,
    projectId: input.incident.projectId,
    managedProjectIds,
    isLeader: access.isLeader,
    safetyScope: access.scope,
  });
}
