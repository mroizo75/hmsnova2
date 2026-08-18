import { prisma } from "@/lib/db"

/**
 * Søk i lovkunnskapsbasen etter relevante lover/forskrifter
 * for et gitt område eller mønstertype.
 */
export async function searchKnowledge(params: {
  area?: string
  patternType?: string
  industry?: string
}): Promise<KnowledgeResult[]> {
  const entries = await prisma.hmsKnowledgeEntry.findMany({
    where: { isActive: true },
    orderBy: { category: "asc" },
  })

  const results: KnowledgeResult[] = []
  for (const entry of entries) {
    const areas = entry.applicableAreas as string[]
    const industries = entry.industry as string[]
    const triggers = entry.triggerPatterns as string[]

    let relevanceScore = 0

    if (params.area && areas.includes(params.area)) relevanceScore += 3
    if (params.patternType && triggers.includes(params.patternType)) relevanceScore += 5
    if (params.industry && (industries.includes(params.industry) || industries.includes("alle")))
      relevanceScore += 1

    if (relevanceScore > 0) {
      results.push({
        id: entry.id,
        lawReference: entry.lawReference,
        title: entry.title,
        summary: entry.summary,
        content: entry.content,
        category: entry.category,
        sourceUrl: entry.sourceUrl,
        relevanceScore,
      })
    }
  }

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
}

/**
 * Hent lovhenvisning for en gitt mønstertype.
 */
export async function getLegalBasisForPattern(
  patternType: string,
): Promise<string | null> {
  const entries = await prisma.hmsKnowledgeEntry.findMany({
    where: { isActive: true },
  })

  for (const entry of entries) {
    const triggers = entry.triggerPatterns as string[]
    if (triggers.includes(patternType)) {
      return `${entry.lawReference}: ${entry.summary}`
    }
  }

  return null
}

export interface KnowledgeResult {
  id: string
  lawReference: string
  title: string
  summary: string
  content: string
  category: string
  sourceUrl: string | null
  relevanceScore: number
}
