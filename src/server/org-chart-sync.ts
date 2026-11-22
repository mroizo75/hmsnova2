import { prisma } from "@/lib/db";
import {
  buildOrgChartFromEmployees,
  type OrgChartDraftNode,
} from "@/lib/org-chart-from-employees";

type StoredNode = {
  id: string;
  parentId: string | null;
  title: string;
  name: string | null;
  department: string | null;
  sortOrder: number;
  kind: string;
};

function signatureFromStored(nodes: StoredNode[]): string {
  const byParent = new Map<string | null, StoredNode[]>();
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? [];
    list.push(node);
    byParent.set(node.parentId, list);
  }
  const walk = (parentId: string | null): string => {
    const children = (byParent.get(parentId) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "nb"),
    );
    return children
      .map(
        (node) =>
          `${node.sortOrder}|${node.kind}|${node.title}|${node.name ?? ""}|${node.department ?? ""}>[${walk(node.id)}]`,
      )
      .join(";");
  };
  return walk(null);
}

function signatureFromDrafts(nodes: OrgChartDraftNode[]): string {
  const byParent = new Map<string | null, OrgChartDraftNode[]>();
  for (const node of nodes) {
    const list = byParent.get(node.parentKey) ?? [];
    list.push(node);
    byParent.set(node.parentKey, list);
  }
  const walk = (parentKey: string | null): string => {
    const children = (byParent.get(parentKey) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "nb"),
    );
    return children
      .map(
        (node) =>
          `${node.sortOrder}|${node.kind}|${node.title}|${node.name ?? ""}|${node.department ?? ""}>[${walk(node.key)}]`,
      )
      .join(";");
  };
  return walk(null);
}

/** Holder organisasjonskartet lik linjen i personalregisteret. Skriver bare når noe er endret. */
export async function syncOrgChartFromEmployees(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { orgChartManual: true },
  });
  if (tenant?.orgChartManual) return;

  const [memberships, departments, existing] = await Promise.all([
    prisma.userTenant.findMany({
      where: { tenantId },
      select: {
        role: true,
        extraRoles: true,
        isChiefSafetyRep: true,
        managerId: true,
        departmentId: true,
        position: true,
        displayName: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.department.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, parentId: true, leaderId: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.orgChartNode.findMany({
      where: { tenantId },
      select: {
        id: true,
        parentId: true,
        title: true,
        name: true,
        department: true,
        sortOrder: true,
        kind: true,
      },
    }),
  ]);

  const drafts = buildOrgChartFromEmployees(
    memberships.map((membership) => ({
      userId: membership.user.id,
      name: membership.displayName?.trim() || membership.user.name?.trim() || membership.user.email,
      role: membership.role,
      extraRoles: membership.extraRoles,
      isChiefSafetyRep: membership.isChiefSafetyRep,
      managerId: membership.managerId,
      departmentId: membership.departmentId,
      position: membership.position,
      createdAt: membership.createdAt,
    })),
    departments,
  );

  if (signatureFromDrafts(drafts) === signatureFromStored(existing)) return;

  await prisma.$transaction(async (tx) => {
    await tx.orgChartNode.deleteMany({ where: { tenantId } });
    const idByKey = new Map<string, string>();
    for (const node of drafts) {
      const created = await tx.orgChartNode.create({
        data: {
          tenantId,
          parentId: node.parentKey ? (idByKey.get(node.parentKey) ?? null) : null,
          title: node.title,
          name: node.name,
          department: node.department,
          sortOrder: node.sortOrder,
          kind: node.kind,
        },
      });
      idByKey.set(node.key, created.id);
    }
  });
}
