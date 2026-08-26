"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchOrgChartNodes() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const nodes = await prisma.orgChartNode.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return JSON.parse(JSON.stringify(
    nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      title: n.title,
      name: n.name,
      department: n.department,
      sortOrder: n.sortOrder,
    }))
  ));
}
