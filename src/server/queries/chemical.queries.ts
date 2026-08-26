"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export async function fetchChemicals() {
  const { tenantId } = await getRequiredTenantContext();

  const chemicals = await prisma.chemical.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify(chemicals));
}

export async function fetchChemicalDetail(id: string) {
  const { tenantId } = await getRequiredTenantContext();

  const [chemical, exposureCount] = await Promise.all([
    prisma.chemical.findUnique({ where: { id, tenantId } }),
    prisma.exposureRegister.count({
      where: { tenantId, chemicalId: id, status: { not: "ARCHIVED" } },
    }),
  ]);

  if (!chemical) return null;

  return JSON.parse(JSON.stringify({ chemical, exposureCount }));
}
