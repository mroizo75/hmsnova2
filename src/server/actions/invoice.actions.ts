"use server";

import { prisma } from "@/lib/db";
import { FikenClient } from "@/lib/fiken";
import { Resend } from "resend";
import { getTrialWelcomeEmail, getTrialExpiringEmail } from "./invoice-emails";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Opprett onboarding-faktura i Fiken og send til kunde
 * VIKTIG: Faktura forfaller ETTER 14 dagers gratis prøveperiode
 */
export async function createOnboardingInvoice(tenantId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
      },
    });

    if (!tenant || !tenant.subscription) {
      return { success: false, error: "Tenant eller subscription ikke funnet" };
    }

    if (!tenant.trialEndsAt) {
      return { success: false, error: "Tenant må ha trialEndsAt satt" };
    }

    // Sjekk om faktura allerede eksisterer
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        tenantId,
        description: { contains: tenant.subscription.billingInterval === "MONTHLY" ? "Måned 1" : "Årlig" },
      },
    });

    if (existingInvoice) {
      return { success: true, data: existingInvoice };
    }

    // Beregn beløp basert på interval
    const isMonthly = tenant.subscription.billingInterval === "MONTHLY";
    const amount = isMonthly ? Math.round(tenant.subscription.price / 12) : tenant.subscription.price;
    const netAmount = Math.round(amount / 1.25); // Pris ekskl. MVA

    // VIKTIG: Faktura forfaller DAG 15 (etter 14 dagers gratis prøve)
    const dueDate = new Date(tenant.trialEndsAt);
    dueDate.setDate(dueDate.getDate() + 1); // Dag 15

    // Opprett faktura i Fiken hvis API er konfigurert
    let fikenInvoiceId: string | undefined;
    let fikenSaleId: number | undefined;
    
    if (process.env.FIKEN_API_TOKEN && process.env.FIKEN_COMPANY_SLUG && tenant.fikenCompanyId) {
      try {
        const fikenClient = new FikenClient({
          apiToken: process.env.FIKEN_API_TOKEN,
          companySlug: process.env.FIKEN_COMPANY_SLUG,
        });

        // For månedlig: Opprett sale med recurring
        if (isMonthly) {
          // Opprett recurring sale i Fiken
          const sale = await fikenClient.createRecurringSale({
            date: new Date().toISOString().split('T')[0],
            kind: "CASH_SALE",
            customerId: tenant.fikenCompanyId,
            lines: [
              {
                description: `HMS Nova - ${tenant.subscription.plan} - Månedsabonnement`,
                netAmount,
                vatType: "HIGH",
                account: "3000",
              },
            ],
            dueDate: dueDate.toISOString().split('T')[0],
            // Recurring: Hver måned
            recurring: {
              frequency: "MONTHLY",
              interval: 1,
            },
          });

          fikenSaleId = (sale as any)?.saleId;
        } else {
          // For årlig: Vanlig invoice
          const fikenInvoice = await fikenClient.createInvoice({
            customerId: tenant.fikenCompanyId,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0],
            lines: [
              {
                description: `HMS Nova - ${tenant.subscription.plan} - Årlig abonnement`,
                netAmount,
                vatType: "HIGH",
                account: "3000",
              },
            ],
          });

          fikenInvoiceId = (fikenInvoice as any)?.invoiceId;
        }
      } catch (fikenError) {
        console.error("Fiken invoice creation error:", fikenError);
        // Fortsett selv om Fiken feiler
      }
    }

    // Opprett faktura i database
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        fikenInvoiceId: fikenInvoiceId || (fikenSaleId ? `sale-${fikenSaleId}` : undefined),
        amount,
        dueDate,
        status: "PENDING",
        description: isMonthly 
          ? `HMS Nova ${tenant.subscription.plan} - Måned 1`
          : `HMS Nova ${tenant.subscription.plan} - Årlig abonnement`,
      },
    });

    // Send velkomst-e-post med info om prøveperiode (IKKE faktura ennå)
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: "HMS Nova <noreply@hmsnova.com>",
          to: tenant.invoiceEmail || tenant.contactEmail || "",
          subject: `🎉 Velkommen til HMS Nova - 14 dager gratis!`,
          html: getTrialWelcomeEmail({
            companyName: tenant.name,
            trialEndsAt: tenant.trialEndsAt,
            amount,
            plan: tenant.subscription.plan,
            billingInterval: tenant.subscription.billingInterval,
            dueDate,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }

    return { success: true, data: invoice };
  } catch (error: any) {
    console.error("Create onboarding invoice error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette faktura" };
  }
}

/**
 * Sjekk og steng tilgang for forfalte fakturaer
 * Kjøres daglig for å suspendere tenants som ikke har betalt
 */
export async function checkOverdueInvoices() {
  try {
    const now = new Date();

    // Finn alle forfalte fakturaer som ikke er betalt
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "PENDING",
        dueDate: {
          lt: now,
        },
      },
      include: {
        tenant: {
          include: {
            subscription: true,
          },
        },
      },
    });

    let suspended = 0;

    for (const invoice of overdueInvoices) {
      // Marker faktura som forfalt
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "OVERDUE" },
      });

      // Suspender tenant hvis ikke allerede suspendert
      if (invoice.tenant.status !== "SUSPENDED") {
        await prisma.tenant.update({
          where: { id: invoice.tenantId },
          data: { status: "SUSPENDED" },
        });

        // Send varsel-e-post
        if (process.env.RESEND_API_KEY && invoice.tenant.contactEmail) {
          try {
            await resend.emails.send({
              from: "HMS Nova <noreply@hmsnova.com>",
              to: invoice.tenant.contactEmail,
              subject: "⚠️ Din HMS Nova-konto er suspendert - Ubetalt faktura",
              html: getSuspensionEmail({
                companyName: invoice.tenant.name,
                invoiceNumber: invoice.id.slice(-8).toUpperCase(),
                amount: invoice.amount,
                dueDate: invoice.dueDate,
              }),
            });
          } catch (emailError) {
            console.error("Failed to send suspension email:", emailError);
          }
        }

        suspended++;
      }
    }

    return { success: true, suspended };
  } catch (error: any) {
    console.error("Check overdue invoices error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send varsel 3 dager før prøveperioden utløper
 * Minner kunden om at de må betale for å fortsette
 */
export async function sendTrialExpiringReminders() {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const fourDaysFromNow = new Date();
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
    fourDaysFromNow.setHours(0, 0, 0, 0);

    // Finn alle tenants med prøveperiode som utløper om 3 dager
    const tenants = await prisma.tenant.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: {
          gte: threeDaysFromNow,
          lte: fourDaysFromNow,
        },
      },
      include: {
        subscription: true,
        invoices: {
          where: {
            status: "PENDING",
          },
          take: 1,
        },
      },
    });

    let sent = 0;

    for (const tenant of tenants) {
      if (!tenant.contactEmail || tenant.invoices.length === 0) continue;

      const invoice = tenant.invoices[0];

      try {
        await resend.emails.send({
          from: "HMS Nova <noreply@hmsnova.com>",
          to: tenant.contactEmail,
          subject: "⏰ Din gratis prøveperiode utløper om 3 dager",
          html: getTrialExpiringEmail({
            companyName: tenant.name,
            trialEndsAt: tenant.trialEndsAt!,
            amount: invoice.amount,
            dueDate: invoice.dueDate,
            invoiceNumber: invoice.id.slice(-8).toUpperCase(),
          }),
        });

        sent++;
      } catch (emailError) {
        console.error(`Failed to send trial expiring email to ${tenant.contactEmail}:`, emailError);
      }
    }

    return { success: true, sent };
  } catch (error: any) {
    console.error("Send trial expiring reminders error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Synkroniser fakturaer med Fiken API
 * Henter betalingsstatus fra Fiken og oppdaterer vår database
 */
export async function syncInvoicesWithFiken() {
  try {
    if (!process.env.FIKEN_API_TOKEN || !process.env.FIKEN_COMPANY_SLUG) {
      return { success: false, error: "Fiken API ikke konfigurert" };
    }

    const fikenClient = new FikenClient({
      apiToken: process.env.FIKEN_API_TOKEN,
      companySlug: process.env.FIKEN_COMPANY_SLUG,
    });

    // Finn alle fakturaer som ikke er betalt ennå
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: ["PENDING", "SENT", "OVERDUE"],
        },
        fikenInvoiceId: {
          not: null,
        },
      },
      include: {
        tenant: true,
      },
    });

    let updated = 0;
    let reactivated = 0;

    for (const invoice of pendingInvoices) {
      if (!invoice.fikenInvoiceId) continue;

      try {
        let isPaid = false;

        // Sjekk om det er en recurring sale eller vanlig invoice
        if (invoice.fikenInvoiceId.startsWith("sale-")) {
          const saleId = invoice.fikenInvoiceId.replace("sale-", "");
          const sale = await fikenClient.getSale(saleId);
          isPaid = (sale as any)?.paid === true;
        } else {
          const fikenInvoice = await fikenClient.getInvoice(invoice.fikenInvoiceId);
          isPaid = (fikenInvoice as any)?.paid === true;
        }

        if (isPaid) {
          // Oppdater faktura og reaktiver tenant i én transaksjon
          await prisma.$transaction(async (tx) => {
            await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                status: "PAID",
                paidDate: new Date(),
              },
            });

            // Reaktiver tenant hvis suspendert
            if (invoice.tenant.status === "SUSPENDED") {
              await tx.tenant.update({
                where: { id: invoice.tenantId },
                data: { status: "ACTIVE" },
              });

              // Send bekreftelse på betaling
              if (process.env.RESEND_API_KEY && invoice.tenant.contactEmail) {
                try {
                  await resend.emails.send({
                    from: "HMS Nova <noreply@hmsnova.com>",
                    to: invoice.tenant.contactEmail,
                    subject: "✅ Betaling mottatt - HMS Nova er aktiv igjen!",
                    html: getPaymentConfirmationEmail({
                      companyName: invoice.tenant.name,
                      invoiceNumber: invoice.id.slice(-8).toUpperCase(),
                      amount: invoice.amount,
                    }),
                  });
                } catch (emailError) {
                  console.error("Failed to send payment confirmation email:", emailError);
                }
              }

              reactivated++;
            }
          });

          updated++;
          console.log(`[Fiken Sync] Marked invoice ${invoice.id} as paid (Fiken: ${invoice.fikenInvoiceId})`);
        }
      } catch (error) {
        console.error(`[Fiken Sync] Failed to check invoice ${invoice.id}:`, error);
      }
    }

    console.log(`[Fiken Sync] Updated ${updated} invoices, reactivated ${reactivated} tenants`);
    return { success: true, updated, reactivated };
  } catch (error: any) {
    console.error("Sync invoices with Fiken error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Marker faktura som betalt manuelt (fallback hvis Fiken API feiler)
 */
export async function markInvoiceAsPaid(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { tenant: true },
    });

    if (!invoice) {
      return { success: false, error: "Faktura ikke funnet" };
    }

    // Oppdater faktura og reaktiver tenant
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          paidDate: new Date(),
        },
      });

      // Reaktiver tenant hvis suspendert
      if (invoice.tenant.status === "SUSPENDED") {
        await tx.tenant.update({
          where: { id: invoice.tenantId },
          data: { status: "ACTIVE" },
        });
      }
    });

    // Send bekreftelse på betaling
    if (process.env.RESEND_API_KEY && invoice.tenant.contactEmail) {
      try {
        await resend.emails.send({
          from: "HMS Nova <noreply@hmsnova.com>",
          to: invoice.tenant.contactEmail,
          subject: "✅ Betaling mottatt - HMS Nova",
          html: getPaymentConfirmationEmail({
            companyName: invoice.tenant.name,
            invoiceNumber: invoiceId.slice(-8).toUpperCase(),
            amount: invoice.amount,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send payment confirmation email:", emailError);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Mark invoice as paid error:", error);
    return { success: false, error: error.message };
  }
}

// E-post templates
function getInvoiceEmail(data: {
  companyName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  plan: string;
  useEHF: boolean;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #2d9c92 0%, #42c6b8 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                      📄 Faktura fra HMS Nova
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hei ${data.companyName},
                    </p>
                    
                    <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                      Takk for at du valgte HMS Nova! Her er fakturaen for ditt årsabonnement.
                    </p>

                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #f9f9f9; border-radius: 8px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 30px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                <strong style="color: #1a1a1a;">Fakturanummer:</strong>
                              </td>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                                <span style="color: #666;">${data.invoiceNumber}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                <strong style="color: #1a1a1a;">Produkt:</strong>
                              </td>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                                <span style="color: #666;">HMS Nova ${data.plan}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                <strong style="color: #1a1a1a;">Beløp:</strong>
                              </td>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                                <span style="color: #2d9c92; font-size: 18px; font-weight: 600;">
                                  ${data.amount.toLocaleString("nb-NO")} kr
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0;">
                                <strong style="color: #1a1a1a;">Forfallsdato:</strong>
                              </td>
                              <td style="padding: 12px 0; text-align: right;">
                                <span style="color: #d32f2f; font-weight: 600;">
                                  ${new Date(data.dueDate).toLocaleDateString("nb-NO", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${data.useEHF ? `
                      <div style="background: #e8f6f4; border-left: 4px solid #2d9c92; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #1a1a1a; font-weight: 600;">
                          ✅ EHF-faktura sendes automatisk
                        </p>
                        <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
                          Fakturaen sendes til ditt EHF-system innen kort tid.
                        </p>
                      </div>
                    ` : `
                      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #1a1a1a; font-weight: 600;">
                          📧 Faktura sendes per e-post
                        </p>
                        <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
                          Du vil motta fakturaen som PDF på e-post.
                        </p>
                      </div>
                    `}

                    <div style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 20px; margin: 30px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #1a1a1a; font-weight: 600;">
                        ⚠️ Viktig informasjon
                      </p>
                      <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
                        Hvis fakturaen ikke betales innen forfallsdato, vil tilgangen til HMS Nova bli suspendert automatisk.
                      </p>
                    </div>

                    <p style="color: #666; font-size: 14px; margin: 30px 0 0;">
                      Har du spørsmål om fakturaen?<br/>
                      📧 <a href="mailto:support@hmsnova.com" style="color: #2d9c92; text-decoration: none;">support@hmsnova.com</a><br/>
                      📞 <a href="tel:+4799112916" style="color: #2d9c92; text-decoration: none;">+47 99 11 29 16</a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 30px 40px; background: #f9f9f9; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="margin: 0; color: #999; font-size: 12px;">
                      © ${new Date().getFullYear()} HMS Nova. Alle rettigheter reservert.
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

function getSuspensionEmail(data: {
  companyName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #d32f2f; margin-bottom: 20px;">⚠️ Din HMS Nova-konto er suspendert</h1>
          
          <p>Hei ${data.companyName},</p>
          
          <p>Vi har dessverre måttet suspendere tilgangen til HMS Nova på grunn av ubetalt faktura.</p>
          
          <div style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 20px; margin: 30px 0;">
            <p><strong>Fakturanummer:</strong> ${data.invoiceNumber}</p>
            <p><strong>Beløp:</strong> ${data.amount.toLocaleString("nb-NO")} kr</p>
            <p><strong>Opprinnelig forfallsdato:</strong> ${new Date(data.dueDate).toLocaleDateString("nb-NO")}</p>
          </div>
          
          <p>For å reaktivere kontoen, vennligst betal fakturaen. Tilgangen vil bli gjenopprettet automatisk når vi mottar betalingen.</p>
          
          <p>Kontakt oss på <a href="mailto:support@hmsnova.com">support@hmsnova.com</a> eller ring +47 99 11 29 16 hvis du har spørsmål.</p>
          
          <p>Med vennlig hilsen,<br/>HMS Nova Team</p>
        </div>
      </body>
    </html>
  `;
}

function getPaymentConfirmationEmail(data: {
  companyName: string;
  invoiceNumber: string;
  amount: number;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #2d9c92; margin-bottom: 20px;">✅ Betaling mottatt</h1>
          
          <p>Hei ${data.companyName},</p>
          
          <p>Vi har mottatt betaling for faktura ${data.invoiceNumber}. Takk!</p>
          
          <div style="background: #e8f6f4; border-left: 4px solid #2d9c92; padding: 20px; margin: 30px 0;">
            <p><strong>Beløp betalt:</strong> ${data.amount.toLocaleString("nb-NO")} kr</p>
            <p><strong>Status:</strong> Betalt</p>
          </div>
          
          <p>Din HMS Nova-konto er nå aktiv og klar til bruk.</p>
          
          <p>Med vennlig hilsen,<br/>HMS Nova Team</p>
        </div>
      </body>
    </html>
  `;
}

