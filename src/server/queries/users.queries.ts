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
