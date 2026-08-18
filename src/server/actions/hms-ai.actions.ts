"use server"

import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/server-authorization"
import { calculateScoreForTenant } from "@/features/hms-ai/lib/score-calculator"

export async function getHmsCockpitData() {
  const context = await requirePermission("canReadDocuments")
  const { tenantId } = context

  const [latestScore, scoreHistory, activeSuggestions, recentLogs, activePatterns] =
    await Promise.all([
      prisma.tenantHmsScore.findFirst({
        where: { tenantId },
        orderBy: { scoreDate: "desc" },
      }),
      prisma.tenantHmsScore.findMany({
        where: { tenantId },
        orderBy: { scoreDate: "desc" },
        take: 180,
      }),
      prisma.improvementSuggestion.findMany({
        where: { tenantId, status: { in: ["PENDING", "ACCEPTED"] } },
        include: { pattern: true },
        orderBy: { priority: "desc" },
      }),
      prisma.improvementLog.findMany({
        where: { tenantId },
        orderBy: { changedAt: "desc" },
        take: 20,
      }),
      prisma.patternCache.findMany({
        where: { tenantId, isActive: true },
        orderBy: { severity: "desc" },
      }),
    ])

  return {
    success: true,
    data: {
      latestScore,
      scoreHistory: scoreHistory.reverse(),
      activeSuggestions,
      recentLogs,
      activePatterns,
    },
  }
}

export async function recalculateScoreNow() {
  const context = await requirePermission("canUpdateSettings")
  const { tenantId } = context

  const { score, context: ctx } = await calculateScoreForTenant(tenantId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const saved = await prisma.tenantHmsScore.upsert({
    where: { tenantId_scoreDate: { tenantId, scoreDate: today } },
    create: { tenantId, scoreDate: today, ...score, ...ctx },
    update: { ...score, ...ctx },
  })

  return { success: true, data: saved }
}

export async function getImprovementSuggestions() {
  const context = await requirePermission("canReadDocuments")

  return prisma.improvementSuggestion.findMany({
    where: { tenantId: context.tenantId },
    include: { pattern: true },
    orderBy: [{ status: "asc" }, { priority: "desc" }],
  })
}

export async function getImprovementTimeline() {
  const context = await requirePermission("canReadDocuments")

  return prisma.improvementLog.findMany({
    where: { tenantId: context.tenantId },
    orderBy: { changedAt: "desc" },
    take: 50,
  })
}

export async function getAnonymizedStats(periodStart?: Date) {
  const context = await requirePermission("canReadDocuments")

  const where: Record<string, unknown> = { tenantId: context.tenantId }
  if (periodStart) where.periodStart = { gte: periodStart }

  return prisma.anonymizedTenantStats.findMany({
    where,
    orderBy: { periodStart: "desc" },
    take: 12,
  })
}
