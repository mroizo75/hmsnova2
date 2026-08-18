import { prisma } from "@/lib/db"
import { detectPatternsForTenant } from "./pattern-detector"
import { calculateScoreForTenant } from "./score-calculator"
import { SUGGESTION_TEMPLATES, renderTemplate } from "./suggestion-templates"
import { getRuleForType } from "./pattern-rules"
import { notifyUsersByRoles } from "@/server/actions/notification.actions"
import type { DetectedPattern } from "../types"

/**
 * Event-handler for HMS Intelligens-motoren.
 * Kalles ETTER at en hendelse er opprettet/oppdatert.
 * Kjører kun for den aktuelle bedriften (~150ms totalt).
 */

export async function onIncidentCreated(
  tenantId: string,
  _incidentId: string,
): Promise<void> {
  await runAnalysis(tenantId)
}

export async function onIncidentClosed(
  tenantId: string,
  _incidentId: string,
): Promise<void> {
  await recalculateScore(tenantId)
}

export async function onRuhCreated(
  tenantId: string,
  _ruhId: string,
): Promise<void> {
  await runAnalysis(tenantId)
}

export async function onFindingCreated(
  tenantId: string,
  _findingId: string,
): Promise<void> {
  await runAnalysis(tenantId)
}

export async function onRoutineUpdated(
  tenantId: string,
  _routineId: string,
): Promise<void> {
  await recalculateScore(tenantId)
}

export async function onMeasureClosed(
  tenantId: string,
  _measureId: string,
): Promise<void> {
  await runAnalysis(tenantId)
}

export async function onTrainingExpired(
  tenantId: string,
): Promise<void> {
  await runAnalysis(tenantId)
}

export async function onRiskReviewOverdue(
  tenantId: string,
): Promise<void> {
  await runAnalysis(tenantId)
}

export async function onChemicalSdsExpired(
  tenantId: string,
): Promise<void> {
  await runAnalysis(tenantId)
}

export async function onFireDrillOverdue(
  tenantId: string,
): Promise<void> {
  await runAnalysis(tenantId)
}

/**
 * Full analyse: mønstergjenkjenning + score-oppdatering.
 */
async function runAnalysis(tenantId: string): Promise<void> {
  try {
    const patterns = await detectPatternsForTenant(tenantId)
    await upsertPatternCache(tenantId, patterns)
    await generateSuggestionsForNewPatterns(tenantId, patterns)
    await recalculateScore(tenantId)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[HMS-AI] Analyse feilet for tenant:", tenantId, error)
    }
  }
}

async function upsertPatternCache(
  tenantId: string,
  patterns: DetectedPattern[],
): Promise<void> {
  for (const pattern of patterns) {
    await prisma.patternCache.upsert({
      where: {
        tenantId_patternKey: {
          tenantId,
          patternKey: pattern.patternKey,
        },
      },
      create: {
        tenantId,
        patternType: pattern.patternType,
        patternKey: pattern.patternKey,
        matchCount: pattern.matchCount,
        firstSeen: new Date(),
        lastSeen: new Date(),
        severity: pattern.severity,
        linkedIncidentIds: pattern.linkedIncidentIds,
        linkedFindingIds: pattern.linkedFindingIds,
        linkedRuhIds: pattern.linkedRuhIds,
        isActive: true,
      },
      update: {
        matchCount: pattern.matchCount,
        lastSeen: new Date(),
        severity: pattern.severity,
        linkedIncidentIds: pattern.linkedIncidentIds,
        linkedFindingIds: pattern.linkedFindingIds,
        linkedRuhIds: pattern.linkedRuhIds,
      },
    })
  }

  const activeKeys = patterns.map((p) => p.patternKey)
  if (activeKeys.length > 0) {
    await prisma.patternCache.updateMany({
      where: {
        tenantId,
        isActive: true,
        patternKey: { notIn: activeKeys },
      },
      data: { isActive: false, resolvedAt: new Date() },
    })
  }
}

async function generateSuggestionsForNewPatterns(
  tenantId: string,
  patterns: DetectedPattern[],
): Promise<void> {
  for (const pattern of patterns) {
    const cached = await prisma.patternCache.findUnique({
      where: {
        tenantId_patternKey: { tenantId, patternKey: pattern.patternKey },
      },
    })
    if (!cached) continue

    const existingSuggestion = await prisma.improvementSuggestion.findFirst({
      where: {
        patternCacheId: cached.id,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    })
    if (existingSuggestion) continue

    const templates = SUGGESTION_TEMPLATES[pattern.patternType]
    if (!templates || templates.length === 0) continue

    const template = templates[0]
    const rule = getRuleForType(pattern.patternType)

    const vars: Record<string, string | number> = {
      area: pattern.area ?? "ukjent område",
      count: pattern.matchCount,
      days: rule?.windowDays ?? 90,
      routineTitle: pattern.area ?? "Relevant rutine",
    }

    const suggestion = await prisma.improvementSuggestion.create({
      data: {
        tenantId,
        patternCacheId: cached.id,
        suggestionType: template.target,
        title: renderTemplate(template.titleTemplate, vars),
        description: renderTemplate(template.descriptionTemplate, vars),
        legalBasis: template.legalBasis,
        targetSectionKey: template.targetSectionKey,
        priority: pattern.severity,
        status: "PENDING",
      },
    })

    notifyUsersByRoles(tenantId, ["ADMIN", "HMS"], {
      type: "IMPROVEMENT_SUGGESTION",
      title: suggestion.title,
      message: `HMS-motoren har oppdaget et mønster: ${pattern.description}`,
      link: "/dashboard/hms-cockpit",
    }).catch(() => {})
  }
}

async function recalculateScore(tenantId: string): Promise<void> {
  try {
    const previousScore = await prisma.tenantHmsScore.findFirst({
      where: { tenantId },
      orderBy: { scoreDate: "desc" },
      select: { overallScore: true },
    })

    const { score, context } = await calculateScoreForTenant(tenantId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.tenantHmsScore.upsert({
      where: {
        tenantId_scoreDate: { tenantId, scoreDate: today },
      },
      create: {
        tenantId,
        scoreDate: today,
        ...score,
        ...context,
      },
      update: {
        ...score,
        ...context,
      },
    })

    if (previousScore) {
      const diff = score.overallScore - previousScore.overallScore
      if (diff <= -10) {
        notifyUsersByRoles(tenantId, ["ADMIN", "HMS"], {
          type: "HMS_SCORE_DROP",
          title: "HMS-scoren har falt",
          message: `HMS-scoren har falt fra ${previousScore.overallScore} til ${score.overallScore}`,
          link: "/dashboard/hms-cockpit",
        }).catch(() => {})
      } else if (
        previousScore.overallScore < 80 &&
        score.overallScore >= 80
      ) {
        notifyUsersByRoles(tenantId, ["ADMIN", "HMS"], {
          type: "HMS_SCORE_MILESTONE",
          title: "HMS-scoren har passert 80!",
          message: `Gratulerer! HMS-scoren er nå ${score.overallScore}/100`,
          link: "/dashboard/hms-cockpit",
        }).catch(() => {})
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[HMS-AI] Score-beregning feilet:", tenantId, error)
    }
  }
}
