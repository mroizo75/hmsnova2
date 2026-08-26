"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export async function fetchOrgChartNodes() {
  const { tenantId } = await getRequiredTenantContext();

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
