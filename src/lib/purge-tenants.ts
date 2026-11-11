import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { deleteTenantFiles } from "@/lib/storage";

async function deleteTenantRows(
  tx: Prisma.TransactionClient,
  tenantIds: string[],
  candidateUserIds: string[],
) {
  for (const tenantId of tenantIds) {
    await tx.tenant.delete({ where: { id: tenantId } });
  }

  if (candidateUserIds.length === 0) return;

  await tx.user.deleteMany({
    where: {
      id: { in: candidateUserIds },
      isSuperAdmin: false,
      isSupport: false,
      tenants: { none: {} },
      corporateGroupMemberships: { none: {} },
    },
  });
}

/** Sletter bedrifter, filene deres og brukerkontoer som ikke lenger hører til en bedrift. */
export async function purgeTenants(tenantIds: string[]) {
  const uniqueIds = [...new Set(tenantIds)];
  if (uniqueIds.length === 0) return;

  const links = await prisma.userTenant.findMany({
    where: { tenantId: { in: uniqueIds } },
    select: { userId: true },
  });
  const candidateUserIds = [...new Set(links.map((link) => link.userId))];

  for (const tenantId of uniqueIds) {
    await deleteTenantFiles(tenantId);
  }

  await prisma.$transaction(
    async (tx) => {
      await deleteTenantRows(tx, uniqueIds, candidateUserIds);
    },
    { maxWait: 15_000, timeout: 300_000 },
  );
}

export async function purgeTenantsInTransaction(
  tx: Prisma.TransactionClient,
  tenantIds: string[],
  candidateUserIds: string[],
) {
  await deleteTenantRows(tx, [...new Set(tenantIds)], [...new Set(candidateUserIds)]);
}
