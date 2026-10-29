"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { ledDepartmentIds } from "@/features/departments/lib/department-tree";

export type DepartmentRow = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  sortOrder: number;
  memberCount: number;
  parentId: string | null;
  leaderId: string | null;
  leaderName: string | null;
};

export async function leaderDepartmentIds(
  tenantId: string,
  userId: string,
  ownDepartmentId: string | null,
): Promise<string[]> {
  const departments = await prisma.department.findMany({
    where: { tenantId },
    select: { id: true, parentId: true, leaderId: true },
  });
  return ledDepartmentIds(departments, userId, ownDepartmentId);
}

export async function fetchDepartmentLeaders(): Promise<{ id: string; name: string }[]> {
  const auth = await getAuthContext();
  if (!auth?.permissions.canManageDepartments) return [];

  const rows = await prisma.userTenant.findMany({
    where: { tenantId: auth.tenantId },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name ?? row.user.email,
  }));
}

export async function fetchDepartments(opts?: { includeInactive?: boolean }): Promise<DepartmentRow[]> {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadDepartments) return [];

  const visibleIds =
    auth.role === "LEDER"
      ? await leaderDepartmentIds(auth.tenantId, auth.userId, auth.departmentId)
      : null;

  const where = {
    tenantId: auth.tenantId,
    ...(visibleIds ? { id: { in: visibleIds.length > 0 ? visibleIds : ["__none__"] } } : {}),
    ...(opts?.includeInactive || auth.permissions.canManageDepartments || visibleIds
      ? {}
      : { isActive: true }),
  };

  const departments = await prisma.department.findMany({
    where,
    include: {
      _count: { select: { memberships: true } },
      leader: { select: { name: true, email: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return departments.map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    isActive: department.isActive,
    sortOrder: department.sortOrder,
    memberCount: department._count.memberships,
    parentId: department.parentId,
    leaderId: department.leaderId,
    leaderName: department.leader?.name ?? department.leader?.email ?? null,
  }));
}
