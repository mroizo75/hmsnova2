import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { calculateScoreForTenant } from "@/features/hms-ai/lib/score-calculator"

/**
 * Daglig cron: beregn HMS-score for alle aktive tenants.
 * Kjøres via Vercel Cron eller ekstern scheduler.
 * GET /api/cron/hms-score?key=CRON_SECRET
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let processed = 0
  let errors = 0

  for (const tenant of tenants) {
    try {
      const { score, context } = await calculateScoreForTenant(tenant.id)

      await prisma.tenantHmsScore.upsert({
        where: {
          tenantId_scoreDate: { tenantId: tenant.id, scoreDate: today },
        },
        create: {
          tenantId: tenant.id,
          scoreDate: today,
          ...score,
          ...context,
        },
        update: {
          ...score,
          ...context,
        },
      })

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
