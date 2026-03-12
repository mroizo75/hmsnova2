import { NextRequest, NextResponse } from "next/server";
import { runScheduledAlerts } from "@/lib/scheduled-alerts";
import { sendDigestEmails } from "@/lib/email-digest";

/**
 * Cron Job API Route for HMS Nova Alerts
 * 
 * Denne ruten kjøres automatisk av en cron job (f.eks. Vercel Cron eller eksterne tjenester)
 * Anbefalt schedule: Daglig kl. 08:00
 * 
 * Headers:
 * - Authorization: Bearer {CRON_SECRET}
 * 
 * For Vercel Cron, legg til i vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/alerts",
 *     "schedule": "0 8 * * *"
 *   }]
 * }
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 sekunder timeout

export async function GET(request: NextRequest) {
  try {
    // Verifiser at forespørselen kommer fra en autorisert kilde
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Fail closed i production: krev gyldig secret
    if (process.env.NODE_ENV === "production") {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.error("❌ Unauthorized cron request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("🔔 Starting scheduled alerts cron job...");
    const startTime = Date.now();

    // Kjør alle varselssjekker
    const alertResults = await runScheduledAlerts();

    // Beregn statistikk
    const totalTenants = alertResults.length;
    const totalNotifications = alertResults.reduce((sum, r) => sum + r.totalNotifications, 0);
    const totalAlerts = alertResults.reduce((sum, r) => sum + r.alerts.length, 0);

    const duration = Date.now() - startTime;

    console.log(`✅ Cron job completed in ${duration}ms`);
    console.log(`   - Tenants processed: ${totalTenants}`);
    console.log(`   - Total alerts found: ${totalAlerts}`);
    console.log(`   - Notifications created: ${totalNotifications}`);

    return NextResponse.json({
      success: true,
      message: "Scheduled alerts completed",
      stats: {
        tenantsProcessed: totalTenants,
        alertsFound: totalAlerts,
        notificationsCreated: totalNotifications,
        durationMs: duration,
      },
      results: alertResults.map(r => ({
        tenant: r.tenantName,
        notifications: r.totalNotifications,
        alertTypes: r.alerts.map(a => a.type),
      })),
    });
  } catch (error) {
    console.error("❌ Cron job failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// POST for manuell triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

