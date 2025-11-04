import { prisma } from "@/lib/db";
import crypto from "crypto";

const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generer en sikker email verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Opprett email verification token for bruker
 */
export async function createVerificationToken(
  email: string
): Promise<{ token: string; expires: Date } | { error: string }> {
  try {
    // Generer token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Slett gamle tokens for denne e-posten
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        expires: {
          lt: new Date(),
        },
      },
    });

    // Opprett ny token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    return { token, expires };
  } catch (error) {
    console.error("Failed to create verification token:", error);
    return { error: "Kunne ikke opprette verifikasjonstoken" };
  }
}

/**
 * Valider email verification token
 */
export async function validateVerificationToken(
  token: string
): Promise<{ email: string } | { error: string }> {
  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return { error: "Ugyldig eller utløpt token" };
    }

    if (verificationToken.expires < new Date()) {
      // Slett utløpt token
      await prisma.verificationToken.delete({
        where: { token },
      });
      return { error: "Token er utløpt. Be om en ny verifikasjonslenke." };
    }

    return { email: verificationToken.identifier };
  } catch (error) {
    console.error("Failed to validate verification token:", error);
    return { error: "Kunne ikke validere token" };
  }
}

/**
 * Verifiser bruker og slett token
 */
export async function verifyUserEmail(token: string): Promise<boolean> {
  try {
    const validation = await validateVerificationToken(token);
    
    if ("error" in validation) {
      return false;
    }

    const { email } = validation;

    // Oppdater bruker
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Slett token
    await prisma.verificationToken.delete({
      where: { token },
    });

    return true;
  } catch (error) {
    console.error("Failed to verify user email:", error);
    return false;
  }
}

/**
 * Cleanup utløpte tokens (kjør periodisk)
 */
export async function cleanupExpiredVerificationTokens(): Promise<number> {
  try {
    const result = await prisma.verificationToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error("Failed to cleanup expired verification tokens:", error);
    return 0;
  }
}

