"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchAbsences() {
  const auth = await getAuthContext();
  const { tenantId, userId, permissions } = auth;

  let where: any;

  if (permissions.canReadAllAbsence) {
    where = { tenantId };
  } else if (permissions.canReadOwnAbsence) {
    // LEDER ser også fravær for ansatte de er leder for
    const managedUsers = await prisma.userTenant.findMany({
      where: { tenantId, managerId: userId },
      select: { userId: true },
    });
    const managedUserIds = managedUsers.map((u) => u.userId);

    where =
      managedUserIds.length > 0
        ? { tenantId, OR: [{ userId }, { userId: { in: managedUserIds } }] }
        : { tenantId, userId };
  } else {
    return [];
  }

  const absences = await prisma.absence.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return JSON.parse(JSON.stringify(absences));
}

export async function fetchAbsenceById(id: string) {
  const auth = await getAuthContext();
  const { tenantId, userId, permissions } = auth;

  const absence = await prisma.absence.findFirst({
    where: {
      id,
      tenantId,
      ...(permissions.canReadAllAbsence
        ? {}
        : { userId }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!absence) return null;

  // LEDER-sjekk: tillat lesing for leder selv om de ikke har canReadAllAbsence
  if (!permissions.canReadAllAbsence && absence.userId !== userId) {
    const isManager = await prisma.userTenant.findFirst({
      where: { tenantId, userId: absence.userId, managerId: userId },
    });
    if (!isManager) return null;
  }

  return JSON.parse(JSON.stringify(absence));
}

/**
 * Fraværsstatistikk – AML § 5-1 (4)
 * Arbeidsgiver plikter å føre statistikk over sykefravær og fravær
 * grunnet skade eller sykdom.
 */
export async function fetchAbsenceStats(year?: number) {
  const auth = await getAuthContext();
  const { tenantId, permissions } = auth;

  if (!permissions.canReadAllAbsence) {
    throw new Error("Ingen tilgang til fraværsstatistikk");
  }

  const targetYear = year ?? new Date().getFullYear();
  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear, 11, 31);

  const absences = await prisma.absence.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
    },
    include: {
      user: {
        include: {
          tenants: {
            where: { tenantId },
            select: { department: true },
          },
        },
      },
    },
  });

  const totalEmployees = await prisma.userTenant.count({
    where: { tenantId },
  });

  // Tilgjengelige arbeidsdager i året (ca. 260 virkedager)
  const totalWorkdays = totalEmployees * countWeekdays(yearStart, yearEnd);

  let totalSickDays = 0;
  let totalSelfCertifiedDays = 0;
  const byMonth: { month: number; sickDays: number }[] = Array.from(
    { length: 12 },
    (_, i) => ({ month: i + 1, sickDays: 0 }),
  );
  const byTypeMap = new Map<string, number>();
  const byDeptMap = new Map<string, { sickDays: number; totalDays: number }>();

  for (const absence of absences) {
    const start = new Date(Math.max(absence.startDate.getTime(), yearStart.getTime()));
    const end = new Date(Math.min(absence.endDate.getTime(), yearEnd.getTime()));
    const days = countWeekdays(start, end) * ((absence.percentage ?? 100) / 100);

    const typeKey = absence.type;
    byTypeMap.set(typeKey, (byTypeMap.get(typeKey) ?? 0) + days);

    const isSick = typeKey === "SICK_LEAVE" || typeKey === "SELF_CERTIFIED";
    if (isSick) {
      totalSickDays += days;
      if (typeKey === "SELF_CERTIFIED") totalSelfCertifiedDays += days;

      for (let m = start.getMonth(); m <= end.getMonth(); m++) {
        const mStart = new Date(targetYear, m, 1);
        const mEnd = new Date(targetYear, m + 1, 0);
        const overlapStart = new Date(Math.max(start.getTime(), mStart.getTime()));
        const overlapEnd = new Date(Math.min(end.getTime(), mEnd.getTime()));
        if (overlapStart <= overlapEnd) {
          byMonth[m].sickDays += countWeekdays(overlapStart, overlapEnd) * ((absence.percentage ?? 100) / 100);
        }
      }
    }

    const dept = (absence.user as any).tenants?.[0]?.department ?? "Ukjent";
    const deptEntry = byDeptMap.get(dept) ?? { sickDays: 0, totalDays: 0 };
    if (isSick) deptEntry.sickDays += days;
    deptEntry.totalDays += days;
    byDeptMap.set(dept, deptEntry);
  }

  const sickLeavePercentage =
    totalWorkdays > 0
      ? Math.round((totalSickDays / totalWorkdays) * 10000) / 100
      : 0;

  const byType = Array.from(byTypeMap.entries()).map(([type, count]) => ({
    type,
    count: Math.round(count * 10) / 10,
  }));

  const byDepartment = Array.from(byDeptMap.entries()).map(([department, data]) => ({
    department,
    sickDays: Math.round(data.sickDays * 10) / 10,
    totalDays: Math.round(data.totalDays * 10) / 10,
  }));

  return {
    year: targetYear,
    totalSickDays: Math.round(totalSickDays * 10) / 10,
    totalSelfCertifiedDays: Math.round(totalSelfCertifiedDays * 10) / 10,
    totalWorkdays,
    sickLeavePercentage,
    byMonth: byMonth.map((m) => ({
      ...m,
      sickDays: Math.round(m.sickDays * 10) / 10,
    })),
    byType,
    byDepartment,
  };
}

function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ─── Sykefraværsoppfølging (AML § 4-6) ─────────────────────────────────────

export async function fetchFollowUps(absenceId: string) {
  const auth = await getAuthContext();
  const { tenantId, userId, permissions } = auth;

  const absence = await prisma.absence.findFirst({
    where: { id: absenceId, tenantId },
  });
  if (!absence) return [];

  if (!permissions.canReadAllAbsence && absence.userId !== userId) {
    const isManager = await prisma.userTenant.findFirst({
      where: { tenantId, userId: absence.userId, managerId: userId },
    });
    if (!isManager) return [];
  }

  const followUps = await prisma.sickLeaveFollowUp.findMany({
    where: { absenceId, tenantId },
    include: {
      completedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return JSON.parse(JSON.stringify(followUps));
}

export async function fetchFollowUpById(id: string) {
  const auth = await getAuthContext();
  const { tenantId, userId, permissions } = auth;

  const followUp = await prisma.sickLeaveFollowUp.findFirst({
    where: { id, tenantId },
    include: {
      absence: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      completedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!followUp) return null;

  if (!permissions.canReadAllAbsence && followUp.absence.userId !== userId) {
    const isManager = await prisma.userTenant.findFirst({
      where: { tenantId, userId: followUp.absence.userId, managerId: userId },
    });
    if (!isManager) return null;
  }

  return JSON.parse(JSON.stringify(followUp));
}
