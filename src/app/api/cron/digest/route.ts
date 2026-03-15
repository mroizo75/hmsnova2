import { NextRequest, NextResponse } from "next/server";
import { sendDigestEmails } from "@/lib/email-digest";
import { validateCronRequest } from "@/lib/cron-auth";

/**
 * Cron Job API Route for HMS Nova Email Digest
 * 
 * Denne ruten sender daglige eller ukentlige e-post sammendrag.
 * 
 * For Vercel Cron, legg til i vercel.json:
 * {
 *   "crons": [
 *     { "path": "/api/cron/digest?type=daily", "schedule": "0 7 * * 1-5" },
 *     { "path": "/api/cron/digest?type=weekly", "schedule": "0 8 * * 1" }
 *   ]
 * }
 * 
 * Daglig: kl. 07:00 mandag-fredag
 * Ukentlig: kl. 08:00 hver mandag
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutter timeout

export async function GET(request: NextRequest) {
  try {
    const unauthorizedResponse = validateCronRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    // Hent digest type fra query parameter
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type")?.toUpperCase();
    const type = typeParam === "WEEKLY" ? "WEEKLY" : "DAILY";

    console.log(`📧 Starting ${type} email digest cron job...`);
    const startTime = Date.now();

    const result = await sendDigestEmails(type);

    const duration = Date.now() - startTime;

    console.log(`✅ ${type} digest completed in ${duration}ms`);
    console.log(`   - Emails sent: ${result.emailsSent}`);
    console.log(`   - Errors: ${result.errors}`);

    return NextResponse.json({
      success: true,
      message: `${type} digest completed`,
      stats: {
        emailsSent: result.emailsSent,
        errors: result.errors,
        durationMs: duration,
      },
    });
  } catch (error) {
    console.error("❌ Digest cron job failed:", error);
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

