"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

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

  const tenantUsers = await prisma.userTenant.findMany({
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
  });

  const usersWithEmployeeNumber = tenantUsers.map((ut) => ({
    ...ut,
    employeeNumber: ut.employeeNumber ?? null,
    position: ut.position ?? null,
    managerId: ut.managerId ?? null,
  }));

  const { getSubscriptionLimits } = await import("@/lib/subscription");
  const limits = getSubscriptionLimits(tenant.pricingTier as any);

  return JSON.parse(JSON.stringify({
    users: usersWithEmployeeNumber,
    currentUserId: user.id,
    isAdmin,
    pricingTier: tenant.pricingTier,
    maxUsers: limits.maxUsers,
  }));
}
