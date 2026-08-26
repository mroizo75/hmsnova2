"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { UserTenant } from "@prisma/client";

function resolveActiveTenantId(
  tenantMemberships: UserTenant[],
  sessionTenantId?: string,
): string | null {
  if (sessionTenantId) {
    const has = tenantMemberships.some((m) => m.tenantId === sessionTenantId);
    if (!has) return null;
    return sessionTenantId;
  }
  return tenantMemberships[0]?.tenantId ?? null;
}

export async function fetchHmsCockpitData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user) return null;

  const tenantId = resolveActiveTenantId(
    user.tenants,
    (session as any).activeTenantId,
  );
  if (!tenantId) return null;

  const [latestScore, scoreHistory, activeSuggestions, recentLogs, activePatterns] =
    await Promise.all([
      prisma.tenantHmsScore.findFirst({
        where: { tenantId },
        orderBy: { scoreDate: "desc" },
      }),
      prisma.tenantHmsScore.findMany({
        where: { tenantId },
        orderBy: { scoreDate: "asc" },
        take: 90,
      }),
      prisma.improvementSuggestion.findMany({
        where: { tenantId, status: { in: ["PENDING", "ACCEPTED"] } },
        include: { pattern: true },
        orderBy: { priority: "desc" },
      }),
      prisma.improvementLog.findMany({
        where: { tenantId },
        orderBy: { changedAt: "desc" },
        take: 10,
      }),
      prisma.patternCache.count({
        where: { tenantId, isActive: true },
      }),
    ]);

  const hasOpenAiKey = !!process.env.OPENAI_API_KEY;

  return JSON.parse(JSON.stringify({
    latestScore,
    scoreHistory,
    activeSuggestions,
    recentLogs,
    activePatterns,
    hasOpenAiKey,
  }));
}
