"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export async function getActionContext() {
  const tenantContext = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("Bruker er ikke tilknyttet en virksomhet");
  }

  const selectedTenantMembership = user.tenants.find(
    (membership) => membership.tenantId === tenantContext.tenantId,
  );
  if (!selectedTenantMembership) {
    throw new Error("Bruker er ikke tilknyttet valgt virksomhet");
  }

  return { user, tenantId: tenantContext.tenantId, role: selectedTenantMembership.role };
}

