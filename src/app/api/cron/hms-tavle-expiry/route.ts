import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";

/**
 * Cron-jobb for HMS Tavle-abonnementovervåking.
 * Kjøres daglig kl. 07:00 (Vercel: "0 7 * * *")
 *
 * Oppgaver:
 * 1. Oppdater status til EXPIRING_SOON for abonnement som utløper om ≤ 30 dager
 * 2. Deaktiver (EXPIRED) abonnement som har passert endsAt
 * 3. Logg varsler for dag 30, 14 og 7 (e-post integreres ved behov)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const unauthorizedResponse = validateCronRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  const now = new Date();
  const results = {
    expiredNow: 0,
    markedExpiringSoon: 0,
    emailsLogged: 0,
  };

  try {
    // 1. Deaktiver utløpte abonnement
    const justExpired = await prisma.hmsTavleSubscription.updateMany({
      where: {
        status: { in: ["ACTIVE", "EXPIRING_SOON"] },
        endsAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
    results.expiredNow = justExpired.count;

    // 2. Marker abonnement som utløper innen 30 dager
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const markedExpiringSoon = await prisma.hmsTavleSubscription.updateMany({
      where: {
        status: "ACTIVE",
        endsAt: { lte: thirtyDaysFromNow, gt: now },
      },
      data: { status: "EXPIRING_SOON" },
    });
    results.markedExpiringSoon = markedExpiringSoon.count;

    // 3. Finn abonnement som utløper på dag 30, 14 og 7
    const warningDays = [30, 14, 7];
    for (const daysLeft of warningDays) {
      const target = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);
      const dayStart = new Date(target);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(target);
      dayEnd.setHours(23, 59, 59, 999);

      const subscriptions = await prisma.hmsTavleSubscription.findMany({
        where: {
          status: { in: ["ACTIVE", "EXPIRING_SOON"] },
          endsAt: { gte: dayStart, lte: dayEnd },
        },
        include: {
          tenant: { select: { name: true, contactEmail: true, invoiceEmail: true } },
        },
      });

      for (const sub of subscriptions) {
        const email = sub.tenant.invoiceEmail ?? sub.tenant.contactEmail;
        // TODO: Integrer e-postservice her
        // await sendExpiryWarningEmail({ to: email, tenantName: sub.tenant.name, daysLeft, plan: sub.plan });
        results.emailsLogged++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, results },
      { status: 500 }
    );
  }
}
