import { NextRequest, NextResponse } from "next/server";
import { authRateLimiter, getClientIp } from "@/lib/rate-limit";

/**
 * Rate limit endpoint for signin
 * Called before actual authentication
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const identifier = `signin:${ip}`;
    
    const { success, reset } = await authRateLimiter.limit(identifier);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      
      return NextResponse.json(
        { 
          error: "For mange påloggingsforsøk. Prøv igjen senere.",
          retryAfter 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          }
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

