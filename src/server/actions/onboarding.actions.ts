"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";
import { OnboardingStatus } from "@prisma/client";
import { AuditLog } from "@/lib/audit-log";
import { createOnboardingInvoice } from "@/server/actions/invoice.actions";

const resend = new Resend(process.env.RESEND_API_KEY);

const activateTenantSchema = z.object({
  tenantId: z.string().cuid(),
  adminEmail: z.string().email(),
  adminName: z.string().min(2),
  adminPassword: z.string().min(8),
  notes: z.string().optional(),
});

/**
 * Hent alle registreringer som venter på behandling
 */
export async function getPendingRegistrations() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const registrations = await prisma.tenant.findMany({
      where: {
        onboardingStatus: {
          in: ["NOT_STARTED", "IN_PROGRESS"],
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        subscription: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: registrations };
  } catch (error: any) {
    console.error("Get pending registrations error:", error);
    return { success: false, error: error.message || "Kunne ikke hente registreringer" };
  }
}

/**
 * Hent detaljer om en spesifikk registrering
 */
export async function getRegistrationDetails(tenantId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
              },
            },
          },
        },
        subscription: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Registrering ikke funnet" };
    }

    return { success: true, data: tenant };
  } catch (error: any) {
    console.error("Get registration details error:", error);
    return { success: false, error: error.message || "Kunne ikke hente detaljer" };
  }
}

/**
 * Aktiver tenant - opprett admin-bruker og send påloggingsinformasjon
 */
export async function activateTenant(input: z.infer<typeof activateTenantSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser?.isSuperAdmin && !currentUser?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const validated = activateTenantSchema.parse(input);

    // Hent tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      include: {
        subscription: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    // Sjekk om admin-bruker allerede eksisterer
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.adminEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "En bruker med denne e-postadressen eksisterer allerede",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.adminPassword, 10);

    // SIKKERHET: Opprett admin-bruker, subscription og aktiver tenant i én transaksjon
    const result = await prisma.$transaction(async (tx) => {
      // 1. Opprett admin-bruker med ADMIN-rolle
      const adminUser = await tx.user.create({
        data: {
          email: validated.adminEmail,
          name: validated.adminName,
          password: hashedPassword,
          tenants: {
            create: {
              tenantId: validated.tenantId,
              role: "ADMIN",
            },
          },
        },
      });

      // 2. Beregn pris basert på antall ansatte
      const yearlyPrice = 
        tenant.pricingTier === "MICRO" ? 6000 :
        tenant.pricingTier === "SMALL" ? 8000 :
        tenant.pricingTier === "MEDIUM" ? 12000 : 12000;

      const plan: any = 
        tenant.pricingTier === "MICRO" || tenant.pricingTier === "SMALL" ? "STARTER" :
        tenant.pricingTier === "MEDIUM" ? "PROFESSIONAL" : "ENTERPRISE";

      // 3. Opprett subscription (FØRST NÅ får de tilgang!)
      const subscription = await tx.subscription.create({
        data: {
          tenantId: validated.tenantId,
          plan,
          price: yearlyPrice,
          billingInterval: "YEARLY",
          status: "TRIAL",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dager
        },
      });

      // 4. Oppdater tenant status og aktiver prøveperiode
      const updatedTenant = await tx.tenant.update({
        where: { id: validated.tenantId },
        data: {
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dager fra nå
          onboardingStatus: "ADMIN_CREATED",
          onboardingCompletedAt: new Date(),
          salesRep: currentUser.name || currentUser.email,
          notes: validated.notes
            ? `${tenant.notes ? tenant.notes + "\n\n" : ""}Aktivert av ${currentUser.email}: ${validated.notes}`
            : tenant.notes,
        },
        include: {
          subscription: true,
        },
      });

      return { adminUser, tenant: updatedTenant, subscription };
    });

    // Send velkomst-e-post med påloggingsinformasjon
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: "HMS Nova <noreply@hmsnova.com>",
          to: validated.adminEmail,
          subject: "Velkommen til HMS Nova - Din konto er klar! 🎉",
          html: getActivationEmail({
            adminName: validated.adminName,
            companyName: tenant.name,
            email: validated.adminEmail,
            password: validated.adminPassword,
            loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send activation email:", emailError);
        // Don't fail the activation if email fails
      }
    }

    // Audit log
    await AuditLog.log(
      tenant.id,
      currentUser.id,
      "TENANT_ACTIVATED",
      "Tenant",
      tenant.id,
      {
        tenantName: tenant.name,
        adminEmail: validated.adminEmail,
        activatedBy: currentUser.email,
      }
    );

    // VIKTIG: Opprett faktura som MÅ betales innen 14 dager
    await createOnboardingInvoice(tenant.id);

    return {
      success: true,
      data: {
        tenant: result.tenant,
        adminUser: {
          id: result.adminUser.id,
          email: result.adminUser.email,
          name: result.adminUser.name,
        },
      },
    };
  } catch (error: any) {
    console.error("Activate tenant error:", error);
    return { success: false, error: error.message || "Kunne ikke aktivere tenant" };
  }
}

/**
 * Avvis registrering
 */
export async function rejectRegistration(tenantId: string, reason: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser?.isSuperAdmin && !currentUser?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    // Oppdater tenant med avvisning
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "CANCELLED",
        notes: `${tenant.notes ? tenant.notes + "\n\n" : ""}AVVIST av ${currentUser.email}: ${reason}`,
      },
    });

    // Send e-post til kunden (valgfritt)
    if (process.env.RESEND_API_KEY && tenant.contactEmail) {
      try {
        await resend.emails.send({
          from: "HMS Nova <noreply@hmsnova.com>",
          to: tenant.contactEmail,
          subject: "Angående din registrering hos HMS Nova",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2d9c92;">Takk for din interesse</h1>
              <p>Hei ${tenant.contactPerson || ""},</p>
              <p>Vi har mottatt din registrering for ${tenant.name}, men vi må dessverre informere deg om følgende:</p>
              <p style="padding: 15px; background: #f5f5f5; border-left: 4px solid #2d9c92;">${reason}</p>
              <p>Ta gjerne kontakt med oss på <a href="mailto:support@hmsnova.com">support@hmsnova.com</a> eller ring oss på <a href="tel:+4799112916">+47 99 11 29 16</a> hvis du har spørsmål.</p>
              <p>Med vennlig hilsen,<br/>HMS Nova Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
      }
    }

    // Audit log
    await AuditLog.log(
      tenant.id,
      currentUser.id,
      "REGISTRATION_REJECTED",
      "Tenant",
      tenant.id,
      {
        tenantName: tenant.name,
        reason,
        rejectedBy: currentUser.email,
      }
    );

    return { success: true };
  } catch (error: any) {
    console.error("Reject registration error:", error);
    return { success: false, error: error.message || "Kunne ikke avvise registrering" };
  }
}

/**
 * E-post template for aktivering
 */
function getActivationEmail(data: {
  adminName: string;
  companyName: string;
  email: string;
  password: string;
  loginUrl: string;
  dashboardUrl: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #2d9c92 0%, #42c6b8 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                      🎉 Velkommen til HMS Nova!
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hei <strong>${data.adminName}</strong>,
                    </p>
                    
                    <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Din HMS Nova-konto for <strong>${data.companyName}</strong> er nå klar til bruk! 🚀
                    </p>

                    <!-- Login info box -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #f0f9f8 0%, #e8f6f4 100%); border-radius: 8px; border: 2px solid #2d9c92; margin: 30px 0;">
                      <tr>
                        <td style="padding: 30px;">
                          <h2 style="margin: 0 0 20px; color: #2d9c92; font-size: 20px;">
                            📋 Dine påloggingsopplysninger
                          </h2>
                          
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #d4ebe8;">
                                <strong style="color: #1a1a1a; font-size: 14px;">E-post:</strong>
                              </td>
                              <td style="padding: 12px 0; border-bottom: 1px solid #d4ebe8; text-align: right;">
                                <span style="color: #2d9c92; font-size: 14px; font-weight: 600;">${data.email}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0;">
                                <strong style="color: #1a1a1a; font-size: 14px;">Passord:</strong>
                              </td>
                              <td style="padding: 12px 0; text-align: right;">
                                <code style="background: #ffffff; padding: 8px 12px; border-radius: 4px; color: #1a1a1a; font-family: 'Courier New', monospace; font-size: 14px; border: 1px solid #2d9c92;">${data.password}</code>
                              </td>
                            </tr>
                          </table>

                          <p style="color: #666; font-size: 12px; margin: 15px 0 0; font-style: italic;">
                            ⚠️ Vennligst endre passordet ditt ved første innlogging
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2d9c92 0%, #42c6b8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(45, 156, 146, 0.3);">
                            Logg inn nå →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Quick start guide -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #f9f9f9; border-radius: 8px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 25px;">
                          <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 18px;">
                            🚀 Kom i gang på 3 steg:
                          </h3>
                          <ol style="margin: 0; padding-left: 20px; color: #666;">
                            <li style="margin-bottom: 10px;">Logg inn og endre passord</li>
                            <li style="margin-bottom: 10px;">Legg til dine medarbeidere under "Innstillinger"</li>
                            <li style="margin-bottom: 10px;">Start med å laste opp HMS-dokumenter eller lag en risikovurdering</li>
                          </ol>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                      Har du spørsmål? Vi er her for å hjelpe!<br/>
                      📧 <a href="mailto:support@hmsnova.com" style="color: #2d9c92; text-decoration: none;">support@hmsnova.com</a><br/>
                      📞 <a href="tel:+4799112916" style="color: #2d9c92; text-decoration: none;">+47 99 11 29 16</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background: #f9f9f9; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="margin: 0; color: #999; font-size: 12px;">
                      © ${new Date().getFullYear()} HMS Nova. Alle rettigheter reservert.
                    </p>
                    <p style="margin: 10px 0 0; color: #999; font-size: 12px;">
                      <a href="${data.dashboardUrl}" style="color: #2d9c92; text-decoration: none;">Dashboard</a> | 
                      <a href="https://hmsnova.com" style="color: #2d9c92; text-decoration: none;">Hjemmeside</a>
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

