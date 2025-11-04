import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, authRateLimiter, getClientIp } from "@/lib/rate-limit";

/**
 * Rate limit endpoint for signin
 * Called before actual authentication
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const identifier = `signin:${ip}`;
    
    const { success } = await checkRateLimit(identifier, authRateLimiter);

    if (!success) {
      return NextResponse.json(
        { 
          error: "For mange påloggingsforsøk. Prøv igjen senere.",
        },
        { 
          status: 429,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Fail open - la bruker prøve
    return NextResponse.json({ success: true });
  }
}
