"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { canAccessPersonnelFile } from "@/features/personnel/lib/personnel-categories";
import { canViewEmployee, listVisibleEmployeeIds } from "@/server/lib/leader-employees";
import { isLeaderScopedRole } from "@/features/personnel/lib/leader-scope";
import { leaderDepartmentIds } from "@/server/queries/department.queries";
import { templateKeyForMilestone } from "@/features/employee-reviews/lib/sick-leave-templates";

export type HrOverviewAttention = {
  id: string;
  href: string;
  title: string;
  meta: string;
  kind: "absence" | "boarding" | "review";
};

export type HrSickFollowUp = {
  id: string;
  employeeId: string;
  employeeName: string;
  absenceId: string;
  milestone: string;
  dueDate: string;
  overdue: boolean;
  templateKey: string | null;
};

export type HrOverview = {
  employeeCount: number | null;
  pendingAbsences: number | null;
  activeSickLeaves: number | null;
  activeOnboardings: number | null;
  activeOffboardings: number | null;
  upcomingReviews: number | null;
  departmentCount: number | null;
  attention: HrOverviewAttention[];
  sickFollowUps: HrSickFollowUp[];
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

  const visibleIds = await listVisibleEmployeeIds({
    tenantId: auth.tenantId,
    userId: auth.userId,
    role: auth.role,
    departmentId: auth.departmentId,
  });

  const absenceWhere = visibleIds
    ? { tenantId: auth.tenantId, userId: { in: visibleIds } }
    : auth.permissions.canReadAllAbsence
      ? { tenantId: auth.tenantId }
      : { tenantId: auth.tenantId, userId: auth.userId };

  const boardingWhere = visibleIds
    ? { tenantId: auth.tenantId, employeeId: { in: visibleIds } }
    : auth.permissions.canReadAllBoarding
      ? { tenantId: auth.tenantId }
      : { tenantId: auth.tenantId, employeeId: auth.userId };

  const reviewWhere = visibleIds
    ? { tenantId: auth.tenantId, employeeId: { in: visibleIds } }
    : auth.permissions.canReadAllEmployeeReviews
      ? { tenantId: auth.tenantId }
      : {
          tenantId: auth.tenantId,
          OR: [{ employeeId: auth.userId }, { reviewerId: auth.userId }],
        };

  const [
    employeeCount,
    pendingAbsences,
    activeSickLeaves,
    boardingGroups,
    upcomingReviews,
    departmentCount,
    pendingAbsenceRows,
    boardingRows,
    reviewRows,
    sickFollowUpRows,
  ] = await Promise.all([
    canPersonnel
      ? prisma.userTenant.count({
          where: {
            tenantId: auth.tenantId,
            ...(visibleIds
              ? { userId: { in: visibleIds.length > 0 ? visibleIds : ["__none__"] } }
              : auth.permissions.canReadAllPersonnelFiles
                ? {}
                : { departmentId: auth.departmentId ?? "__none__" }),
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
      ? prisma.boarding.groupBy({
          by: ["type"],
          where: { ...boardingWhere, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
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
            ...(auth.role === "LEDER"
              ? {
                  id: {
                    in: await leaderDepartmentIds(auth.tenantId, auth.userId, auth.departmentId).then((ids) =>
                      ids.length > 0 ? ids : ["__none__"],
                    ),
                  },
                }
              : {}),
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
    canAbsence
      ? prisma.sickLeaveFollowUp.findMany({
          where: {
            tenantId: auth.tenantId,
            status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
            absence: {
              status: "APPROVED",
              ...( "userId" in absenceWhere ? { userId: absenceWhere.userId } : {}),
            },
          },
          include: {
            absence: {
              select: {
                id: true,
                userId: true,
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { dueDate: "asc" },
          take: 8,
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
      href: row.type === "OFFBOARDING" ? `/dashboard/onboarding/${row.id}` : `/dashboard/onboarding/${row.id}`,
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

  const countFor = (type: "ONBOARDING" | "OFFBOARDING") =>
    canBoarding
      ? (boardingGroups.find((group) => group.type === type)?._count._all ?? 0)
      : null;

  return {
    employeeCount,
    pendingAbsences,
    activeSickLeaves,
    activeOnboardings: countFor("ONBOARDING"),
    activeOffboardings: countFor("OFFBOARDING"),
    upcomingReviews,
    departmentCount,
    attention,
    sickFollowUps: sickFollowUpRows.map((row) => ({
      id: row.id,
      employeeId: row.absence.userId,
      employeeName: row.absence.user.name ?? row.absence.user.email,
      absenceId: row.absence.id,
      milestone: row.milestone,
      dueDate: row.dueDate.toISOString(),
      overdue: row.dueDate < now,
      templateKey: templateKeyForMilestone(row.milestone),
    })),
  };
}

export type EmployeeHrThread = {
  currentAbsence: { id: string; type: string; endDate: string } | null;
  pendingAbsenceCount: number;
  activeBoarding: { id: string; type: string; status: string } | null;
  upcomingReview: { id: string; scheduledDate: string; kind: string } | null;
};

export async function fetchEmployeeHrThread(userId: string): Promise<EmployeeHrThread | null> {
  const auth = await getAuthContext();
  if (!auth) return null;

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
    select: { departmentId: true, managerId: true },
  });
  if (!membership) return null;

  const allowed = isLeaderScopedRole(auth.role)
    ? await canViewEmployee({
        tenantId: auth.tenantId,
        viewerId: auth.userId,
        role: auth.role,
        employeeId: userId,
        departmentId: auth.departmentId,
      })
    : canAccessPersonnelFile({
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
      select: { id: true, scheduledDate: true, kind: true },
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
      ? {
          id: upcomingReview.id,
          scheduledDate: upcomingReview.scheduledDate.toISOString(),
          kind: upcomingReview.kind,
        }
      : null,
  };
}
