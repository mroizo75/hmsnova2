import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron-auth";
import { runKonsernAlerts } from "@/lib/konsern-alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const unauthorizedResponse = validateCronRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    console.log("🏢 Starting konsern alerts cron job...");
    const startTime = Date.now();

    const results = await runKonsernAlerts();

    const totalAlerts = results.reduce((s, r) => s + r.alertCount, 0);
    const totalEmails = results.reduce((s, r) => s + r.emailsSent, 0);
    const duration = Date.now() - startTime;

    console.log(`✅ Konsern alerts completed in ${duration}ms`);
    console.log(`   - Groups processed: ${results.length}`);
    console.log(`   - Total alerts: ${totalAlerts}`);
    console.log(`   - Emails sent: ${totalEmails}`);

    return NextResponse.json({
      success: true,
      message: "Konsern alerts completed",
      stats: {
        groupsProcessed: results.length,
        totalAlerts,
        totalEmails,
        durationMs: duration,
      },
      results,
    });
  } catch (error) {
    console.error("❌ Konsern alerts cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
