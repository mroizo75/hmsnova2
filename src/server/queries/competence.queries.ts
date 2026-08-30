"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchProfiles() {
  const auth = await getAuthContext();
  const { tenantId, permissions } = auth;

  if (!permissions.canReadAllTraining) return [];

  const profiles = await prisma.competenceProfile.findMany({
    where: { tenantId },
    include: {
      requirements: { orderBy: { priority: "desc" } },
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  return JSON.parse(JSON.stringify(profiles));
}

export async function fetchProfileById(id: string) {
  const auth = await getAuthContext();
  const { tenantId, permissions } = auth;

  if (!permissions.canReadAllTraining) return null;

  const profile = await prisma.competenceProfile.findFirst({
    where: { id, tenantId },
    include: {
      requirements: { orderBy: { priority: "desc" } },
      users: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return profile ? JSON.parse(JSON.stringify(profile)) : null;
}

export interface GapItem {
  courseKey: string;
  courseTitle: string;
  requiredLevel: string;
  legalRef: string | null;
  status: "FULFILLED" | "EXPIRED" | "MISSING";
  validUntil: string | null;
  completedAt: string | null;
}

export interface UserGapResult {
  userId: string;
  userName: string | null;
  userEmail: string;
  department: string | null;
  profiles: { id: string; name: string }[];
  totalRequirements: number;
  fulfilled: number;
  expired: number;
  missing: number;
  gapPercent: number;
  items: GapItem[];
  criticalMissing: GapItem[];
}

export async function fetchUserGapAnalysis(userId: string): Promise<UserGapResult | null> {
  const auth = await getAuthContext();
  const { tenantId, permissions } = auth;

  if (!permissions.canReadAllTraining && auth.userId !== userId) return null;

  const userTenant = await prisma.userTenant.findFirst({
    where: { tenantId, userId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!userTenant) return null;

  const assignedProfiles = await prisma.userCompetenceProfile.findMany({
    where: { tenantId, userId },
    include: {
      profile: {
        include: { requirements: true },
      },
    },
  });

  if (assignedProfiles.length === 0) {
    return {
      userId,
      userName: userTenant.user.name,
      userEmail: userTenant.user.email,
      department: userTenant.department,
      profiles: [],
      totalRequirements: 0,
      fulfilled: 0,
      expired: 0,
      missing: 0,
      gapPercent: 100,
      items: [],
      criticalMissing: [],
    };
  }

  const reqMap = new Map<string, { requiredLevel: string; legalRef: string | null }>();
  for (const ap of assignedProfiles) {
    for (const req of ap.profile.requirements) {
      const existing = reqMap.get(req.courseKey);
      if (!existing || levelPriority(req.requiredLevel) > levelPriority(existing.requiredLevel)) {
        reqMap.set(req.courseKey, { requiredLevel: req.requiredLevel, legalRef: req.legalRef });
      }
    }
  }

  const trainings = await prisma.training.findMany({
    where: { tenantId, userId, courseKey: { in: [...reqMap.keys()] } },
  });
  const trainingMap = new Map(trainings.map((t) => [t.courseKey, t]));

  const courseTemplates = await prisma.courseTemplate.findMany({
    where: {
      OR: [
        { tenantId, courseKey: { in: [...reqMap.keys()] } },
        { isGlobal: true, courseKey: { in: [...reqMap.keys()] } },
      ],
    },
  });
  const templateMap = new Map(courseTemplates.map((c) => [c.courseKey, c]));

  const now = new Date();
  const items: GapItem[] = [];
  let fulfilled = 0;
  let expired = 0;
  let missing = 0;

  for (const [courseKey, req] of reqMap.entries()) {
    const training = trainingMap.get(courseKey);
    const template = templateMap.get(courseKey);
    const title = template?.title ?? training?.title ?? courseKey;

    let status: "FULFILLED" | "EXPIRED" | "MISSING";
    if (!training || !training.completedAt) {
      status = "MISSING";
      missing++;
    } else if (training.validUntil && new Date(training.validUntil) < now) {
      status = "EXPIRED";
      expired++;
    } else {
      status = "FULFILLED";
      fulfilled++;
    }

    items.push({
      courseKey,
      courseTitle: title,
      requiredLevel: req.requiredLevel,
      legalRef: req.legalRef,
      status,
      validUntil: training?.validUntil?.toISOString() ?? null,
      completedAt: training?.completedAt?.toISOString() ?? null,
    });
  }

  const total = reqMap.size;
  const gapPercent = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

  return {
    userId,
    userName: userTenant.user.name,
    userEmail: userTenant.user.email,
    department: userTenant.department,
    profiles: assignedProfiles.map((ap) => ({ id: ap.profile.id, name: ap.profile.name })),
    totalRequirements: total,
    fulfilled,
    expired,
    missing,
    gapPercent,
    items: items.sort((a, b) => statusOrder(a.status) - statusOrder(b.status)),
    criticalMissing: items.filter((i) => i.legalRef && i.status !== "FULFILLED"),
  };
}

export async function fetchTeamGapAnalysis() {
  const auth = await getAuthContext();
  const { tenantId, permissions } = auth;

  if (!permissions.canReadAllTraining) return [];

  const usersWithProfiles = await prisma.userCompetenceProfile.findMany({
    where: { tenantId },
    select: { userId: true },
    distinct: ["userId"],
  });

  const results: UserGapResult[] = [];
  for (const { userId } of usersWithProfiles) {
    const gap = await fetchUserGapAnalysis(userId);
    if (gap) results.push(gap);
  }

  return results;
}

export async function fetchGapDashboard() {
  const auth = await getAuthContext();
  const { tenantId, permissions } = auth;

  if (!permissions.canReadAllTraining) return null;

  const teamGaps = await fetchTeamGapAnalysis();

  const totalUsers = teamGaps.length;
  const avgGap = totalUsers > 0
    ? Math.round(teamGaps.reduce((s, g) => s + g.gapPercent, 0) / totalUsers)
    : 0;
  const usersWithExpired = teamGaps.filter((g) => g.expired > 0).length;
  const criticalCount = teamGaps.reduce((s, g) => s + g.criticalMissing.length, 0);

  const byDepartment = new Map<string, { total: number; sumGap: number }>();
  for (const g of teamGaps) {
    const dept = g.department ?? "Uten avdeling";
    const existing = byDepartment.get(dept) ?? { total: 0, sumGap: 0 };
    existing.total++;
    existing.sumGap += g.gapPercent;
    byDepartment.set(dept, existing);
  }

  const departmentGaps = [...byDepartment.entries()].map(([dept, data]) => ({
    department: dept,
    avgGapPercent: Math.round(data.sumGap / data.total),
    userCount: data.total,
  }));

  return {
    totalUsersWithProfiles: totalUsers,
    avgCompliancePercent: avgGap,
    usersWithExpiredTraining: usersWithExpired,
    criticalMissingCount: criticalCount,
    departmentGaps,
    teamGaps,
  };
}

function levelPriority(level: string): number {
  switch (level) {
    case "REQUIRED": return 3;
    case "RECOMMENDED": return 2;
    case "AWARENESS": return 1;
    default: return 0;
  }
}

function statusOrder(status: string): number {
  switch (status) {
    case "MISSING": return 0;
    case "EXPIRED": return 1;
    case "FULFILLED": return 2;
    default: return 3;
  }
}
