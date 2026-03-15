import { NextRequest, NextResponse } from "next/server";
import { runHealthcareTrainingExpiryAlerts } from "@/lib/healthcare-training-alerts";
import { validateCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const unauthorizedResponse = validateCronRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const startedAt = Date.now();
    const result = await runHealthcareTrainingExpiryAlerts();
    const durationMs = Date.now() - startedAt;

    return NextResponse.json({
      success: true,
      message: "Healthcare training alerts completed",
      stats: {
        tenantsProcessed: result.tenantsProcessed,
        notificationsSent: result.totalSent,
        durationMs,
      },
      results: result.results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

