import type {
  PatternType,
  SuggestionTarget,
  SuggestionStatus,
  ChangeType,
  ScoreTrend,
} from "@prisma/client"

export type { PatternType, SuggestionTarget, SuggestionStatus, ChangeType, ScoreTrend }

export interface DetectedPattern {
  patternType: PatternType
  patternKey: string
  matchCount: number
  severity: number
  linkedIncidentIds: string[]
  linkedFindingIds: string[]
  linkedRuhIds: string[]
  area: string | null
  description: string
}

export interface ScoreBreakdown {
  incidentScore: number
  routineScore: number
  inspectionScore: number
  trainingScore: number
  riskScore: number
  measureScore: number
  handbookScore: number
  overallScore: number
  trend: ScoreTrend
}

export interface ScoreContext {
  openIncidents: number
  overdueMeasures: number
  expiredTraining: number
  routinesNeedReview: number
  pendingSuggestions: number
}

export interface PatternRule {
  type: PatternType
  description: string
  threshold: number
  windowDays: number
  severityCalc: (count: number) => number
  legalBasis: string
}

export interface SuggestionTemplate {
  target: SuggestionTarget
  titleTemplate: string
  descriptionTemplate: string
  legalBasis: string
  targetSectionKey: string | null
}

export interface TenantStatsInput {
  tenantId: string
  periodStart: Date
  periodEnd: Date
}

export interface AnonStatsResult {
  employeeCount: number
  incidentsTotal: number
  incidentsByType: Record<string, number>
  incidentsBySeverity: Record<string, number>
  avgClosureDays: number | null
  trir: number | null
  ltir: number | null
  risksTotal: number
  risksHighCount: number
  inspectionsTotal: number
  findingsTotal: number
  findingsClosed: number
  avgFindingSeverity: number | null
  trainingCompliance: number | null
  trainingsExpired: number
  measuresTotal: number
  measuresCompleted: number
  measuresOverdue: number
  avgMeasureDays: number | null
  chemicalsTotal: number
  chemicalsHighRisk: number
  hmsScore: number | null
}
