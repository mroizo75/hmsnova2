"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";
import { getAuthContext } from "@/lib/server-authorization";
import { getInvitableRoles, getPermissions } from "@/lib/permissions";
import { getTrainingStatus } from "@/features/training/schemas/training.schema";
import { isLeaderScopedRole, managedEmployeeFilter } from "@/features/personnel/lib/leader-scope";
import { canViewEmployee } from "@/server/lib/leader-employees";
import type { Role } from "@prisma/client";

export async function fetchUsers() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId, userId } = ctx;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenants: {
        include: { tenant: true },
        where: { tenantId },
        take: 1,
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return null;
  }

  const selectedMembership = user.tenants[0];
  const tenant = selectedMembership.tenant;
  const isAdmin = selectedMembership.role === "ADMIN";
  const permissions = getPermissions(selectedMembership.role as Role, selectedMembership.extraRoles);

  const [tenantUsers, departments] = await Promise.all([
    prisma.userTenant.findMany({
      where: {
        tenantId,
        ...(isLeaderScopedRole(selectedMembership.role) ? managedEmployeeFilter(userId) : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const usersWithEmployeeNumber = tenantUsers.map((ut) => ({
    ...ut,
    employeeNumber: ut.employeeNumber ?? null,
    position: ut.position ?? null,
    managerId: ut.managerId ?? null,
    departmentId: ut.departmentId ?? null,
    extraRoles: ut.extraRoles ?? null,
  }));

  const { getSubscriptionLimits } = await import("@/lib/subscription");
  const limits = getSubscriptionLimits(tenant.pricingTier as any);

  return JSON.parse(JSON.stringify({
    users: usersWithEmployeeNumber,
    currentUserId: user.id,
    isAdmin,
    canManagePeople: permissions.canManageUsers,
    invitableRoles: getInvitableRoles(selectedMembership.role),
    departments,
    pricingTier: tenant.pricingTier,
    maxUsers: limits.maxUsers,
  }));
}

export async function fetchEmployeeOrgOptions() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canManageUsers) {
    return { departments: [] as { id: string; name: string }[], managers: [] as { id: string; name: string }[] };
  }

  const [departments, memberships] = await Promise.all([
    prisma.department.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.userTenant.findMany({
      where: { tenantId: auth.tenantId },
      select: {
        userId: true,
        displayName: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return {
    departments,
    managers: memberships.map((membership) => ({
      id: membership.userId,
      name: membership.displayName || membership.user.name || membership.user.email,
    })),
  };
}

export async function fetchUserOverview(userId: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId, userId: actorId } = ctx;

  const actor = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: actorId, tenantId } },
    select: { role: true },
  });
  if (!actor) return null;

  const permissions = getPermissions(actor.role as Role);
  const leaderCanView = await canViewEmployee({
    tenantId,
    viewerId: actorId,
    role: actor.role,
    employeeId: userId,
  });
  if (!permissions.canManageUsers && !leaderCanView) return null;
  if (!permissions.canManageUsers && !isLeaderScopedRole(actor.role)) return null;

  const orgOptions = permissions.canManageUsers
    ? await fetchEmployeeOrgOptions()
    : { departments: [], managers: [] };

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          lastSeenAt: true,
          address: true,
          postalCode: true,
          city: true,
        },
      },
      manager: { select: { name: true, email: true } },
      orgDepartment: { select: { name: true } },
      hrProfile: true,
      nextOfKin: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!membership) return null;

  const trainings = await prisma.training.findMany({
    where: { tenantId, userId },
    select: {
      id: true,
      title: true,
      completedAt: true,
      validUntil: true,
    },
    orderBy: [{ validUntil: "asc" }, { title: "asc" }],
  });

  let languages: string[] = [];
  if (membership.hrProfile?.languages) {
    try {
      const parsed = JSON.parse(membership.hrProfile.languages) as unknown;
      if (Array.isArray(parsed)) {
        languages = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      languages = [];
    }
  }

  return {
    name: membership.displayName || membership.user.name,
    email: membership.user.email,
    lastSeenAt: membership.user.lastSeenAt?.toISOString() ?? null,
    phone: membership.phone || membership.user.phone,
    address: membership.user.address,
    postalCode: membership.user.postalCode,
    city: membership.user.city,
    role: membership.role,
    employeeNumber: membership.employeeNumber,
    position: membership.position,
    department: membership.orgDepartment?.name || membership.department,
    managerName: membership.manager?.name || membership.manager?.email || null,
    nationality: membership.hrProfile?.nationality ?? null,
    languages,
    startedAt: membership.hrProfile?.startedAt?.toISOString() ?? null,
    dateOfBirth: membership.hrProfile?.dateOfBirth?.toISOString() ?? null,
    hrNotes: permissions.canReadHrNotes ? membership.hrProfile?.hrNotes ?? null : null,
    showHrNotes: permissions.canReadHrNotes,
    canOpenPersonnelFolder:
      permissions.canReadAllPersonnelFiles || permissions.canReadDepartmentPersonnelFiles,
    canEditContact: permissions.canManageUsers || membership.managerId === actorId,
    canEditOrg: permissions.canManageUsers,
    canEditNotes: permissions.canReadHrNotes,
    departmentId: membership.departmentId,
    managerId: membership.managerId,
    departments: orgOptions.departments,
    managers: orgOptions.managers,
    nextOfKin: membership.nextOfKin.map((kin) => ({
      name: kin.name,
      relation: kin.relation,
      phone: kin.phone,
    })),
    trainings: trainings.map((training) => ({
      id: training.id,
      title: training.title,
      completedAt: training.completedAt?.toISOString() ?? null,
      validUntil: training.validUntil?.toISOString() ?? null,
      status: getTrainingStatus({
        completedAt: training.completedAt,
        validUntil: training.validUntil,
      }),
    })),
  };
}
