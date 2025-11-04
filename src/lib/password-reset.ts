import { prisma } from "@/lib/db";
import crypto from "crypto";

const TOKEN_EXPIRY_HOURS = 1;
const MAX_TOKENS_PER_USER_PER_DAY = 5;

/**
 * Generer en sikker password reset token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Opprett password reset token for bruker
 */
export async function createPasswordResetToken(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expires: Date } | { error: string }> {
  try {
    // Sjekk hvor mange tokens brukeren har laget siste 24 timer
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTokens = await prisma.passwordResetToken.count({
      where: {
        userId,
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });

    if (recentTokens >= MAX_TOKENS_PER_USER_PER_DAY) {
      return {
        error: `For mange reset-forespørsler. Prøv igjen om ${24 - Math.floor((Date.now() - oneDayAgo.getTime()) / (60 * 60 * 1000))} timer.`,
      };
    }

    // Generer token
    const token = generateResetToken();
    const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Slett gamle ubrukte tokens for denne brukeren
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId,
        used: false,
        expires: {
          lt: new Date(),
        },
      },
    });

    // Opprett ny token
    await prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expires,
        ipAddress,
        userAgent,
      },
    });

    return { token, expires };
  } catch (error) {
    console.error("Failed to create password reset token:", error);
    return { error: "Kunne ikke opprette reset-token" };
  }
}

/**
 * Valider password reset token
 */
export async function validateResetToken(
  token: string
): Promise<{ userId: string } | { error: string }> {
  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!resetToken) {
      return { error: "Ugyldig eller utløpt token" };
    }

    if (resetToken.used) {
      return { error: "Denne token er allerede brukt" };
    }

    if (resetToken.expires < new Date()) {
      return { error: "Token er utløpt. Be om en ny reset-link." };
    }

    return { userId: resetToken.userId };
  } catch (error) {
    console.error("Failed to validate reset token:", error);
    return { error: "Kunne ikke validere token" };
  }
}

/**
 * Marker token som brukt
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  try {
    await prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    });
  } catch (error) {
    console.error("Failed to mark token as used:", error);
  }
}

/**
 * Cleanup utløpte tokens (kjør periodisk)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error("Failed to cleanup expired tokens:", error);
    return 0;
  }
}

