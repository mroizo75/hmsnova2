import { prisma } from "@/lib/db"

/**
 * Bygger kompakt kontekst for HMS-rådgiver-chatten.
 * Henter kun pre-beregnet data, ikke rå-data.
 * Maksimalt ~2000 tokens kontekst for kostnadseffektivitet.
 */
export async function buildAdvisorContext(
  tenantId: string,
): Promise<string> {
  const [tenant, score, patterns, suggestions, stats, knowledge] =
    await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, industry: true },
      }),
      prisma.tenantHmsScore.findFirst({
        where: { tenantId },
        orderBy: { scoreDate: "desc" },
      }),
      prisma.patternCache.findMany({
        where: { tenantId, isActive: true },
        orderBy: { severity: "desc" },
        take: 5,
      }),
      prisma.improvementSuggestion.findMany({
        where: { tenantId, status: "PENDING" },
        orderBy: { priority: "desc" },
        take: 5,
      }),
      prisma.anonymizedTenantStats.findFirst({
        where: { tenantId },
        orderBy: { periodStart: "desc" },
      }),
      prisma.hmsKnowledgeEntry.findMany({
        where: { isActive: true },
        select: { lawReference: true, summary: true },
        take: 10,
      }),
    ])

  const parts: string[] = []

  parts.push(`Bedrift: ${tenant?.name ?? "Ukjent"} (Bransje: ${tenant?.industry ?? "Ukjent"})`)

  if (score) {
    parts.push(`\nHMS-score: ${score.overallScore}/100 (Trend: ${score.trend})`)
    parts.push(`Delscorer: Avvik=${score.incidentScore}, Rutiner=${score.routineScore}, Vernerunder=${score.inspectionScore}, Opplæring=${score.trainingScore}, Risiko=${score.riskScore}, Tiltak=${score.measureScore}, Håndbok=${score.handbookScore}`)
    parts.push(`Kontekst: ${score.openIncidents} åpne avvik, ${score.overdueMeasures} forfalte tiltak, ${score.expiredTraining} utgått opplæring, ${score.routinesNeedReview} rutiner trenger revisjon`)
  }

  if (stats) {
    parts.push(`\nStatistikk (siste 30d): ${stats.incidentsTotal} avvik, ${stats.inspectionsTotal} vernerunder, ${stats.measuresCompleted}/${stats.measuresTotal} tiltak fullført`)
    if (stats.trainingCompliance) parts.push(`Opplæringscompliance: ${stats.trainingCompliance}%`)
    if (stats.trir) parts.push(`TRIR: ${stats.trir}`)
  }

  if (patterns.length > 0) {
    parts.push(`\nAktive mønstre:`)
    for (const p of patterns) {
      parts.push(`- ${p.patternType}: ${p.matchCount} treff, alvorlighet ${p.severity}/5`)
    }
  }

  if (suggestions.length > 0) {
    parts.push(`\nVentende forbedringsforslag:`)
    for (const s of suggestions) {
      parts.push(`- ${s.title} (P${s.priority})`)
    }
  }

  if (knowledge.length > 0) {
    parts.push(`\nRelevant regelverk:`)
    for (const k of knowledge) {
      parts.push(`- ${k.lawReference}: ${k.summary}`)
    }
  }

  return parts.join("\n")
}
