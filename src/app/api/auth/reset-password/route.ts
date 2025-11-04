import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateResetToken, markTokenAsUsed } from "@/lib/password-reset";
import { checkRateLimit, apiRateLimiter, getClientIp } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { validateRequestBody, createErrorResponse, createSuccessResponse, ErrorCodes } from "@/lib/validations/api";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/reset-password
 * Reset password med token
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const identifier = `reset-password:${ip}`;

    // Rate limit
    const { success } = await checkRateLimit(identifier, apiRateLimiter);
    if (!success) {
      return createErrorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        "For mange forespørsler. Prøv igjen senere.",
        429
      );
    }

    // Valider input
    const validation = await validateRequestBody(request, resetPasswordSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { token, password } = validation.data;

    // Valider token
    const tokenValidation = await validateResetToken(token);
    if ("error" in tokenValidation) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        tokenValidation.error,
        400
      );
    }

    const { userId } = tokenValidation;

    // Hash nytt passord
    const hashedPassword = await bcrypt.hash(password, 12);

    // Oppdater passord og reset security fields
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
    });

    // Marker token som brukt
    await markTokenAsUsed(token);

    // Slett alle andre aktive sessions (tvinge re-login)
    await prisma.session.deleteMany({
      where: { userId },
    });

    console.log(`[Reset Password] Password reset successful for user: ${userId}`);

    return createSuccessResponse(
      undefined,
      "Passordet er tilbakestilt. Du kan nå logge inn med det nye passordet."
    );
  } catch (error) {
    console.error("[Reset Password] Error:", error);
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      "En feil oppstod. Prøv igjen senere.",
      500
    );
  }
}

