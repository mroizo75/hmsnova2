"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchChemicals() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const chemicals = await prisma.chemical.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify(chemicals));
}

export async function fetchChemicalDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const [chemical, exposureCount] = await Promise.all([
    prisma.chemical.findUnique({ where: { id, tenantId } }),
    prisma.exposureRegister.count({
      where: { tenantId, chemicalId: id, status: { not: "ARCHIVED" } },
    }),
  ]);

  if (!chemical) return null;

  return JSON.parse(JSON.stringify({ chemical, exposureCount }));
}
