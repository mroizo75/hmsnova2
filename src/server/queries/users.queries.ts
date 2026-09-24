"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";
import { getInvitableRoles, getPermissions } from "@/lib/permissions";
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
  const permissions = getPermissions(selectedMembership.role as Role);

  const [tenantUsers, departments] = await Promise.all([
    prisma.userTenant.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
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
  if (!permissions.canManageUsers) return null;

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      manager: { select: { name: true, email: true } },
      orgDepartment: { select: { name: true } },
      hrProfile: true,
      nextOfKin: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!membership) return null;

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
    phone: membership.phone,
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
    nextOfKin: membership.nextOfKin.map((kin) => ({
      name: kin.name,
      relation: kin.relation,
      phone: kin.phone,
    })),
  };
}
