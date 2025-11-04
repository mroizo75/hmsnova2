import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createVerificationToken } from "@/lib/email-verification";
import { checkRateLimit, strictRateLimiter, getClientIp } from "@/lib/rate-limit";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/auth/resend-verification
 * Resend email verification link
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const identifier = `resend-verification:${ip}`;

    // Rate limit: 3 forsøk per 60 sekunder
    const { success } = await checkRateLimit(identifier, strictRateLimiter);
    if (!success) {
      return NextResponse.json(
        { error: "For mange forespørsler. Prøv igjen om 1 minutt." },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "E-post er påkrevd" },
        { status: 400 }
      );
    }

    // Finn bruker
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    // SIKKERHET: Ikke avslør om bruker eksisterer eller ikke
    if (!user) {
      console.log(`[Resend Verification] User not found: ${email}`);
      return NextResponse.json({
        success: true,
        message: "Hvis e-posten finnes og ikke er verifisert, har vi sendt en ny verifikasjonslenke.",
      });
    }

    // Sjekk om bruker allerede er verifisert
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "E-postadressen er allerede verifisert.",
      });
    }

    // Opprett verification token
    const result = await createVerificationToken(user.email);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const { token, expires } = result;

    // Send email
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;
    const expiresInHours = Math.round(
      (expires.getTime() - Date.now()) / (60 * 60 * 1000)
    );

    try {
      await resend.emails.send({
        from: "HMS Nova <noreply@hmsnova.no>",
        to: user.email,
        subject: "Verifiser e-postadressen din - HMS Nova",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Velkommen til HMS Nova!</h2>
            <p>Hei ${user.name || ""},</p>
            <p>Takk for at du registrerte deg hos HMS Nova. Klikk på lenken nedenfor for å verifisere e-postadressen din:</p>
            <p>
              <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Verifiser e-postadresse
              </a>
            </p>
            <p>Eller kopier og lim inn denne lenken i nettleseren din:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${verifyUrl}</p>
            <p><strong>Denne lenken utløper om ${expiresInHours} timer.</strong></p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              Hvis du ikke opprettet en konto hos HMS Nova, kan du ignorere denne e-posten.
            </p>
            <p style="color: #666; font-size: 12px;">
              Dette er en automatisk e-post. Ikke svar på denne meldingen.
            </p>
          </div>
        `,
      });

      console.log(`[Resend Verification] Verification email sent to: ${user.email}`);
    } catch (emailError) {
      console.error("[Resend Verification] Failed to send email:", emailError);
      // Ikke avsløre email-feil til bruker
    }

    return NextResponse.json({
      success: true,
      message: "Hvis e-posten finnes og ikke er verifisert, har vi sendt en ny verifikasjonslenke.",
    });
  } catch (error) {
    console.error("[Resend Verification] Error:", error);
    return NextResponse.json(
      { error: "En feil oppstod. Prøv igjen senere." },
      { status: 500 }
    );
  }
}

