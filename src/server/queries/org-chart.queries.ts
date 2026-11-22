"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";
import { syncOrgChartFromEmployees } from "@/server/org-chart-sync";

export async function fetchOrgChartNodes() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return { manual: false, nodes: [] as OrgChartNodeView[] };
  const { tenantId } = ctx;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { orgChartManual: true },
  });
  const manual = tenant?.orgChartManual ?? false;
  if (!manual) {
    await syncOrgChartFromEmployees(tenantId);
  }

  const nodes = await prisma.orgChartNode.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return {
    manual,
    nodes: JSON.parse(JSON.stringify(
      nodes.map((n) => ({
        id: n.id,
        parentId: n.parentId,
        title: n.title,
        name: n.name,
        department: n.department,
        sortOrder: n.sortOrder,
        kind: n.kind === "DEPARTMENT" ? "DEPARTMENT" : "PERSON",
      })),
    )) as OrgChartNodeView[],
  };
}

export type OrgChartNodeView = {
  id: string;
  parentId: string | null;
  title: string;
  name: string | null;
  department: string | null;
  sortOrder: number;
  kind: "PERSON" | "DEPARTMENT";
};
