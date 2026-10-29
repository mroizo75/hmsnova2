import { prisma } from "@/lib/db";
import { isLeaderScopedRole } from "@/features/personnel/lib/leader-scope";
import { leaderDepartmentIds } from "@/server/queries/department.queries";

/** Nærmeste leder, egen bruker, og alle i avdelingene lederen leder inkludert underavdelinger. */
export async function leaderEmployeeWhere(tenantId: string, userId: string, ownDepartmentId: string | null) {
  const departmentIds = await leaderDepartmentIds(tenantId, userId, ownDepartmentId);
  return {
    OR: [
      { managerId: userId },
      { userId },
      ...(departmentIds.length > 0 ? [{ departmentId: { in: departmentIds } }] : []),
    ],
  };
}

export async function listVisibleEmployeeIds(input: {
  tenantId: string;
  userId: string;
  role: string;
  departmentId?: string | null;
}): Promise<string[] | null> {
  if (!isLeaderScopedRole(input.role)) return null;

  const rows = await prisma.userTenant.findMany({
    where: {
      tenantId: input.tenantId,
      ...(await leaderEmployeeWhere(input.tenantId, input.userId, input.departmentId ?? null)),
    },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

export async function canViewEmployee(input: {
  tenantId: string;
  viewerId: string;
  role: string;
  employeeId: string;
  departmentId?: string | null;
}): Promise<boolean> {
  const ids = await listVisibleEmployeeIds({
    tenantId: input.tenantId,
    userId: input.viewerId,
    role: input.role,
    departmentId: input.departmentId,
  });
  if (ids === null) return true;
  return ids.includes(input.employeeId);
}
