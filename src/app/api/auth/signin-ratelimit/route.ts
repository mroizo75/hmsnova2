import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimitPolicy,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/rate-limit";

/**
 * Rate limit endpoint for signin
 * Called before actual authentication
 * SIKKERHET: Fail closed for login attempts
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimitPolicy({
      policy: "login",
      scope: "signin",
      identifiers: [ip],
      failClosed: true,
    });

    if (!rateLimit.success) {
      return createRateLimitResponse(
        rateLimit,
        "For mange påloggingsforsøk. Prøv igjen senere."
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rate limit check error:", error);
    // SIKKERHET: Fail closed for login attempts
    return NextResponse.json(
      { error: "En feil oppstod. Prøv igjen senere." },
      { status: 500 }
    );
  }
}
