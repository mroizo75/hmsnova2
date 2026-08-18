"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/server-authorization"

export async function acceptSuggestion(suggestionId: string) {
  const context = await requirePermission("canUpdateSettings")

  const suggestion = await prisma.improvementSuggestion.findFirst({
    where: { id: suggestionId, tenantId: context.tenantId },
  })

  if (!suggestion) {
    return { success: false, error: "Forslag ikke funnet" }
  }

  const updated = await prisma.improvementSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "ACCEPTED",
      decidedById: context.userId,
      decidedAt: new Date(),
    },
  })

  revalidatePath("/dashboard/hms-cockpit")
  return { success: true, data: updated }
}

export async function rejectSuggestion(
  suggestionId: string,
  note: string,
) {
  const context = await requirePermission("canUpdateSettings")

  const suggestion = await prisma.improvementSuggestion.findFirst({
    where: { id: suggestionId, tenantId: context.tenantId },
  })

  if (!suggestion) {
    return { success: false, error: "Forslag ikke funnet" }
  }

  const updated = await prisma.improvementSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "REJECTED",
      decidedById: context.userId,
      decidedAt: new Date(),
      decisionNote: note,
    },
  })

  revalidatePath("/dashboard/hms-cockpit")
  return { success: true, data: updated }
}

export async function markSuggestionImplemented(
  suggestionId: string,
  input: {
    description: string
    legalReference?: string
    routineId?: string
    beforeSnapshot?: Record<string, unknown>
    afterSnapshot?: Record<string, unknown>
  },
) {
  const context = await requirePermission("canUpdateSettings")

  const suggestion = await prisma.improvementSuggestion.findFirst({
    where: { id: suggestionId, tenantId: context.tenantId },
    include: { pattern: true },
  })

  if (!suggestion) {
    return { success: false, error: "Forslag ikke funnet" }
  }

  // Oppdater forslaget
  await prisma.improvementSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "IMPLEMENTED",
      implementedAt: new Date(),
    },
  })

  // Opprett forbedringslogg for Arbeidstilsynet
  const changeType = mapSuggestionToChangeType(suggestion.suggestionType)
  const followUpDate = new Date()
  followUpDate.setDate(followUpDate.getDate() + 90)

  const log = await prisma.improvementLog.create({
    data: {
      tenantId: context.tenantId,
      changeType,
      description: input.description,
      legalReference: input.legalReference ?? suggestion.legalBasis,
      suggestionId,
      routineId: input.routineId ?? suggestion.targetRoutineId,
      incidentIds: suggestion.pattern.linkedIncidentIds,
      beforeSnapshot: input.beforeSnapshot ?? undefined,
      afterSnapshot: input.afterSnapshot ?? undefined,
      changedById: context.userId,
      followUpDate,
    },
  })

  // Marker mønsteret som løst
  await prisma.patternCache.update({
    where: { id: suggestion.patternCacheId },
    data: { isActive: false, resolvedAt: new Date() },
  })

  revalidatePath("/dashboard/hms-cockpit")
  return { success: true, data: log }
}

export async function reviewEffectiveness(
  logId: string,
  input: { effectNote: string },
) {
  const context = await requirePermission("canUpdateSettings")

  const log = await prisma.improvementLog.findFirst({
    where: { id: logId, tenantId: context.tenantId },
  })

  if (!log) {
    return { success: false, error: "Loggoppføring ikke funnet" }
  }

  const updated = await prisma.improvementLog.update({
    where: { id: logId },
    data: {
      effectReviewed: true,
      effectNote: input.effectNote,
    },
  })

  revalidatePath("/dashboard/hms-cockpit")
  return { success: true, data: updated }
}

function mapSuggestionToChangeType(
  target: string,
): "ROUTINE_UPDATED" | "ROUTINE_CREATED" | "TRAINING_ADDED" | "RISK_REASSESSED" | "SJA_UPDATED" | "INSPECTION_SCHEDULED" | "HANDBOOK_REVIEWED" | "MEASURE_ADDED" {
  const map: Record<string, string> = {
    UPDATE_ROUTINE: "ROUTINE_UPDATED",
    CREATE_ROUTINE: "ROUTINE_CREATED",
    ADD_TRAINING: "TRAINING_ADDED",
    ADD_RISK_ASSESSMENT: "RISK_REASSESSED",
    UPDATE_SJA_TEMPLATE: "SJA_UPDATED",
    SCHEDULE_INSPECTION: "INSPECTION_SCHEDULED",
    UPDATE_HANDBOOK: "HANDBOOK_REVIEWED",
  }
  return (map[target] ?? "MEASURE_ADDED") as ReturnType<typeof mapSuggestionToChangeType>
}
