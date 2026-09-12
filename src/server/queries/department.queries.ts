"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export type DepartmentRow = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  sortOrder: number;
  memberCount: number;
};

export async function fetchDepartments(opts?: { includeInactive?: boolean }): Promise<DepartmentRow[]> {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadDepartments) return [];

  const where =
    auth.role === "LEDER" && auth.departmentId
      ? { tenantId: auth.tenantId, id: auth.departmentId }
      : {
          tenantId: auth.tenantId,
          ...(opts?.includeInactive || auth.permissions.canManageDepartments ? {} : { isActive: true }),
        };

  const departments = await prisma.department.findMany({
    where,
    include: { _count: { select: { memberships: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return departments.map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    isActive: department.isActive,
    sortOrder: department.sortOrder,
    memberCount: department._count.memberships,
  }));
}
