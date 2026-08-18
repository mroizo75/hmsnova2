import { prisma } from "@/lib/db"
import type { DetectedPattern } from "../types"
import { PATTERN_RULES } from "./pattern-rules"

/**
 * Oppdager HMS-mønstre for én bedrift.
 * Kjører ren SQL – ingen ekstern API. ~50ms per tenant.
 */
export async function detectPatternsForTenant(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  const results = await Promise.all([
    detectRecurringIncidents(tenantId),
    detectInspectionTrends(tenantId),
    detectIneffectiveMeasures(tenantId),
    detectComplianceDrift(tenantId),
    detectTrainingGap(tenantId),
    detectRiskEscalation(tenantId),
    detectRuhTrend(tenantId),
    detectSjaCoverageGap(tenantId),
    detectChemicalCompliance(tenantId),
    detectFireSafetyGap(tenantId),
    detectManagementReviewOverdue(tenantId),
  ])

  for (const result of results) {
    patterns.push(...result)
  }

  return patterns
}

async function detectRecurringIncidents(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "RECURRING_INCIDENT")!
  const windowDate = daysAgo(rule.windowDays)

  const groups = await prisma.incident.groupBy({
    by: ["areaTag"],
    where: {
      tenantId,
      createdAt: { gte: windowDate },
      areaTag: { not: null },
    },
    _count: { id: true },
    having: {
      id: { _count: { gte: rule.threshold } },
    },
  })

  const patterns: DetectedPattern[] = []

  for (const group of groups) {
    if (!group.areaTag) continue

    const incidents = await prisma.incident.findMany({
      where: {
        tenantId,
        areaTag: group.areaTag,
        createdAt: { gte: windowDate },
      },
      select: { id: true },
    })

    const count = group._count.id
    patterns.push({
      patternType: "RECURRING_INCIDENT",
      patternKey: `RECURRING_INCIDENT:${group.areaTag}`,
      matchCount: count,
      severity: rule.severityCalc(count),
      linkedIncidentIds: incidents.map((i) => i.id),
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: group.areaTag,
      description: `${count} avvik relatert til «${group.areaTag}» de siste ${rule.windowDays} dagene`,
    })
  }

  const subcatGroups = await prisma.incident.groupBy({
    by: ["subcategoryKeys"],
    where: {
      tenantId,
      createdAt: { gte: windowDate },
      subcategoryKeys: { not: null },
      areaTag: null,
    },
    _count: { id: true },
    having: {
      id: { _count: { gte: rule.threshold } },
    },
  })

  for (const group of subcatGroups) {
    if (!group.subcategoryKeys) continue

    const incidents = await prisma.incident.findMany({
      where: {
        tenantId,
        subcategoryKeys: group.subcategoryKeys,
        areaTag: null,
        createdAt: { gte: windowDate },
      },
      select: { id: true },
    })

    const count = group._count.id
    const area = group.subcategoryKeys
    patterns.push({
      patternType: "RECURRING_INCIDENT",
      patternKey: `RECURRING_INCIDENT:subcat:${area}`,
      matchCount: count,
      severity: rule.severityCalc(count),
      linkedIncidentIds: incidents.map((i) => i.id),
      linkedFindingIds: [],
      linkedRuhIds: [],
      area,
      description: `${count} avvik med underkategori «${area}» de siste ${rule.windowDays} dagene`,
    })
  }

  return patterns
}

async function detectInspectionTrends(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "INSPECTION_TREND")!
  const windowDate = daysAgo(rule.windowDays)

  const findings = await prisma.inspectionFinding.findMany({
    where: {
      inspection: { tenantId, completedDate: { gte: windowDate } },
      status: "OPEN",
    },
    select: {
      id: true,
      location: true,
      inspectionId: true,
    },
  })

  const byLocation = new Map<string, { findingIds: string[]; inspectionIds: Set<string> }>()
  for (const f of findings) {
    const loc = f.location ?? "ukjent"
    const entry = byLocation.get(loc) ?? { findingIds: [], inspectionIds: new Set() }
    entry.findingIds.push(f.id)
    entry.inspectionIds.add(f.inspectionId)
    byLocation.set(loc, entry)
  }

  const patterns: DetectedPattern[] = []
  for (const [location, data] of byLocation) {
    if (data.inspectionIds.size < rule.threshold) continue

    patterns.push({
      patternType: "INSPECTION_TREND",
      patternKey: `INSPECTION_TREND:${location}`,
      matchCount: data.findingIds.length,
      severity: rule.severityCalc(data.inspectionIds.size),
      linkedIncidentIds: [],
      linkedFindingIds: data.findingIds,
      linkedRuhIds: [],
      area: location,
      description: `${data.findingIds.length} åpne funn på lokasjon «${location}» fra ${data.inspectionIds.size} inspeksjoner`,
    })
  }

  return patterns
}

async function detectIneffectiveMeasures(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "MEASURE_INEFFECTIVE")!
  const windowDate = daysAgo(rule.windowDays)

  const closedIncidentsWithMeasures = await prisma.incident.findMany({
    where: {
      tenantId,
      status: "CLOSED",
      areaTag: { not: null },
      measures: { some: { status: "DONE" } },
    },
    select: { id: true, areaTag: true, closedAt: true },
  })

  const patterns: DetectedPattern[] = []
  const processedAreas = new Set<string>()

  for (const closed of closedIncidentsWithMeasures) {
    if (!closed.areaTag || !closed.closedAt || processedAreas.has(closed.areaTag)) continue

    const reopened = await prisma.incident.findMany({
      where: {
        tenantId,
        areaTag: closed.areaTag,
        createdAt: { gte: closed.closedAt, lte: windowDate < closed.closedAt ? new Date() : windowDate },
        id: { not: closed.id },
      },
      select: { id: true },
    })

    if (reopened.length >= rule.threshold) {
      processedAreas.add(closed.areaTag)
      patterns.push({
        patternType: "MEASURE_INEFFECTIVE",
        patternKey: `MEASURE_INEFFECTIVE:${closed.areaTag}`,
        matchCount: reopened.length,
        severity: rule.severityCalc(reopened.length),
        linkedIncidentIds: [closed.id, ...reopened.map((r) => r.id)],
        linkedFindingIds: [],
        linkedRuhIds: [],
        area: closed.areaTag,
        description: `${reopened.length} nye avvik innen «${closed.areaTag}» etter at tiltak ble lukket`,
      })
    }
  }

  return patterns
}

async function detectComplianceDrift(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "COMPLIANCE_DRIFT")!
  const windowDate = daysAgo(rule.windowDays)

  const incidentsWithRoutine = await prisma.incident.findMany({
    where: {
      tenantId,
      relatedRoutineId: { not: null },
      createdAt: { gte: windowDate },
    },
    select: {
      id: true,
      relatedRoutineId: true,
      relatedRoutine: { select: { title: true } },
    },
  })

  const byRoutine = new Map<string, { ids: string[]; title: string }>()
  for (const inc of incidentsWithRoutine) {
    if (!inc.relatedRoutineId) continue
    const entry = byRoutine.get(inc.relatedRoutineId) ?? {
      ids: [],
      title: inc.relatedRoutine?.title ?? "Ukjent rutine",
    }
    entry.ids.push(inc.id)
    byRoutine.set(inc.relatedRoutineId, entry)
  }

  const patterns: DetectedPattern[] = []
  for (const [routineId, data] of byRoutine) {
    if (data.ids.length < rule.threshold) continue

    patterns.push({
      patternType: "COMPLIANCE_DRIFT",
      patternKey: `COMPLIANCE_DRIFT:${routineId}`,
      matchCount: data.ids.length,
      severity: rule.severityCalc(data.ids.length),
      linkedIncidentIds: data.ids,
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: data.title,
      description: `${data.ids.length} avvik relatert til rutine «${data.title}» de siste ${rule.windowDays} dagene`,
    })
  }

  return patterns
}

async function detectTrainingGap(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "TRAINING_GAP")!
  const now = new Date()

  const [missingRequired, expiredCerts] = await Promise.all([
    prisma.training.count({
      where: { tenantId, isRequired: true, completedAt: null },
    }),
    prisma.training.count({
      where: { tenantId, validUntil: { lt: now }, completedAt: { not: null } },
    }),
  ])

  const totalGap = missingRequired + expiredCerts
  if (totalGap < rule.threshold) return []

  const patterns: DetectedPattern[] = []
  if (missingRequired > 0) {
    patterns.push({
      patternType: "TRAINING_GAP",
      patternKey: `TRAINING_GAP:missing_required`,
      matchCount: missingRequired,
      severity: rule.severityCalc(missingRequired),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: "Påkrevd opplæring",
      description: `${missingRequired} ansatte mangler påkrevd opplæring`,
    })
  }

  if (expiredCerts > 0) {
    patterns.push({
      patternType: "TRAINING_GAP",
      patternKey: `TRAINING_GAP:expired_certs`,
      matchCount: expiredCerts,
      severity: rule.severityCalc(expiredCerts),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: "Utløpte sertifikater",
      description: `${expiredCerts} opplæringsbevis/sertifikater er utløpt`,
    })
  }

  return patterns
}

async function detectRiskEscalation(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "RISK_ESCALATION")!
  const now = new Date()

  const overdueReviews = await prisma.risk.findMany({
    where: {
      tenantId,
      status: "OPEN",
      nextReviewDate: { lt: now },
    },
    select: { id: true, title: true, score: true, nextReviewDate: true },
  })

  const patterns: DetectedPattern[] = []

  if (overdueReviews.length >= rule.threshold) {
    patterns.push({
      patternType: "RISK_ESCALATION",
      patternKey: `RISK_ESCALATION:overdue_review`,
      matchCount: overdueReviews.length,
      severity: rule.severityCalc(overdueReviews.length),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: "Risikorevisjoner",
      description: `${overdueReviews.length} risikoer har passert dato for neste gjennomgang`,
    })
  }

  const highRisks = await prisma.risk.findMany({
    where: {
      tenantId,
      status: "OPEN",
      score: { gte: 15 },
      residualScore: null,
    },
    select: { id: true },
  })

  if (highRisks.length >= rule.threshold) {
    patterns.push({
      patternType: "RISK_ESCALATION",
      patternKey: `RISK_ESCALATION:high_unmitigated`,
      matchCount: highRisks.length,
      severity: 5,
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: "Høye risikoer uten restrisiko",
      description: `${highRisks.length} høyrisikoer (score ≥ 15) uten beregnet restrisiko`,
    })
  }

  return patterns
}

async function detectRuhTrend(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "RUH_TREND")!
  const windowDate = daysAgo(rule.windowDays)

  const groups = await prisma.ruhReport.groupBy({
    by: ["category"],
    where: {
      tenantId,
      createdAt: { gte: windowDate },
    },
    _count: { id: true },
    having: {
      id: { _count: { gte: rule.threshold } },
    },
  })

  const patterns: DetectedPattern[] = []

  for (const group of groups) {
    const ruhs = await prisma.ruhReport.findMany({
      where: {
        tenantId,
        category: group.category,
        createdAt: { gte: windowDate },
      },
      select: { id: true },
    })

    const count = group._count.id
    patterns.push({
      patternType: "RUH_TREND",
      patternKey: `RUH_TREND:${group.category}`,
      matchCount: count,
      severity: rule.severityCalc(count),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: ruhs.map((r) => r.id),
      area: group.category,
      description: `${count} RUH-rapporter i kategori «${group.category}» de siste ${rule.windowDays} dagene`,
    })
  }

  // Også grupper på lokasjon
  const locationGroups = await prisma.ruhReport.groupBy({
    by: ["location"],
    where: {
      tenantId,
      createdAt: { gte: windowDate },
      location: { not: null },
    },
    _count: { id: true },
    having: {
      id: { _count: { gte: rule.threshold } },
    },
  })

  for (const group of locationGroups) {
    if (!group.location) continue

    const ruhs = await prisma.ruhReport.findMany({
      where: {
        tenantId,
        location: group.location,
        createdAt: { gte: windowDate },
      },
      select: { id: true },
    })

    const count = group._count.id
    patterns.push({
      patternType: "RUH_TREND",
      patternKey: `RUH_TREND:loc:${group.location}`,
      matchCount: count,
      severity: rule.severityCalc(count),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: ruhs.map((r) => r.id),
      area: group.location,
      description: `${count} RUH-rapporter på lokasjon «${group.location}» de siste ${rule.windowDays} dagene`,
    })
  }

  return patterns
}

async function detectSjaCoverageGap(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "SJA_COVERAGE_GAP")!

  const highRisks = await prisma.risk.findMany({
    where: {
      tenantId,
      status: "OPEN",
      score: { gte: 12 },
    },
    select: { id: true, title: true, area: true },
  })

  if (highRisks.length === 0) return []

  const activeSjaCount = await prisma.sjaAnalysis.count({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
  })

  // Enkel heuristikk: dersom antall høyrisikoer > antall SJA-er, finnes det gap
  const gap = highRisks.length - activeSjaCount
  if (gap < rule.threshold) return []

  return [
    {
      patternType: "SJA_COVERAGE_GAP",
      patternKey: `SJA_COVERAGE_GAP:high_risk_uncovered`,
      matchCount: gap,
      severity: rule.severityCalc(gap),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: "Høyrisiko uten SJA",
      description: `${gap} høyrisikoer (score ≥ 12) mangler muligens tilhørende SJA`,
    },
  ]
}

async function detectChemicalCompliance(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "CHEMICAL_COMPLIANCE")!
  const now = new Date()

  const [expiredSds, missingSds] = await Promise.all([
    prisma.chemical.count({
      where: {
        tenantId,
        status: "ACTIVE",
        nextReviewDate: { lt: now },
      },
    }),
    prisma.chemical.count({
      where: {
        tenantId,
        status: "ACTIVE",
        sdsKey: null,
      },
    }),
  ])

  const total = expiredSds + missingSds
  if (total < rule.threshold) return []

  const patterns: DetectedPattern[] = []

  if (expiredSds > 0) {
    patterns.push({
      patternType: "CHEMICAL_COMPLIANCE",
      patternKey: `CHEMICAL_COMPLIANCE:expired_sds`,
      matchCount: expiredSds,
      severity: rule.severityCalc(expiredSds),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: "Utdaterte sikkerhetsdatablad",
      description: `${expiredSds} kjemikalier har utdatert sikkerhetsdatablad (SDS)`,
    })
  }

  if (missingSds > 0) {
    patterns.push({
      patternType: "CHEMICAL_COMPLIANCE",
      patternKey: `CHEMICAL_COMPLIANCE:missing_sds`,
      matchCount: missingSds,
      severity: rule.severityCalc(missingSds + 1),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: "Manglende sikkerhetsdatablad",
      description: `${missingSds} aktive kjemikalier mangler sikkerhetsdatablad`,
    })
  }

  return patterns
}

async function detectFireSafetyGap(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "FIRE_SAFETY_GAP")!
  const oneYearAgo = daysAgo(rule.windowDays)

  const recentDrill = await prisma.fireDrill.findFirst({
    where: {
      tenantId,
      status: "COMPLETED",
      completedAt: { gte: oneYearAgo },
    },
    select: { id: true },
  })

  if (recentDrill) return []

  const anyDrillExists = await prisma.fireDrill.count({ where: { tenantId } })

  return [
    {
      patternType: "FIRE_SAFETY_GAP",
      patternKey: `FIRE_SAFETY_GAP:no_recent_drill`,
      matchCount: 1,
      severity: rule.severityCalc(1),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: "Brannøvelse",
      description: anyDrillExists > 0
        ? "Ingen brannøvelse gjennomført de siste 12 månedene"
        : "Ingen brannøvelse er registrert i systemet",
    },
  ]
}

async function detectManagementReviewOverdue(
  tenantId: string,
): Promise<DetectedPattern[]> {
  const rule = PATTERN_RULES.find((r) => r.type === "MANAGEMENT_REVIEW_OVERDUE")!

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { managementReviewFrequencyMonths: true },
  })
  if (!tenant) return []

  const thresholdDate = new Date()
  thresholdDate.setMonth(thresholdDate.getMonth() - tenant.managementReviewFrequencyMonths)

  const recentReview = await prisma.managementReview.findFirst({
    where: {
      tenantId,
      status: { in: ["COMPLETED", "APPROVED"] },
      reviewDate: { gte: thresholdDate },
    },
    select: { id: true },
  })

  if (recentReview) return []

  return [
    {
      patternType: "MANAGEMENT_REVIEW_OVERDUE",
      patternKey: `MANAGEMENT_REVIEW_OVERDUE:overdue`,
      matchCount: 1,
      severity: rule.severityCalc(1),
      linkedIncidentIds: [],
      linkedFindingIds: [],
      linkedRuhIds: [],
      area: "Ledelsens gjennomgang",
      description: `Ledelsens gjennomgang er ikke gjennomført de siste ${tenant.managementReviewFrequencyMonths} månedene`,
    },
  ]
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}
