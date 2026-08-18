import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/validations/api";
import { z } from "zod";
import { HmsTavlePlan } from "@prisma/client";
import { PLAN_PRICES, PLAN_LABELS } from "@/features/hms-tavle/lib/tavle-plan-limits";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

const registerSchema = z.object({
  plan: z.enum(["ENKEL", "STANDARD", "AVANSERT"]),
  durationMonths: z.number().int().min(1).max(24),
  company: z.object({
    orgNr: z.string().min(9, "Org.nr må ha 9 siffer"),
    name: z.string().min(2),
    address: z.string().optional(),
    email: z.string().email("Ugyldig e-postadresse"),
    invoiceEmail: z.string().email().optional().or(z.literal("")),
    contactPerson: z.string().min(2),
    phone: z.string().optional(),
  }),
  totalPrice: z.number().positive(),
});

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 50) +
    "-" +
    Date.now().toString(36)
  );
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function buildWelcomeEmail({
  contactPerson,
  companyName,
  email,
  tempPassword,
  plan,
  endsAt,
  loginUrl,
  tavleUrl,
}: {
  contactPerson: string;
  companyName: string;
  email: string;
  tempPassword: string;
  plan: string;
  endsAt: Date;
  loginUrl: string;
  tavleUrl: string;
}): string {
  const endsFormatted = endsAt.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Velkommen til Digital HMS Tavle</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a56db 0%,#1e40af 100%);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Digital HMS Tavle</h1>
            <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">HMS Nova – Byggeplass i fokus</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#374151;">Hei ${contactPerson},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Takk for at <strong>${companyName}</strong> har bestilt Digital HMS Tavle! Kontoen din er klar og du kan logge inn med én gang.
            </p>

            <!-- Innloggingsinfo -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin:0 0 24px;">
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em;">Dine innloggingsdetaljer</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;font-size:14px;color:#374151;width:140px;">E-post:</td>
                      <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-size:14px;color:#374151;">Midlertidig passord:</td>
                      <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;font-family:monospace;letter-spacing:0.08em;">${tempPassword}</td>
                    </tr>
                  </table>
                  <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">⚠️ Bytt passord umiddelbart etter første innlogging.</p>
                </td>
              </tr>
            </table>

            <!-- Abonnement -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 24px;">
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">Ditt abonnement</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;font-size:14px;color:#374151;width:140px;">Plan:</td>
                      <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${plan}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-size:14px;color:#374151;">Gyldig til:</td>
                      <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${endsFormatted}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA-knapper -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td align="center" style="padding:0 0 12px;">
                  <a href="${loginUrl}" style="display:inline-block;background:#1a56db;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;">
                    Logg inn og sett opp tavlen din →
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${tavleUrl}" style="display:inline-block;background:#ffffff;color:#1a56db;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:500;border:2px solid #1a56db;">
                    Gå til HMS Tavle-oversikten
                  </a>
                </td>
              </tr>
            </table>

            <!-- Neste steg -->
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#374151;">Kom raskt i gang:</p>
            <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#374151;line-height:1.8;">
              <li>Logg inn med e-post og midlertidig passord</li>
              <li>Bytt passord under kontoinnstillinger</li>
              <li>Opprett din første digitale HMS-tavle</li>
              <li>Del QR-koden med mannskapet på byggeplassen</li>
            </ol>

            <p style="margin:0;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:20px;">
              Spørsmål? Svar på denne e-posten eller kontakt oss på <a href="mailto:post@hmsnova.no" style="color:#1a56db;">post@hmsnova.no</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} HMS Nova AS · Digital HMS Tavle
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);
    }

    const { plan, durationMonths, company, totalPrice } = parsed.data;
    const orgNumber = company.orgNr.replace(/\s/g, "");
    const BASE_URL = process.env.NEXTAUTH_URL ?? "https://app.hmsnova.no";

    // Sjekk om org.nr allerede har en aktiv tavle-konto
    const existingTenant = await prisma.tenant.findFirst({
      where: { orgNumber },
      include: { tavleSubscription: true },
    });

    if (existingTenant?.tavleSubscription?.status === "ACTIVE") {
      return createErrorResponse(
        ErrorCodes.ALREADY_EXISTS,
        "Denne bedriften har allerede en aktiv HMS Tavle-konto. Logg inn i stedet.",
        409
      );
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + durationMonths);

    const planLabel = PLAN_LABELS[plan as HmsTavlePlan];
    const pricePerMonth = PLAN_PRICES[plan as HmsTavlePlan];
    const maxTavler = plan === "ENKEL" ? 1 : plan === "STANDARD" ? 3 : 999;

    // Generer midlertidig passord
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    let tenantId: string;
    let userId: string;

    if (existingTenant) {
      tenantId = existingTenant.id;
      if (!existingTenant.isTavleOnly) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { isTavleOnly: true },
        });
      }
      // Finn eller opprett bruker koblet til tenant
      const existingUserTenant = await prisma.userTenant.findFirst({
        where: { tenantId, role: "ADMIN" },
        include: { user: true },
      });
      if (existingUserTenant) {
        userId = existingUserTenant.userId;
      } else {
        const user = await prisma.user.upsert({
          where: { email: company.email },
          update: {},
          create: {
            name: company.contactPerson,
            email: company.email,
            phone: company.phone,
            password: hashedPassword,
          },
        });
        userId = user.id;
        await prisma.userTenant.create({
          data: { userId, tenantId, role: "ADMIN" },
        });
      }
    } else {
      // Opprett tenant og bruker i én transaksjon
      const result = await prisma.$transaction(async (tx) => {
        const newTenant = await tx.tenant.create({
          data: {
            name: company.name,
            orgNumber,
            contactEmail: company.email,
            contactPhone: company.phone,
            address: company.address,
            contactPerson: company.contactPerson,
            invoiceEmail: company.invoiceEmail || company.email,
            isTavleOnly: true,
            slug: generateSlug(company.name),
          },
        });

        const user = await tx.user.upsert({
          where: { email: company.email },
          update: {},
          create: {
            name: company.contactPerson,
            email: company.email,
            phone: company.phone,
            password: hashedPassword,
          },
        });

        await tx.userTenant.create({
          data: { userId: user.id, tenantId: newTenant.id, role: "ADMIN" },
        });

        return { tenant: newTenant, user };
      });

      tenantId = result.tenant.id;
      userId = result.user.id;
    }

    // Opprett eller oppdater abonnement
    const subscription = await prisma.hmsTavleSubscription.upsert({
      where: { tenantId },
      update: {
        plan: plan as HmsTavlePlan,
        status: "ACTIVE",
        pricePerMonth,
        startsAt,
        endsAt,
        isAddon: false,
        autoRenew: false,
        maxTavler,
      },
      create: {
        tenantId,
        plan: plan as HmsTavlePlan,
        status: "ACTIVE",
        pricePerMonth,
        startsAt,
        endsAt,
        isAddon: false,
        autoRenew: false,
        maxTavler,
      },
    });

    // Sett siste tenant for rask innlogging
    await prisma.user.update({
      where: { id: userId },
      data: { lastTenantId: tenantId },
    });

    // Send velkomst-epost via Resend
    const loginUrl = `${BASE_URL}/login`;
    const tavleUrl = `${BASE_URL}/dashboard/hms-tavle`;

    try {
      await sendEmail({
        to: company.email,
        subject: `Velkommen til Digital HMS Tavle – ${company.name}`,
        html: buildWelcomeEmail({
          contactPerson: company.contactPerson,
          companyName: company.name,
          email: company.email,
          tempPassword,
          plan: planLabel,
          endsAt,
          loginUrl,
          tavleUrl,
        }),
      });
    } catch {
      // Ikke blokker registreringen om e-post feiler
    }

    // Varsle HMS Nova om ny bestilling
    try {
      await sendEmail({
        to: "post@hmsnova.no",
        subject: `Ny HMS Tavle-bestilling: ${company.name}`,
        html: `<h2>Ny HMS Tavle-bestilling</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Bedrift:</td><td>${company.name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Org.nr:</td><td>${orgNumber}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Plan:</td><td>${planLabel}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Pris:</td><td>kr ${pricePerMonth}/mnd</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Varighet:</td><td>${durationMonths} måneder</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Totalt:</td><td>kr ${totalPrice}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Kontakt:</td><td>${company.contactPerson}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">E-post:</td><td>${company.email}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Telefon:</td><td>${company.phone ?? "Ikke oppgitt"}</td></tr>
</table>
<p style="margin-top:16px;font-size:13px;color:#666;">Faktura må sendes manuelt.</p>`,
      });
    } catch {
      // Ikke blokker registreringen om intern varsel feiler
    }

    return createSuccessResponse(
      {
        tenantId,
        subscriptionId: subscription.id,
        endsAt: subscription.endsAt,
        loginUrl,
        email: company.email,
      },
      "Konto opprettet! Sjekk e-posten din for innloggingsdetaljer.",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
