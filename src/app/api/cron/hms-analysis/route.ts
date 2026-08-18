import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  onTrainingExpired,
  onRiskReviewOverdue,
  onChemicalSdsExpired,
  onFireDrillOverdue,
} from "@/features/hms-ai/lib/event-handler"

/**
 * Daglig CRON: trigger analyse for tidsbaserte HMS-mønstre.
 * Dekker detektorer som ikke trigges av enkelt-hendelser:
 * - TRAINING_GAP: utløpte sertifikater, manglende opplæring
 * - RISK_ESCALATION: risikorevisjoner passert reviewdato
 * - CHEMICAL_COMPLIANCE: utdaterte sikkerhetsdatablad
 * - FIRE_SAFETY_GAP: brannøvelse ikke gjennomført siste 12 mnd
 * - MANAGEMENT_REVIEW_OVERDUE: sjekkes av generell analyse
 *
 * GET /api/cron/hms-analysis?key=CRON_SECRET
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

  let processed = 0
  let errors = 0

  for (const tenant of tenants) {
    try {
      await Promise.all([
        onTrainingExpired(tenant.id),
        onRiskReviewOverdue(tenant.id),
        onChemicalSdsExpired(tenant.id),
        onFireDrillOverdue(tenant.id),
      ])
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
