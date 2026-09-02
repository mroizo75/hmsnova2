import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron-auth";
import { scanLawChanges } from "@/server/jobs/law-change-monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function runScan() {
  const result = await scanLawChanges({ notifyStaff: true });
  return NextResponse.json({
    success: result.success,
    stats: {
      fetched: result.fetched,
      matched: result.matched,
      created: result.created,
    },
    error: result.error,
  }, { status: result.success ? 200 : 500 });
}

export async function GET(request: NextRequest) {
  const unauthorized = validateCronRequest(request);
  if (unauthorized) return unauthorized;
  return runScan();
}

export async function POST(request: NextRequest) {
  const unauthorized = validateCronRequest(request);
  if (unauthorized) return unauthorized;
  return runScan();
}
