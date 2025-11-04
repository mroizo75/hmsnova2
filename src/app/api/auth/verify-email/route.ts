import { NextRequest, NextResponse } from "next/server";
import { verifyUserEmail } from "@/lib/email-verification";

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify user email address
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_token", request.url)
      );
    }

    const success = await verifyUserEmail(token);

    if (success) {
      return NextResponse.redirect(
        new URL("/login?verified=true", request.url)
      );
    } else {
      return NextResponse.redirect(
        new URL("/login?error=verification_failed", request.url)
      );
    }
  } catch (error) {
    console.error("[Verify Email] Error:", error);
    return NextResponse.redirect(
      new URL("/login?error=verification_failed", request.url)
    );
  }
}

