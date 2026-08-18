import { prisma } from "@/lib/db"
import type { ScoreBreakdown, ScoreContext, ScoreTrend } from "../types"

// Vekting basert på IK-HMS § 5
const WEIGHTS = {
  incident: 0.2,
  routine: 0.2,
  risk: 0.15,
  inspection: 0.15,
  training: 0.15,
  measure: 0.1,
  handbook: 0.05,
} as const

/**
 * Beregner samlet HMS-score for én bedrift.
 * Ren matematikk mot DB – ~100ms per tenant.
 */
export async function calculateScoreForTenant(
  tenantId: string,
): Promise<{ score: ScoreBreakdown; context: ScoreContext }> {
  const [
    incidentData,
    routineData,
    inspectionData,
    trainingData,
    riskData,
    measureData,
    handbookData,
    suggestionCount,
  ] = await Promise.all([
    getIncidentMetrics(tenantId),
    getRoutineMetrics(tenantId),
    getInspectionMetrics(tenantId),
    getTrainingMetrics(tenantId),
    getRiskMetrics(tenantId),
    getMeasureMetrics(tenantId),
    getHandbookMetrics(tenantId),
    prisma.improvementSuggestion.count({
      where: { tenantId, status: "PENDING" },
    }),
  ])

  const incidentScore = calcIncidentScore(incidentData)
  const routineScore = calcRoutineScore(routineData)
  const inspectionScore = calcInspectionScore(inspectionData)
  const trainingScore = calcTrainingScore(trainingData)
  const riskScore = calcRiskScore(riskData)
  const measureScore = calcMeasureScore(measureData)
  const handbookScore = calcHandbookScore(handbookData)

  const overallScore = Math.round(
    incidentScore * WEIGHTS.incident +
      routineScore * WEIGHTS.routine +
      inspectionScore * WEIGHTS.inspection +
      trainingScore * WEIGHTS.training +
      riskScore * WEIGHTS.risk +
      measureScore * WEIGHTS.measure +
      handbookScore * WEIGHTS.handbook,
  )

  const trend = await calculateTrend(tenantId, overallScore)

  return {
    score: {
      incidentScore,
      routineScore,
      inspectionScore,
      trainingScore,
      riskScore,
      measureScore,
      handbookScore,
      overallScore,
      trend,
    },
    context: {
      openIncidents: incidentData.openCount,
      overdueMeasures: measureData.overdueCount,
      expiredTraining: trainingData.expiredCount,
      routinesNeedReview: routineData.needsReviewCount,
      pendingSuggestions: suggestionCount,
    },
  }
}

// --- Metrikk-innsamling ---

interface IncidentMetrics {
  openCount: number
  totalLast90: number
  avgClosureDays: number | null
  severeCount: number
  employeeCount: number
}

async function getIncidentMetrics(tenantId: string): Promise<IncidentMetrics> {
  const windowDate = daysAgo(90)

  const [openCount, totalLast90, severeCount, employees, closedIncidents] =
    await Promise.all([
      prisma.incident.count({
        where: { tenantId, status: { in: ["OPEN", "INVESTIGATING"] } },
      }),
      prisma.incident.count({
        where: { tenantId, createdAt: { gte: windowDate } },
      }),
      prisma.incident.count({
        where: { tenantId, createdAt: { gte: windowDate }, severity: { gte: 4 } },
      }),
      prisma.userTenant.count({ where: { tenantId } }),
      prisma.incident.findMany({
        where: {
          tenantId,
          status: "CLOSED",
          closedAt: { not: null },
          createdAt: { gte: windowDate },
        },
        select: { createdAt: true, closedAt: true },
      }),
    ])

  let avgClosureDays: number | null = null
  if (closedIncidents.length > 0) {
    const totalDays = closedIncidents.reduce((sum, i) => {
      const days =
        (i.closedAt!.getTime() - i.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      return sum + days
    }, 0)
    avgClosureDays = totalDays / closedIncidents.length
  }

  return {
    openCount,
    totalLast90,
    avgClosureDays,
    severeCount,
    employeeCount: employees || 1,
  }
}

interface RoutineMetrics {
  totalCount: number
  activeCount: number
  needsReviewCount: number
}

async function getRoutineMetrics(tenantId: string): Promise<RoutineMetrics> {
  const [totalCount, activeCount, needsReviewCount] = await Promise.all([
    prisma.routine.count({ where: { tenantId } }),
    prisma.routine.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.routine.count({
      where: {
        tenantId,
        OR: [
          { status: "NEEDS_REVIEW" },
          { nextReviewAt: { lte: new Date() } },
        ],
      },
    }),
  ])
  return { totalCount, activeCount, needsReviewCount }
}

interface InspectionMetrics {
  totalLast180: number
  findingsTotal: number
  findingsClosed: number
}

async function getInspectionMetrics(
  tenantId: string,
): Promise<InspectionMetrics> {
  const windowDate = daysAgo(180)
  const [totalLast180, findingsTotal, findingsClosed] = await Promise.all([
    prisma.inspection.count({
      where: {
        tenantId,
        status: "COMPLETED",
        completedDate: { gte: windowDate },
      },
    }),
    prisma.inspectionFinding.count({
      where: { inspection: { tenantId } },
    }),
    prisma.inspectionFinding.count({
      where: { inspection: { tenantId }, status: "CLOSED" },
    }),
  ])
  return { totalLast180, findingsTotal, findingsClosed }
}

interface TrainingMetrics {
  totalActive: number
  compliantCount: number
  expiredCount: number
}

async function getTrainingMetrics(tenantId: string): Promise<TrainingMetrics> {
  const [totalActive, expiredCount] = await Promise.all([
    prisma.training.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.training.count({
      where: { tenantId, status: "ACTIVE", validUntil: { lte: new Date() } },
    }),
  ])
  return {
    totalActive,
    compliantCount: totalActive - expiredCount,
    expiredCount,
  }
}

interface RiskMetrics {
  totalCount: number
  highRiskCount: number
  assessedLast365: number
}

async function getRiskMetrics(tenantId: string): Promise<RiskMetrics> {
  const windowDate = daysAgo(365)
  const [totalCount, highRiskCount, assessedLast365] = await Promise.all([
    prisma.risk.count({ where: { tenantId } }),
    prisma.risk.count({ where: { tenantId, riskScore: { gte: 15 } } }),
    prisma.riskAssessment.count({
      where: { tenantId, createdAt: { gte: windowDate } },
    }),
  ])
  return { totalCount, highRiskCount, assessedLast365 }
}

interface MeasureMetrics {
  totalCount: number
  completedCount: number
  overdueCount: number
  avgDaysToClose: number | null
}

async function getMeasureMetrics(tenantId: string): Promise<MeasureMetrics> {
  const [totalCount, completedCount, overdueCount, closedMeasures] =
    await Promise.all([
      prisma.measure.count({ where: { tenantId } }),
      prisma.measure.count({ where: { tenantId, status: "COMPLETED" } }),
      prisma.measure.count({
        where: { tenantId, status: { not: "COMPLETED" }, dueDate: { lte: new Date() } },
      }),
      prisma.measure.findMany({
        where: { tenantId, status: "COMPLETED", completedAt: { not: null } },
        select: { createdAt: true, completedAt: true },
        take: 100,
        orderBy: { completedAt: "desc" },
      }),
    ])

  let avgDaysToClose: number | null = null
  if (closedMeasures.length > 0) {
    const totalDays = closedMeasures.reduce((sum, m) => {
      const days =
        (m.completedAt!.getTime() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      return sum + days
    }, 0)
    avgDaysToClose = totalDays / closedMeasures.length
  }

  return { totalCount, completedCount, overdueCount, avgDaysToClose }
}

interface HandbookMetrics {
  exists: boolean
  lastReviewedAt: Date | null
  signatureCount: number
  employeeCount: number
}

async function getHandbookMetrics(tenantId: string): Promise<HandbookMetrics> {
  const [handbook, employeeCount] = await Promise.all([
    prisma.hmsHandbook.findUnique({
      where: { tenantId },
      select: {
        lastReviewedAt: true,
        _count: { select: { signatures: true } },
      },
    }),
    prisma.userTenant.count({ where: { tenantId } }),
  ])

  return {
    exists: !!handbook,
    lastReviewedAt: handbook?.lastReviewedAt ?? null,
    signatureCount: handbook?._count.signatures ?? 0,
    employeeCount,
  }
}

// --- Scoringsformler (0-100) ---

function calcIncidentScore(m: IncidentMetrics): number {
  let score = 100

  // Trekk for antall avvik per ansatt (normalisert)
  const ratePerEmployee = m.totalLast90 / m.employeeCount
  score -= Math.min(30, ratePerEmployee * 15)

  // Trekk for alvorlige hendelser
  score -= Math.min(25, m.severeCount * 10)

  // Trekk for treg lukking (> 14 dager snitt)
  if (m.avgClosureDays !== null && m.avgClosureDays > 14) {
    score -= Math.min(20, (m.avgClosureDays - 14) * 2)
  }

  // Trekk for åpne avvik
  score -= Math.min(15, m.openCount * 3)

  // Bonus: ingen avvik = 100
  if (m.totalLast90 === 0 && m.openCount === 0) score = 100

  return clamp(score)
}

function calcRoutineScore(m: RoutineMetrics): number {
  if (m.totalCount === 0) return 30

  let score = 100

  // Andel aktive rutiner
  const activeRate = m.activeCount / m.totalCount
  score = Math.round(activeRate * 70) + 30

  // Trekk for rutiner som trenger revisjon
  const reviewRate = m.needsReviewCount / m.totalCount
  score -= Math.min(30, Math.round(reviewRate * 40))

  return clamp(score)
}

function calcInspectionScore(m: InspectionMetrics): number {
  let score = 30

  // Bonus for gjennomførte vernerunder (≥ 2 per halvår = maks)
  score += Math.min(40, m.totalLast180 * 20)

  // Bonus for lukkede funn
  if (m.findingsTotal > 0) {
    const closureRate = m.findingsClosed / m.findingsTotal
    score += Math.round(closureRate * 30)
  } else if (m.totalLast180 > 0) {
    score += 30
  }

  return clamp(score)
}

function calcTrainingScore(m: TrainingMetrics): number {
  if (m.totalActive === 0) return 50

  const complianceRate = m.compliantCount / m.totalActive
  return clamp(Math.round(complianceRate * 100))
}

function calcRiskScore(m: RiskMetrics): number {
  let score = 30

  // Bonus for aktive risikovurderinger
  score += Math.min(40, m.assessedLast365 * 10)

  // Trekk for høye ubehandlede risikoer
  score -= Math.min(30, m.highRiskCount * 10)

  // Bonus for å ha risikoer registrert
  if (m.totalCount > 0) score += 10

  return clamp(score)
}

function calcMeasureScore(m: MeasureMetrics): number {
  if (m.totalCount === 0) return 50

  let score = 100

  // Fullføringsrate
  const completionRate = m.completedCount / m.totalCount
  score = Math.round(completionRate * 70)

  // Trekk for forfalte tiltak
  score -= Math.min(30, m.overdueCount * 5)

  // Trekk for treg gjennomføring (> 30 dager)
  if (m.avgDaysToClose !== null && m.avgDaysToClose > 30) {
    score -= Math.min(15, Math.round((m.avgDaysToClose - 30) / 5))
  }

  return clamp(score)
}

function calcHandbookScore(m: HandbookMetrics): number {
  if (!m.exists) return 0

  let score = 30

  // Bonus for gjennomgang siste 12 mnd
  if (m.lastReviewedAt) {
    const monthsSinceReview =
      (Date.now() - m.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsSinceReview <= 12) score += 40
    else if (monthsSinceReview <= 18) score += 20
  }

  // Bonus for signaturer
  if (m.employeeCount > 0) {
    const signRate = m.signatureCount / m.employeeCount
    score += Math.min(30, Math.round(signRate * 30))
  }

  return clamp(score)
}

async function calculateTrend(
  tenantId: string,
  currentScore: number,
): Promise<ScoreTrend> {
  const previousScore = await prisma.tenantHmsScore.findFirst({
    where: { tenantId },
    orderBy: { scoreDate: "desc" },
    select: { overallScore: true },
  })

  if (!previousScore) return "STABLE"

  const diff = currentScore - previousScore.overallScore
  if (diff >= 5) return "IMPROVING"
  if (diff <= -5) return "DECLINING"
  return "STABLE"
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}
