import { prisma } from "@/lib/db";
import { isLeaderScopedRole, managedEmployeeFilter } from "@/features/personnel/lib/leader-scope";

export async function listVisibleEmployeeIds(input: {
  tenantId: string;
  userId: string;
  role: string;
}): Promise<string[] | null> {
  if (!isLeaderScopedRole(input.role)) return null;

  const rows = await prisma.userTenant.findMany({
    where: { tenantId: input.tenantId, ...managedEmployeeFilter(input.userId) },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

export async function canViewEmployee(input: {
  tenantId: string;
  viewerId: string;
  role: string;
  employeeId: string;
}): Promise<boolean> {
  const ids = await listVisibleEmployeeIds({
    tenantId: input.tenantId,
    userId: input.viewerId,
    role: input.role,
  });
  if (ids === null) return true;
  return ids.includes(input.employeeId);
}
