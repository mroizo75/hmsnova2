import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron-auth";
import { reindexKnowledgeBase } from "@/lib/ai-knowledge-base";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function runReindex() {
  try {
    const result = await reindexKnowledgeBase();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Reindeksering feilet" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const unauthorized = validateCronRequest(request);
  if (unauthorized) return unauthorized;
  return runReindex();
}

export async function POST(request: NextRequest) {
  const unauthorized = validateCronRequest(request);
  if (unauthorized) return unauthorized;
  return runReindex();
}
