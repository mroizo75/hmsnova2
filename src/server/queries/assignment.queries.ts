"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import {
  competenceItemsFromRecords,
  inductionIsComplete,
  missingRequiredCompetence,
  parseInduction,
  type CompetenceItem,
} from "@/features/assignments/lib/deployment-gate";

export async function fetchAssignmentFormOptions() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents) return null;

  const [users, workplaces, profiles, projects] = await Promise.all([
    prisma.userTenant.findMany({
      where: { tenantId: auth.tenantId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.clientWorkplace.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
    prisma.competenceProfile.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { tenantId: auth.tenantId, status: { in: ["PLANNING", "ACTIVE"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    users: users.map((row) => row.user),
    workplaces,
    profiles,
    projects,
  };
}

export async function fetchAssignments() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents) return [];

  const assignments = await prisma.assignment.findMany({
    where: { tenantId: auth.tenantId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      clientWorkplace: { select: { id: true, name: true, address: true, industry: true } },
      competenceProfile: { select: { id: true, name: true, requirements: true } },
      _count: { select: { incidents: { where: { status: { not: "CLOSED" } } } } },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });

  const courseKeys = [
    ...new Set(assignments.flatMap((item) => item.competenceProfile?.requirements.map((req) => req.courseKey) ?? [])),
  ];
  const userIds = [...new Set(assignments.map((item) => item.userId))];
  const trainings =
    courseKeys.length === 0
      ? []
      : await prisma.training.findMany({
          where: { tenantId: auth.tenantId, userId: { in: userIds }, courseKey: { in: courseKeys } },
          select: { userId: true, courseKey: true, completedAt: true, validUntil: true },
        });

  const now = new Date();
  return assignments.map((assignment) => {
    const userTrainings = trainings.filter((item) => item.userId === assignment.userId);
    const items: CompetenceItem[] = assignment.competenceProfile
      ? competenceItemsFromRecords(assignment.competenceProfile.requirements, userTrainings, now)
      : [];
    const missing = missingRequiredCompetence(items);
    const induction = parseInduction(assignment.induction);
    return {
      id: assignment.id,
      status: assignment.status,
      roleTitle: assignment.roleTitle,
      startDate: assignment.startDate.toISOString(),
      endDate: assignment.endDate?.toISOString() ?? null,
      user: assignment.user,
      workplace: assignment.clientWorkplace,
      profileName: assignment.competenceProfile?.name ?? null,
      competenceReady: missing.length === 0,
      inductionReady: inductionIsComplete(induction),
      openIncidents: assignment._count.incidents,
    };
  });
}

export async function fetchAssignmentDetail(id: string) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents) return null;

  const assignment = await prisma.assignment.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      clientWorkplace: true,
      competenceProfile: { include: { requirements: true } },
      project: { select: { id: true, name: true } },
      _count: {
        select: {
          incidents: { where: { status: { not: "CLOSED" } } },
          sjaAnalyses: true,
        },
      },
    },
  });
  if (!assignment) return null;

  const trainings = assignment.competenceProfile
    ? await prisma.training.findMany({
        where: {
          tenantId: auth.tenantId,
          userId: assignment.userId,
          courseKey: { in: assignment.competenceProfile.requirements.map((item) => item.courseKey) },
        },
        select: { courseKey: true, completedAt: true, validUntil: true },
      })
    : [];
  const items = assignment.competenceProfile
    ? competenceItemsFromRecords(assignment.competenceProfile.requirements, trainings, new Date())
    : [];

  return {
    id: assignment.id,
    status: assignment.status,
    roleTitle: assignment.roleTitle ?? "",
    startDate: assignment.startDate.toISOString().slice(0, 10),
    endDate: assignment.endDate ? assignment.endDate.toISOString().slice(0, 10) : "",
    notes: assignment.notes ?? "",
    induction: parseInduction(assignment.induction),
    coordinationNoted: assignment.coordinationNoted,
    coordinationAt: assignment.coordinationAt ? assignment.coordinationAt.toISOString().slice(0, 10) : "",
    coordinationContact: assignment.coordinationContact ?? "",
    clientRiskReceived: assignment.clientRiskReceived,
    competenceProfileId: assignment.competenceProfileId ?? "",
    user: assignment.user,
    workplace: {
      id: assignment.clientWorkplace.id,
      name: assignment.clientWorkplace.name,
      orgNumber: assignment.clientWorkplace.orgNumber,
      contactName: assignment.clientWorkplace.contactName,
      contactPhone: assignment.clientWorkplace.contactPhone,
      contactEmail: assignment.clientWorkplace.contactEmail,
      address: assignment.clientWorkplace.address,
      industry: assignment.clientWorkplace.industry,
      siteLeaderName: assignment.clientWorkplace.siteLeaderName,
    },
    project: assignment.project,
    profileName: assignment.competenceProfile?.name ?? null,
    competenceItems: items,
    openIncidents: assignment._count.incidents,
    sjaCount: assignment._count.sjaAnalyses,
  };
}
