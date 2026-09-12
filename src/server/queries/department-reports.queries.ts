"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { VO_HIDDEN_INCIDENT_TYPES, isQualityOnlyIncident } from "@/lib/incident-visibility";
import type { IncidentType } from "@prisma/client";

export type DepartmentReport = {
  id: string;
  name: string;
  employeeCount: number;
  positions: Array<{ position: string; count: number }>;
  incidentsOpen: number;
  incidentsClosed: number;
  incidentsByType: Array<{ type: string; count: number }>;
  absenceCount: number;
  absenceDays: number;
  competenceExpired: number;
  competenceMissingRequired: number;
};

function canSeePersonnelDetails(auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>) {
  return auth.permissions.canReadAllPersonnelFiles || auth.permissions.canReadDepartmentPersonnelFiles;
}

export async function fetchDepartmentReports(): Promise<DepartmentReport[]> {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadDepartments) return [];

  const departmentFilter =
    auth.role === "LEDER" && auth.departmentId ? { id: auth.departmentId } : {};

  const departments = await prisma.department.findMany({
    where: { tenantId: auth.tenantId, isActive: true, ...departmentFilter },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const memberships = await prisma.userTenant.findMany({
    where: {
      tenantId: auth.tenantId,
      departmentId: departments.length > 0 ? { in: departments.map((d) => d.id) } : undefined,
    },
    select: { userId: true, departmentId: true, position: true },
  });

  const userIds = memberships.map((m) => m.userId);
  const now = new Date();

  const [incidents, absences, trainings, requiredCourses] = await Promise.all([
    prisma.incident.findMany({
      where: { tenantId: auth.tenantId, reportedBy: { in: userIds } },
      select: { reportedBy: true, type: true, status: true, subcategoryKeys: true },
    }),
    prisma.absence.findMany({
      where: { tenantId: auth.tenantId, userId: { in: userIds } },
      select: { userId: true, startDate: true, endDate: true },
    }),
    prisma.training.findMany({
      where: { tenantId: auth.tenantId, userId: { in: userIds } },
      select: { userId: true, courseKey: true, validUntil: true },
    }),
    prisma.courseTemplate.findMany({
      where: {
        isRequired: true,
        isActive: true,
        OR: [{ tenantId: auth.tenantId }, { isGlobal: true }],
      },
      select: { courseKey: true },
    }),
  ]);

  const hidePersonnel = !canSeePersonnelDetails(auth);
  const requiredKeys = requiredCourses.map((c) => c.courseKey);

  return departments.map((department) => {
    const members = memberships.filter((m) => m.departmentId === department.id);
    const memberIds = new Set(members.map((m) => m.userId));

    const positions = new Map<string, number>();
    for (const member of members) {
      const key = member.position?.trim() || "Uten stilling";
      positions.set(key, (positions.get(key) ?? 0) + 1);
    }

    const deptIncidents = incidents.filter((incident) => {
      if (!memberIds.has(incident.reportedBy)) return false;
      if (auth.role === "VERNEOMBUD") return false;
      if (auth.role === "HMS" && hidePersonnel) {
        return !isQualityOnlyIncident(incident.type as IncidentType, incident.subcategoryKeys);
      }
      if (VO_HIDDEN_INCIDENT_TYPES.includes(incident.type as IncidentType) && auth.role === "HR") {
        return false;
      }
      return true;
    });

    const deptAbsences = hidePersonnel ? [] : absences.filter((row) => memberIds.has(row.userId));
    const deptTrainings = trainings.filter((row) => memberIds.has(row.userId));

    const typeCounts = new Map<string, number>();
    let open = 0;
    let closed = 0;
    for (const incident of deptIncidents) {
      typeCounts.set(incident.type, (typeCounts.get(incident.type) ?? 0) + 1);
      if (incident.status === "CLOSED") closed += 1;
      else open += 1;
    }

    let absenceDays = 0;
    for (const absence of deptAbsences) {
      const start = absence.startDate.getTime();
      const end = absence.endDate.getTime();
      absenceDays += Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    }

    const expired = deptTrainings.filter((row) => row.validUntil && row.validUntil < now).length;
    let missingRequired = 0;
    if (!hidePersonnel) {
      for (const member of members) {
        const keys = new Set(
          deptTrainings.filter((row) => row.userId === member.userId).map((row) => row.courseKey),
        );
        missingRequired += requiredKeys.filter((key) => !keys.has(key)).length;
      }
    }

    return {
      id: department.id,
      name: department.name,
      employeeCount: members.length,
      positions: hidePersonnel
        ? [{ position: "Skjult", count: members.length }]
        : Array.from(positions.entries()).map(([position, count]) => ({ position, count })),
      incidentsOpen: open,
      incidentsClosed: closed,
      incidentsByType: Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count })),
      absenceCount: deptAbsences.length,
      absenceDays,
      competenceExpired: hidePersonnel ? 0 : expired,
      competenceMissingRequired: hidePersonnel ? 0 : missingRequired,
    };
  });
}
