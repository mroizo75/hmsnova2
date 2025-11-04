import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Verify Fiken webhook signature
 */
function verifyFikenSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("[Fiken Webhook] Signature verification error:", error);
    return false;
  }
}

/**
 * Webhook fra Fiken når faktura betales
 * https://api.fiken.no/api/v2/docs/#webhooks
 * 
 * Dette er den PRIMÆRE måten vi får vite at en faktura er betalt på.
 * Gir umiddelbar reaktivering av kontoen når kunde betaler.
 */
export async function POST(request: NextRequest) {
  try {
    // Verifiser at requesten kommer fra Fiken
    const fikenSignature = request.headers.get("X-Fiken-Signature");
    const webhookSecret = process.env.FIKEN_WEBHOOK_SECRET;

    if (!fikenSignature || !webhookSecret) {
      console.warn("[Fiken Webhook] Missing signature or secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hent raw body for signature verification
    const rawBody = await request.text();
    
    // Verifiser signatur
    const isValid = verifyFikenSignature(rawBody, fikenSignature, webhookSecret);
    if (!isValid) {
      console.error("[Fiken Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    console.log("[Fiken Webhook] Received event:", body);

    // Fiken webhook format (må verifiseres med faktisk API):
    // {
    //   "event": "invoice.paid",
    //   "invoiceId": "123456",
    //   "companySlug": "hmsnova",
    //   "data": { ... }
    // }

    if (body.event === "invoice.paid" || body.event === "sale.paid") {
      const fikenInvoiceId = body.invoiceId || body.saleId;

      if (!fikenInvoiceId) {
        console.error("[Fiken Webhook] No invoice/sale ID in payload");
        return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });
      }

      // Finn fakturaen i vår database
      const invoice = await prisma.invoice.findFirst({
        where: {
          OR: [
            { fikenInvoiceId: fikenInvoiceId.toString() },
            { fikenInvoiceId: `sale-${fikenInvoiceId}` },
          ],
        },
        include: {
          tenant: true,
        },
      });

      if (!invoice) {
        console.warn(`[Fiken Webhook] Invoice not found: ${fikenInvoiceId}`);
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      // Sjekk om allerede betalt
      if (invoice.status === "PAID") {
        console.log(`[Fiken Webhook] Invoice ${invoice.id} already marked as paid`);
        return NextResponse.json({ message: "Already paid" }, { status: 200 });
      }

      // Oppdater faktura og reaktiver tenant
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

          console.log(`[Fiken Webhook] Reactivated tenant ${invoice.tenant.name}`);

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
              console.error("[Fiken Webhook] Failed to send confirmation email:", emailError);
            }
          }
        } else {
          // Tenant er TRIAL eller ACTIVE - oppdater bare fakturaen
          console.log(`[Fiken Webhook] Marked invoice ${invoice.id} as paid for ${invoice.tenant.name}`);
        }
      });

      console.log(`[Fiken Webhook] Successfully processed payment for invoice ${invoice.id}`);

      return NextResponse.json({ 
        message: "Payment processed",
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
      }, { status: 200 });
    }

    // Ignorer andre event typer
    console.log(`[Fiken Webhook] Ignoring event: ${body.event}`);
    return NextResponse.json({ message: "Event ignored" }, { status: 200 });

  } catch (error: any) {
    console.error("[Fiken Webhook] Error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error.message 
    }, { status: 500 });
  }
}

// E-post template for bekreftelse
function getPaymentConfirmationEmail(data: {
  companyName: string;
  invoiceNumber: string;
  amount: number;
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
                      ✅ Betaling mottatt!
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hei ${data.companyName},
                    </p>
                    
                    <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                      Vi har mottatt betalingen din. Takk for at du fortsetter med HMS Nova! 🎉
                    </p>

                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #e8f6f4; border-radius: 8px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 30px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #666;">Fakturanummer:</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <strong style="color: #1a1a1a;">${data.invoiceNumber}</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #666;">Beløp betalt:</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <strong style="color: #2d9c92; font-size: 18px;">${data.amount.toLocaleString("nb-NO")} kr</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #666;">Status:</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <strong style="color: #2d9c92;">✅ Betalt</strong>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="background: #e8f6f4; border-left: 4px solid #2d9c92; padding: 20px; margin: 30px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #1a1a1a; font-weight: 600;">
                        ✅ Din HMS Nova-konto er aktiv
                      </p>
                      <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
                        Du har full tilgang til alle funksjoner. Fortsett å jobbe trygt med HMS Nova!
                      </p>
                    </div>

                    <div style="text-align: center; margin: 40px 0 20px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://hmsnova.com"}/dashboard" 
                         style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #2d9c92 0%, #42c6b8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Logg inn til HMS Nova
                      </a>
                    </div>

                    <p style="color: #666; font-size: 14px; margin: 30px 0 0; text-align: center;">
                      Spørsmål eller tilbakemeldinger?<br/>
                      📧 <a href="mailto:support@hmsnova.com" style="color: #2d9c92; text-decoration: none;">support@hmsnova.com</a> | 
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

