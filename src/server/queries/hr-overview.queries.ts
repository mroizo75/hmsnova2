"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { canAccessPersonnelFile } from "@/features/personnel/lib/personnel-categories";

export type HrOverviewAttention = {
  id: string;
  href: string;
  title: string;
  meta: string;
  kind: "absence" | "boarding" | "review";
};

export type HrOverview = {
  employeeCount: number | null;
  pendingAbsences: number | null;
  activeSickLeaves: number | null;
  activeBoardings: number | null;
  upcomingReviews: number | null;
  departmentCount: number | null;
  attention: HrOverviewAttention[];
};

export async function fetchHrOverview(): Promise<HrOverview | null> {
  const auth = await getAuthContext();
  if (!auth) return null;

  const now = new Date();
  const canPersonnel =
    auth.permissions.canReadAllPersonnelFiles || auth.permissions.canReadDepartmentPersonnelFiles;
  const canAbsence = auth.permissions.canReadAllAbsence || auth.permissions.canReadOwnAbsence;
  const canBoarding = auth.permissions.canReadAllBoarding || auth.permissions.canReadOwnBoarding;
  const canReviews =
    auth.permissions.canReadAllEmployeeReviews || auth.permissions.canReadOwnEmployeeReviews;

  const absenceWhere = auth.permissions.canReadAllAbsence
    ? { tenantId: auth.tenantId }
    : { tenantId: auth.tenantId, userId: auth.userId };

  const boardingWhere = auth.permissions.canReadAllBoarding
    ? { tenantId: auth.tenantId }
    : { tenantId: auth.tenantId, employeeId: auth.userId };

  const reviewWhere = auth.permissions.canReadAllEmployeeReviews
    ? { tenantId: auth.tenantId }
    : {
        tenantId: auth.tenantId,
        OR: [{ employeeId: auth.userId }, { reviewerId: auth.userId }],
      };

  const [
    employeeCount,
    pendingAbsences,
    activeSickLeaves,
    activeBoardings,
    upcomingReviews,
    departmentCount,
    pendingAbsenceRows,
    boardingRows,
    reviewRows,
  ] = await Promise.all([
    canPersonnel
      ? prisma.userTenant.count({
          where: {
            tenantId: auth.tenantId,
            ...(auth.permissions.canReadAllPersonnelFiles ? {} : { departmentId: auth.departmentId ?? "__none__" }),
          },
        })
      : Promise.resolve(null),
    canAbsence
      ? prisma.absence.count({ where: { ...absenceWhere, status: "PENDING" } })
      : Promise.resolve(null),
    canAbsence
      ? prisma.absence.count({
          where: {
            ...absenceWhere,
            status: "APPROVED",
            type: { in: ["SICK_LEAVE", "SELF_CERTIFIED"] },
            startDate: { lte: now },
            endDate: { gte: now },
          },
        })
      : Promise.resolve(null),
    canBoarding
      ? prisma.boarding.count({
          where: { ...boardingWhere, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
        })
      : Promise.resolve(null),
    canReviews
      ? prisma.employeeReview.count({
          where: { ...reviewWhere, status: { in: ["PLANLAGT", "FORBEREDT"] } },
        })
      : Promise.resolve(null),
    auth.permissions.canReadDepartments
      ? prisma.department.count({
          where: {
            tenantId: auth.tenantId,
            isActive: true,
            ...(auth.role === "LEDER" && auth.departmentId ? { id: auth.departmentId } : {}),
          },
        })
      : Promise.resolve(null),
    canAbsence
      ? prisma.absence.findMany({
          where: { ...absenceWhere, status: "PENDING" },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { startDate: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
    canBoarding
      ? prisma.boarding.findMany({
          where: { ...boardingWhere, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
          include: { employee: { select: { name: true, email: true } } },
          orderBy: { startDate: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
    canReviews
      ? prisma.employeeReview.findMany({
          where: { ...reviewWhere, status: { in: ["PLANLAGT", "FORBEREDT"] } },
          include: { employee: { select: { name: true, email: true } } },
          orderBy: { scheduledDate: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const attention: HrOverviewAttention[] = [
    ...pendingAbsenceRows.map((row) => ({
      id: row.id,
      href: `/dashboard/fravaer/${row.id}`,
      title: row.user.name ?? row.user.email,
      meta: "Venter på godkjenning av fravær",
      kind: "absence" as const,
    })),
    ...boardingRows.map((row) => ({
      id: row.id,
      href: `/dashboard/onboarding/${row.id}`,
      title: row.employee.name ?? row.employee.email,
      meta: row.type === "OFFBOARDING" ? "Offboarding pågår" : "Onboarding pågår",
      kind: "boarding" as const,
    })),
    ...reviewRows.map((row) => ({
      id: row.id,
      href: `/dashboard/medarbeidersamtale/${row.id}`,
      title: row.employee.name ?? row.employee.email,
      meta: "Samtale planlagt",
      kind: "review" as const,
    })),
  ].slice(0, 8);

  return {
    employeeCount,
    pendingAbsences,
    activeSickLeaves,
    activeBoardings,
    upcomingReviews,
    departmentCount,
    attention,
  };
}

export type EmployeeHrThread = {
  currentAbsence: { id: string; type: string; endDate: string } | null;
  pendingAbsenceCount: number;
  activeBoarding: { id: string; type: string; status: string } | null;
  upcomingReview: { id: string; scheduledDate: string } | null;
};

export async function fetchEmployeeHrThread(userId: string): Promise<EmployeeHrThread | null> {
  const auth = await getAuthContext();
  if (!auth) return null;

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
    select: { departmentId: true },
  });
  if (!membership) return null;

  const allowed = canAccessPersonnelFile({
    viewerId: auth.userId,
    employeeId: userId,
    canReadOwn: auth.permissions.canReadOwnPersonnelFile,
    canReadAll: auth.permissions.canReadAllPersonnelFiles,
    canReadDepartment: auth.permissions.canReadDepartmentPersonnelFiles,
    viewerDepartmentId: auth.departmentId,
    employeeDepartmentId: membership.departmentId,
  });
  if (!allowed) return null;

  const now = new Date();
  const [currentAbsence, pendingAbsenceCount, activeBoarding, upcomingReview] = await Promise.all([
    prisma.absence.findFirst({
      where: {
        tenantId: auth.tenantId,
        userId,
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: "desc" },
      select: { id: true, type: true, endDate: true },
    }),
    prisma.absence.count({
      where: { tenantId: auth.tenantId, userId, status: "PENDING" },
    }),
    prisma.boarding.findFirst({
      where: {
        tenantId: auth.tenantId,
        employeeId: userId,
        status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, status: true },
    }),
    prisma.employeeReview.findFirst({
      where: {
        tenantId: auth.tenantId,
        employeeId: userId,
        status: { in: ["PLANLAGT", "FORBEREDT"] },
      },
      orderBy: { scheduledDate: "asc" },
      select: { id: true, scheduledDate: true },
    }),
  ]);

  return {
    currentAbsence: currentAbsence
      ? {
          id: currentAbsence.id,
          type: currentAbsence.type,
          endDate: currentAbsence.endDate.toISOString(),
        }
      : null,
    pendingAbsenceCount,
    activeBoarding,
    upcomingReview: upcomingReview
      ? { id: upcomingReview.id, scheduledDate: upcomingReview.scheduledDate.toISOString() }
      : null,
  };
}
