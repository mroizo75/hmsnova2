import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit, strictRateLimiter, getClientIp } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { validateRequestBody, createErrorResponse, ErrorCodes } from "@/lib/validations/api";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const identifier = `forgot-password:${ip}`;

    // Rate limit: 3 forsøk per 60 sekunder
    const { success } = await checkRateLimit(identifier, strictRateLimiter);
    if (!success) {
      return createErrorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        "For mange forespørsler. Prøv igjen om 1 minutt.",
        429
      );
    }

    // Valider input
    const validation = await validateRequestBody(request, forgotPasswordSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { email } = validation.data;

    // Finn bruker
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // SIKKERHET: Ikke avslør om bruker eksisterer eller ikke
    // Returner alltid success for å unngå bruker-enumerasjon
    if (!user) {
      console.log(`[Forgot Password] User not found: ${email}`);
      return NextResponse.json({
        success: true,
        message: "Hvis e-posten finnes i systemet, har vi sendt en reset-link.",
      });
    }

    // Opprett reset token
    const userAgent = request.headers.get("user-agent") || undefined;
    const result = await createPasswordResetToken(user.id, ip, userAgent);

    if ("error" in result) {
      return createErrorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        result.error,
        429
      );
    }

    const { token, expires } = result;

    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    const expiresInMinutes = Math.round(
      (expires.getTime() - Date.now()) / 60000
    );

    try {
      await resend.emails.send({
        from: "HMS Nova <noreply@hmsnova.no>",
        to: user.email,
        subject: "Tilbakestill passord - HMS Nova",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Tilbakestill passord</h2>
            <p>Hei ${user.name || ""},</p>
            <p>Vi mottok en forespørsel om å tilbakestille passordet for din HMS Nova-konto.</p>
            <p>Klikk på lenken nedenfor for å tilbakestille passordet ditt:</p>
            <p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Tilbakestill passord
              </a>
            </p>
            <p>Eller kopier og lim inn denne lenken i nettleseren din:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
            <p><strong>Denne lenken utløper om ${expiresInMinutes} minutter.</strong></p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              Hvis du ikke ba om å tilbakestille passordet ditt, kan du ignorere denne e-posten.
              Kontoen din forblir sikker.
            </p>
            <p style="color: #666; font-size: 12px;">
              Dette er en automatisk e-post. Ikke svar på denne meldingen.
            </p>
            <p style="color: #666; font-size: 12px;">
              Forespørsel fra IP: ${ip}
            </p>
          </div>
        `,
      });

      console.log(`[Forgot Password] Reset email sent to: ${user.email}`);
    } catch (emailError) {
      console.error("[Forgot Password] Failed to send email:", emailError);
      // Ikke avsløre email-feil til bruker
    }

    return NextResponse.json({
      success: true,
      message: "Hvis e-posten finnes i systemet, har vi sendt en reset-link.",
    });
  } catch (error) {
    console.error("[Forgot Password] Error:", error);
    return NextResponse.json(
      { error: "En feil oppstod. Prøv igjen senere." },
      { status: 500 }
    );
  }
}

