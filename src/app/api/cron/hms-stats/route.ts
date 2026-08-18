import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  collectAnonymizedStats,
  saveAnonymizedStats,
} from "@/features/hms-ai/lib/stats-collector"

/**
 * Daglig cron: samle anonymisert statistikk for alle aktive tenants.
 * GET /api/cron/hms-stats?key=CRON_SECRET
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")

  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenants = await prisma.tenant.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    select: { id: true },
  })

  // Periode: siste 30 dager
  const periodEnd = new Date()
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - 30)
  periodStart.setHours(0, 0, 0, 0)
  periodEnd.setHours(23, 59, 59, 999)

  let processed = 0
  let errors = 0

  for (const tenant of tenants) {
    try {
      const stats = await collectAnonymizedStats({
        tenantId: tenant.id,
        periodStart,
        periodEnd,
      })

      await saveAnonymizedStats(tenant.id, periodStart, periodEnd, stats)
      processed++
    } catch {
      errors++
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    errors,
    total: tenants.length,
  })
}
