import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { format, addDays } from "date-fns";
import { nb } from "date-fns/locale";

const testEmailSchema = z.object({
  type: z.enum([
    "meeting",
    "inspection",
    "audit",
    "measure",
    "incident",
    "training",
    "document",
    "management-review",
  ]),
  userId: z.string(),
  tenantId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = await request.json();
    const { type, userId, tenantId } = testEmailSchema.parse(body);

    // Verifiser at brukeren har tilgang til denne tenanten
    if (session.user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    // Hent mottaker (må tilhøre samme tenant)
    const recipientMembership = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      select: {
        user: {
          select: {
            email: true,
            name: true,
            notifyByEmail: true,
          },
        },
      },
    });
    const recipient = recipientMembership?.user;

    if (!recipient) {
      return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
    }

    if (!recipient.notifyByEmail) {
      return NextResponse.json(
        { error: "Brukeren har deaktivert e-postvarslinger" },
        { status: 400 }
      );
    }

    // Hent tenant-info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant ikke funnet" }, { status: 404 });
    }

    // Generer e-post basert på type
    const emailData = generateTestEmail(type, recipient.name || "Bruker", tenant.name);

    // Send e-post
    await sendEmail({
      to: recipient.email,
      subject: emailData.subject,
      html: emailData.html,
    });

    return NextResponse.json({
      success: true,
      message: `Test-e-post sendt til ${recipient.email}`,
    });
  } catch (error) {
    console.error("Test email error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ugyldig input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Kunne ikke sende test-e-post" },
      { status: 500 }
    );
  }
}

function generateTestEmail(
  type: string,
  userName: string,
  tenantName: string
): { subject: string; html: string } {
  const baseUrl = process.env.NEXTAUTH_URL || "https://www.hmsnova.no";
  const tomorrow = format(addDays(new Date(), 1), "EEEE d. MMMM yyyy 'kl.' HH:mm", { locale: nb });

  switch (type) {
    case "meeting":
      return {
        subject: `📅 Påminnelse: Møte i morgen - ${tenantName}`,
        html: getEmailTemplate({
          userName,
          tenantName,
          title: "Møte i morgen",
          icon: "📅",
          message: `Du har et møte planlagt ${tomorrow}.`,
          details: [
            "Tittel: Vernerunde Q1 2025",
            "Sted: Møterom 1",
            "Varighet: 1 time",
            "Deltakere: 5 personer",
          ],
          actionText: "Se møtedetaljer",
          actionUrl: `${baseUrl}/dashboard/meetings`,
          footerText: "Husk å forberede deg ved å gå gjennom sakslisten.",
        }),
      };

    case "inspection":
      return {
        subject: `🔍 Påminnelse: Vernerunde planlagt - ${tenantName}`,
        html: getEmailTemplate({
          userName,
          tenantName,
          title: "Vernerunde planlagt",
          icon: "🔍",
          message: `En vernerunde er planlagt ${tomorrow}.`,
          details: [
            "Type: Sikkerhetsinspeksjon",
            "Område: Produksjonshall A",
            "Ansvarlig: HMS-koordinator",
            "Status: Planlagt",
          ],
          actionText: "Se inspeksjonsdetaljer",
          actionUrl: `${baseUrl}/dashboard/inspections`,
          footerText: "Vennligst sørg for at området er klart for inspeksjon.",
        }),
      };

    case "audit":
      return {
        subject: `📋 Påminnelse: Revisjon planlagt - ${tenantName}`,
        html: getEmailTemplate({
          userName,
          tenantName,
          title: "Revisjon planlagt",
          icon: "📋",
          message: "En revisjon er planlagt for neste uke.",
          details: [
            "Type: Intern audit",
            "Standard: ISO 45001",
            "Dato: " + format(addDays(new Date(), 7), "d. MMMM yyyy", { locale: nb }),
            "Revisor: Ekstern revisor",
          ],
          actionText: "Se revisjonsdetaljer",
          actionUrl: `${baseUrl}/dashboard/audits`,
          footerText: "Sjekk at all dokumentasjon er oppdatert og tilgjengelig.",
        }),
      };

    case "measure":
      return {
        subject: `⚠️ Påminnelse: Tiltak forfaller snart - ${tenantName}`,
        html: getEmailTemplate({
          userName,
          tenantName,
          title: "Tiltak forfaller snart",
          icon: "⚠️",
          message: "Du har tiltak som forfaller i løpet av de neste 7 dagene.",
          details: [
            "Antall tiltak: 3",
            "Forfall: Innen 7 dager",
            "Kategori: Forebyggende",
            "Prioritet: Høy",
          ],
          actionText: "Se tiltaksliste",
          actionUrl: `${baseUrl}/dashboard/actions`,
          footerText: "Vennligst fullfør tiltakene før forfallsdato.",
        }),
      };

    case "incident":
      return {
        subject: `🚨 Nytt avvik rapportert - ${tenantName}`,
        html: getEmailTemplate({
          userName,
          tenantName,
          title: "Nytt avvik rapportert",
          icon: "🚨",
          message: "Et nytt avvik er rapportert og krever din oppfølging.",
          details: [
            "Type: Nesten-ulykke",
            "Alvorlighetsgrad: Middels",
            "Område: Lager",
            "Status: Venter på gjennomgang",
          ],
          actionText: "Se avviksdetaljer",
          actionUrl: `${baseUrl}/dashboard/incidents`,
          footerText: "Vennligst gjennomgå og lukk avviket så snart som mulig.",
        }),
      };

    case "training":
      return {
        subject: `🎓 Påminnelse: Kurs utløper snart - ${tenantName}`,
        html: getEmailTemplate({
          userName,
          tenantName,
          title: "Kurs utløper snart",
          icon: "🎓",
          message: "Ett eller flere av dine kurs utløper snart.",
          details: [
            "Kurs: Førstehjelp",
            "Utløper om: 30 dager",
            "Sist gjennomført: " + format(addDays(new Date(), -335), "d. MMMM yyyy", { locale: nb }),
            "Type: Obligatorisk",
          ],
          actionText: "Se opplæringsoversikt",
          actionUrl: `${baseUrl}/dashboard/training`,
          footerText: "Vennligst sørg for å fornye sertifikatet før det utløper.",
        }),
      };

    case "document":
      return {
        subject: `📄 Dokument venter på godkjenning - ${tenantName}`,
        html: getEmailTemplate({
          userName,
          tenantName,
          title: "Dokument venter på godkjenning",
          icon: "📄",
          message: "Ett eller flere dokumenter venter på din godkjenning.",
          details: [
            "Antall dokumenter: 2",
            "Type: Prosedyrer",
            "Forfallsdato: 7 dager",
            "Status: Venter på godkjenning",
          ],
          actionText: "Gå til dokumenter",
          actionUrl: `${baseUrl}/dashboard/documents`,
          footerText: "Vennligst gjennomgå og godkjenn dokumentene.",
        }),
      };

    case "management-review":
      return {
        subject: `📊 Påminnelse: Ledelsesgjennomgang planlagt - ${tenantName}`,
        html: getEmailTemplate({
          userName,
          tenantName,
          title: "Ledelsesgjennomgang planlagt",
          icon: "📊",
          message: "Det er snart tid for ledelsesgjennomgang.",
          details: [
            "Periode: Q1 2025",
            "Dato: " + format(addDays(new Date(), 7), "d. MMMM yyyy", { locale: nb }),
            "Deltakere: Ledergruppe",
            "Status: Forberedelse",
          ],
          actionText: "Gå til ledelsesgjennomgang",
          actionUrl: `${baseUrl}/dashboard/management-reviews`,
          footerText: "Vennligst forbered rapport og data før møtet.",
        }),
      };

    default:
      return {
        subject: `Varsling fra ${tenantName}`,
        html: `<p>Du har en ny varsling fra ${tenantName}.</p>`,
      };
  }
}

function getEmailTemplate({
  userName,
  tenantName,
  title,
  icon,
  message,
  details,
  actionText,
  actionUrl,
  footerText,
}: {
  userName: string;
  tenantName: string;
  title: string;
  icon: string;
  message: string;
  details: string[];
  actionText: string;
  actionUrl: string;
  footerText: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #1f2937;">${title}</h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563;">Hei ${userName},</p>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4b5563;">${message}</p>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px;">
                ${details.map((detail) => `<p style="margin: 4px 0; font-size: 14px; color: #6b7280;"><strong style="color: #374151;">•</strong> ${detail}</p>`).join("")}
              </div>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding: 0 40px 20px; text-align: center;">
              <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                ${actionText}
              </a>
            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; font-style: italic;">${footerText}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                Denne e-posten ble sendt fra <strong>${tenantName}</strong> via HMS Nova.
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                Dette er en test-e-post for å verifisere at varslingsss temet fungerer korrekt.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                For å endre varslingsinnstillinger, logg inn og gå til <a href="${process.env.NEXTAUTH_URL}/dashboard/settings" style="color: #3b82f6; text-decoration: none;">Innstillinger</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
