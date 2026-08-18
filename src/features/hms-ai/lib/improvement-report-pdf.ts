import { prisma } from "@/lib/db"
import { generateBrandedPdf, type PdfSection, type PdfReportConfig } from "@/lib/pdf-brand"

/**
 * Genererer PDF-rapport for Arbeidstilsynet.
 * Dokumenterer systematisk forbedringsarbeid iht. IK-HMS § 5 nr. 7–8.
 */
export async function generateImprovementReportPdf(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<Buffer> {
  const [tenant, logs, stats, scores] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, orgNumber: true, address: true, logoUrl: true },
    }),
    prisma.improvementLog.findMany({
      where: {
        tenantId,
        changedAt: { gte: periodStart, lte: periodEnd },
      },
      include: { suggestion: { include: { pattern: true } } },
      orderBy: { changedAt: "asc" },
    }),
    prisma.anonymizedTenantStats.findFirst({
      where: { tenantId, periodStart: { gte: periodStart } },
      orderBy: { periodStart: "desc" },
    }),
    prisma.tenantHmsScore.findMany({
      where: {
        tenantId,
        scoreDate: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { scoreDate: "asc" },
    }),
  ])

  const latestScore = scores.at(-1)
  const firstScore = scores.at(0)

  const sections: PdfSection[] = []

  // Sammendrag
  sections.push({
    title: "Sammendrag",
    legalRef: "IK-HMS § 5 nr. 7–8",
    content: [
      {
        type: "keyvalue",
        pairs: [
          ["Rapportperiode", `${formatDate(periodStart)} – ${formatDate(periodEnd)}`],
          ["HMS-score (start)", firstScore ? String(firstScore.overallScore) : "Ikke tilgjengelig"],
          ["HMS-score (slutt)", latestScore ? String(latestScore.overallScore) : "Ikke tilgjengelig"],
          ["Trend", latestScore?.trend === "IMPROVING" ? "↑ Forbedring" : latestScore?.trend === "DECLINING" ? "↓ Nedgang" : "→ Stabil"],
          ["Antall gjennomførte forbedringer", String(logs.length)],
          ["Antall avvik i perioden", stats ? String(stats.incidentsTotal) : "Ikke beregnet"],
        ],
      },
    ],
  })

  // Nøkkeltall
  if (stats) {
    sections.push({
      title: "HMS-nøkkeltall",
      legalRef: "AML § 5-1",
      content: [
        {
          type: "table",
          headers: ["Indikator", "Verdi"],
          rows: [
            ["Ansatte", stats.employeeCount],
            ["Totalt avvik", stats.incidentsTotal],
            ["Snitt lukketid avvik (dager)", stats.avgClosureDays ?? "–"],
            ["TRIR", stats.trir ?? "–"],
            ["LTIR", stats.ltir ?? "–"],
            ["Vernerunder", stats.inspectionsTotal],
            ["Funn lukket", stats.findingsClosed],
            ["Tiltak fullført", stats.measuresCompleted],
            ["Tiltak forfalt", stats.measuresOverdue],
            ["Opplæringscompliance (%)", stats.trainingCompliance ?? "–"],
            ["Kjemikalier (høy risiko)", stats.chemicalsHighRisk],
          ],
        },
      ],
    })
  }

  // Delscorer
  if (latestScore) {
    sections.push({
      title: "HMS-delscorer",
      legalRef: "IK-HMS § 5",
      content: [
        {
          type: "table",
          headers: ["Område", "Score (0-100)"],
          rows: [
            ["Avviksbehandling", latestScore.incidentScore],
            ["Rutiner", latestScore.routineScore],
            ["Vernerunder", latestScore.inspectionScore],
            ["Opplæring", latestScore.trainingScore],
            ["Risikovurdering", latestScore.riskScore],
            ["Tiltak", latestScore.measureScore],
            ["HMS-håndbok", latestScore.handbookScore],
            ["Samlet score", latestScore.overallScore],
          ],
        },
      ],
    })
  }

  // Forbedringshistorikk
  if (logs.length > 0) {
    sections.push({
      title: "Gjennomførte forbedringer",
      legalRef: "IK-HMS § 5 nr. 7",
      content: [
        {
          type: "table",
          headers: ["Dato", "Type", "Beskrivelse", "Hjemmel", "Effekt vurdert"],
          rows: logs.map((log) => [
            formatDate(log.changedAt),
            formatChangeType(log.changeType),
            log.description,
            log.legalReference ?? "–",
            log.effectReviewed ? "Ja" : "Nei",
          ]),
        },
      ],
    })

    const withEffect = logs.filter((l) => l.effectReviewed && l.effectNote)
    if (withEffect.length > 0) {
      sections.push({
        title: "Effektvurderinger",
        legalRef: "IK-HMS § 5 nr. 8",
        content: withEffect.map((log) => ({
          type: "paragraph" as const,
          text: `${formatDate(log.changedAt)}: ${log.effectNote}`,
        })),
      })
    }
  }

  const config: PdfReportConfig = {
    type: "formal",
    title: "Forbedringsrapport – Systematisk HMS-arbeid",
    subtitle: `${formatDate(periodStart)} – ${formatDate(periodEnd)}`,
    reportLabel: "Forbedringsrapport",
    tenant: {
      name: tenant.name,
      orgNumber: tenant.orgNumber,
      address: tenant.address,
      logoUrl: tenant.logoUrl,
    },
    generatedAt: new Date(),
    legalReference: "IK-HMS § 5 nr. 7–8: Systematisk overvåking og gjennomgang",
    sections,
    coverPage: true,
  }

  return generateBrandedPdf(config)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatChangeType(type: string): string {
  const map: Record<string, string> = {
    ROUTINE_UPDATED: "Rutine oppdatert",
    ROUTINE_CREATED: "Ny rutine",
    TRAINING_ADDED: "Opplæring lagt til",
    RISK_REASSESSED: "Risiko revurdert",
    SJA_UPDATED: "SJA oppdatert",
    INSPECTION_SCHEDULED: "Inspeksjon planlagt",
    HANDBOOK_REVIEWED: "Håndbok gjennomgått",
    MEASURE_ADDED: "Tiltak lagt til",
  }
  return map[type] ?? type
}
