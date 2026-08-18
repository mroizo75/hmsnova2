import { prisma } from "@/lib/db"
import type { AnonStatsResult, TenantStatsInput } from "../types"

/**
 * Samler anonymisert statistikk for én bedrift i en gitt periode.
 * Aldri personnavn, personnummer eller sensitiv info – kun aggregerte tall.
 */
export async function collectAnonymizedStats(
  input: TenantStatsInput,
): Promise<AnonStatsResult> {
  const { tenantId, periodStart, periodEnd } = input

  const [
    employees,
    incidents,
    closedIncidents,
    risks,
    inspections,
    findings,
    findingsClosed,
    trainings,
    trainingsExpired,
    measures,
    measuresCompleted,
    measuresOverdue,
    chemicals,
    chemicalsHighRisk,
    latestScore,
  ] = await Promise.all([
    prisma.userTenant.count({ where: { tenantId } }),
    prisma.incident.findMany({
      where: { tenantId, createdAt: { gte: periodStart, lte: periodEnd } },
      select: { type: true, severity: true, createdAt: true, closedAt: true, status: true },
    }),
    prisma.incident.findMany({
      where: {
        tenantId,
        status: "CLOSED",
        closedAt: { gte: periodStart, lte: periodEnd },
      },
      select: { createdAt: true, closedAt: true, isLostTimeIncident: true, isFatal: true },
    }),
    prisma.risk.count({ where: { tenantId } }),
    prisma.inspection.count({
      where: {
        tenantId,
        status: "COMPLETED",
        completedDate: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.inspectionFinding.count({
      where: {
        inspection: {
          tenantId,
          completedDate: { gte: periodStart, lte: periodEnd },
        },
      },
    }),
    prisma.inspectionFinding.count({
      where: {
        inspection: {
          tenantId,
          completedDate: { gte: periodStart, lte: periodEnd },
        },
        status: "CLOSED",
      },
    }),
    prisma.training.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.training.count({
      where: { tenantId, status: "ACTIVE", validUntil: { lte: new Date() } },
    }),
    prisma.measure.count({
      where: { tenantId, createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.measure.count({
      where: {
        tenantId,
        status: "COMPLETED",
        completedAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.measure.count({
      where: {
        tenantId,
        status: { not: "COMPLETED" },
        dueDate: { lte: new Date() },
      },
    }),
    prisma.chemical.count({ where: { tenantId } }),
    prisma.chemical.count({
      where: { tenantId, hazardLevel: { gte: 4 } },
    }),
    prisma.tenantHmsScore.findFirst({
      where: { tenantId },
      orderBy: { scoreDate: "desc" },
      select: { overallScore: true },
    }),
  ])

  // Aggreger avvik per type
  const incidentsByType: Record<string, number> = {}
  const incidentsBySeverity: Record<string, number> = {}
  for (const inc of incidents) {
    incidentsByType[inc.type] = (incidentsByType[inc.type] ?? 0) + 1
    const sev = String(inc.severity ?? 0)
    incidentsBySeverity[sev] = (incidentsBySeverity[sev] ?? 0) + 1
  }

  // Beregn snitt lukketid
  let avgClosureDays: number | null = null
  if (closedIncidents.length > 0) {
    const totalDays = closedIncidents.reduce((sum, i) => {
      if (!i.closedAt) return sum
      return sum + (i.closedAt.getTime() - i.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    }, 0)
    avgClosureDays = Math.round((totalDays / closedIncidents.length) * 10) / 10
  }

  // TRIR og LTIR (estimert basert på 200.000 arbeidstimer)
  const estimatedHours = employees * 1750 // ~1750 timer/ansatt/år
  const recordableIncidents = closedIncidents.filter(
    (i) => i.isLostTimeIncident || i.isFatal,
  ).length
  const lostTimeIncidents = closedIncidents.filter((i) => i.isLostTimeIncident).length

  const trir =
    estimatedHours > 0
      ? Math.round((recordableIncidents / estimatedHours) * 200000 * 100) / 100
      : null
  const ltir =
    estimatedHours > 0
      ? Math.round((lostTimeIncidents / estimatedHours) * 200000 * 100) / 100
      : null

  // Opplæringscompliance
  const trainingCompliance =
    trainings > 0
      ? Math.round(((trainings - trainingsExpired) / trainings) * 100 * 10) / 10
      : null

  // Snitt dager til tiltak lukket
  let avgMeasureDays: number | null = null
  const completedMeasures = await prisma.measure.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      completedAt: { gte: periodStart, lte: periodEnd },
    },
    select: { createdAt: true, completedAt: true },
    take: 200,
  })
  if (completedMeasures.length > 0) {
    const total = completedMeasures.reduce((sum, m) => {
      if (!m.completedAt) return sum
      return sum + (m.completedAt.getTime() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    }, 0)
    avgMeasureDays = Math.round((total / completedMeasures.length) * 10) / 10
  }

  return {
    employeeCount: employees,
    incidentsTotal: incidents.length,
    incidentsByType,
    incidentsBySeverity,
    avgClosureDays,
    trir,
    ltir,
    risksTotal: risks,
    risksHighCount: await prisma.risk.count({
      where: { tenantId, riskScore: { gte: 15 } },
    }),
    inspectionsTotal: inspections,
    findingsTotal: findings,
    findingsClosed,
    avgFindingSeverity: null,
    trainingCompliance,
    trainingsExpired,
    measuresTotal: measures,
    measuresCompleted,
    measuresOverdue,
    avgMeasureDays,
    chemicalsTotal: chemicals,
    chemicalsHighRisk,
    hmsScore: latestScore?.overallScore ?? null,
  }
}

/**
 * Lagrer anonymisert statistikk for én bedrift (upsert).
 */
export async function saveAnonymizedStats(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
  stats: AnonStatsResult,
): Promise<void> {
  await prisma.anonymizedTenantStats.upsert({
    where: {
      tenantId_periodStart: { tenantId, periodStart },
    },
    create: {
      tenantId,
      periodStart,
      periodEnd,
      ...stats,
    },
    update: {
      periodEnd,
      ...stats,
    },
  })
}
