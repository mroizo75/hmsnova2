import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * Eksporterer anonymisert HMS-statistikk som JSON.
 * Egnet for forsikringsselskap og Arbeidstilsynet.
 * GET /api/hms-cockpit/stats-export?months=12
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId =
    (session as any).activeTenantId ?? user.tenants[0]?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Ingen bedrift valgt" }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const monthsBack = parseInt(searchParams.get("months") ?? "12", 10)

  const since = new Date()
  since.setMonth(since.getMonth() - monthsBack)

  const [stats, scores, tenant] = await Promise.all([
    prisma.anonymizedTenantStats.findMany({
      where: { tenantId, periodStart: { gte: since } },
      orderBy: { periodStart: "asc" },
    }),
    prisma.tenantHmsScore.findMany({
      where: { tenantId, scoreDate: { gte: since } },
      orderBy: { scoreDate: "asc" },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, orgNumber: true, industry: true },
    }),
  ])

  return NextResponse.json({
    tenant: {
      name: tenant?.name,
      orgNumber: tenant?.orgNumber,
      industry: tenant?.industry,
    },
    exportedAt: new Date().toISOString(),
    periodMonths: monthsBack,
    statistics: stats.map((s) => ({
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      employeeCount: s.employeeCount,
      incidentsTotal: s.incidentsTotal,
      incidentsByType: s.incidentsByType,
      incidentsBySeverity: s.incidentsBySeverity,
      avgClosureDays: s.avgClosureDays,
      trir: s.trir,
      ltir: s.ltir,
      inspectionsTotal: s.inspectionsTotal,
      findingsTotal: s.findingsTotal,
      findingsClosed: s.findingsClosed,
      trainingCompliance: s.trainingCompliance,
      measuresTotal: s.measuresTotal,
      measuresCompleted: s.measuresCompleted,
      measuresOverdue: s.measuresOverdue,
      chemicalsHighRisk: s.chemicalsHighRisk,
      hmsScore: s.hmsScore,
    })),
    scoreHistory: scores.map((s) => ({
      date: s.scoreDate,
      overall: s.overallScore,
      incident: s.incidentScore,
      routine: s.routineScore,
      inspection: s.inspectionScore,
      training: s.trainingScore,
      risk: s.riskScore,
      measure: s.measureScore,
      handbook: s.handbookScore,
      trend: s.trend,
    })),
  })
}
