/**
 * Email Templates for HMS Nova
 * 
 * Professional HTML email templates with inline styles for maximum compatibility.
 * Uses HMS Nova brand colors: Primary (Teal) and Accent (Green)
 */

import fs from 'fs';
import path from 'path';

// Helper function to get logo as base64
function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-nova.png');
    const logoBuffer = fs.readFileSync(logoPath);
    const base64Logo = logoBuffer.toString('base64');
    return `data:image/png;base64,${base64Logo}`;
  } catch (error) {
    console.error('Failed to load logo:', error);
    // Fallback: HMS Nova text logo
    return '';
  }
}

interface DocumentDeliveryEmailProps {
  companyName: string;
  email: string;
  documentId: string;
  downloadLinks: {
    register?: string;   // HMS-00: Dokumentregister
    handbook?: string;   // HMS-01: HMS-håndbok
    risk?: string;       // HMS-02: Risikovurdering
    training?: string;   // HMS-03: Opplæringsplan
    vernerunde?: string; // HMS-04: Vernerunde / Sjekkliste
    amu?: string;        // HMS-05: AMU møteprotokoll
    zip?: string;        // Komplett pakke (ZIP)
  };
}

export function getDocumentDeliveryEmail({
  companyName,
  email,
  documentId,
  downloadLinks,
}: DocumentDeliveryEmailProps): { subject: string; html: string } {
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hmsnova.com";
  const logoBase64 = getLogoBase64();
  
  const html = `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Din HMS-pakke er klar!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2d9c92 0%, #3db88a 100%); padding: 40px 40px 30px; text-align: center;">
              <img src="${logoBase64}" alt="HMS Nova" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 600; letter-spacing: -0.5px;">
                Din HMS-pakke er klar! 📦
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hei!
              </p>
              
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Takk for at du brukte HMS Nova sin HMS-dokumentgenerator. Vi har laget en skreddersydd HMS-pakke for <strong>${companyName}</strong>.
              </p>
              
              <!-- Download Buttons -->
              <h3 style="color: #1a1a1a; font-size: 18px; margin: 0 0 15px; font-weight: 600;">
                Last ned dokumentene dine:
              </h3>
              
              ${downloadLinks.zip ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${downloadLinks.zip}" style="display: inline-block; background-color: #2d9c92; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-bottom: 10px;">
                      📦 Last ned hele pakken (ZIP)
                    </a>
                  </td>
                </tr>
              </table>
              ` : ""}
              
              <p style="color: #666; font-size: 14px; margin: 0 0 20px; text-align: center;">
                Eller last ned enkeltdokumenter:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                ${downloadLinks.register ? `
                <tr>
                  <td style="padding: 8px;">
                    <a href="${downloadLinks.register}" style="display: block; background-color: #f9fafb; color: #1a1a1a; text-decoration: none; padding: 12px 16px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px;">
                      📑 HMS-00: Dokumentregister (.docx)
                    </a>
                  </td>
                </tr>
                ` : ""}
                ${downloadLinks.handbook ? `
                <tr>
                  <td style="padding: 8px;">
                    <a href="${downloadLinks.handbook}" style="display: block; background-color: #f9fafb; color: #1a1a1a; text-decoration: none; padding: 12px 16px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px;">
                      📘 HMS-01: HMS-håndbok (.docx)
                    </a>
                  </td>
                </tr>
                ` : ""}
                ${downloadLinks.risk ? `
                <tr>
                  <td style="padding: 8px;">
                    <a href="${downloadLinks.risk}" style="display: block; background-color: #f9fafb; color: #1a1a1a; text-decoration: none; padding: 12px 16px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px;">
                      ⚠️ HMS-02: Risikovurdering (.docx)
                    </a>
                  </td>
                </tr>
                ` : ""}
                ${downloadLinks.training ? `
                <tr>
                  <td style="padding: 8px;">
                    <a href="${downloadLinks.training}" style="display: block; background-color: #f9fafb; color: #1a1a1a; text-decoration: none; padding: 12px 16px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px;">
                      🎓 HMS-03: Opplæringsplan (.docx)
                    </a>
                  </td>
                </tr>
                ` : ""}
                ${downloadLinks.vernerunde ? `
                <tr>
                  <td style="padding: 8px;">
                    <a href="${downloadLinks.vernerunde}" style="display: block; background-color: #f9fafb; color: #1a1a1a; text-decoration: none; padding: 12px 16px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px;">
                      🔍 HMS-04: Vernerunde-sjekkliste (.docx)
                    </a>
                  </td>
                </tr>
                ` : ""}
                ${downloadLinks.amu ? `
                <tr>
                  <td style="padding: 8px;">
                    <a href="${downloadLinks.amu}" style="display: block; background-color: #f9fafb; color: #1a1a1a; text-decoration: none; padding: 12px 16px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px;">
                      📋 HMS-05: AMU-møteprotokoll (.docx)
                    </a>
                  </td>
                </tr>
                ` : ""}
              </table>
              
              <!-- DOCX Info -->
              <p style="color: #3db88a; font-size: 13px; margin: 0 0 20px; padding: 12px; background-color: #f0fdf4; border-radius: 4px; text-align: center; border: 1px solid #d1fae5;">
                ✅ <strong>Alle dokumenter er editerbare Word-filer (.docx)</strong> - åpne i Microsoft Word, Google Docs eller LibreOffice og tilpass etter dine behov!
              </p>
              
              <!-- Expiration Warning -->
              <p style="color: #dc2626; font-size: 13px; margin: 0 0 30px; padding: 12px; background-color: #fef2f2; border-radius: 4px; text-align: center; border: 1px solid #fee2e2;">
                ⚠️ Viktig: Nedlastingslenkene er gyldige i <strong>7 dager</strong>. Last ned dokumentene nå!
              </p>
              
              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-left: 4px solid #3db88a; border-radius: 4px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 10px; font-weight: 600;">
                      💡 Klar for mer?
                    </h3>
                    <p style="color: #666; font-size: 14px; margin: 0 0 15px; line-height: 1.6;">
                      Dette er bare starten! Med HMS Nova får du et komplett, levende HMS-system med:
                    </p>
                    <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                      <li>Digital signatur (BankID)</li>
                      <li>Automatiske påminnelser</li>
                      <li>Hendelsesrapportering med 5-Whys</li>
                      <li>Opplæringsmodul med kompetansematrise</li>
                      <li>Mobilapp for vernerunder</li>
                      <li>ISO 9001 compliance på autopilot</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}/registrer-bedrift" style="display: inline-block; background-color: #3db88a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Registrer bedrift - prøv gratis i 14 dager
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666; font-size: 14px; text-align: center; margin: 30px 0 0;">
                Har du spørsmål? Ta kontakt med oss på<br/>
                📧 <a href="mailto:support@hmsnova.com" style="color: #2d9c92; text-decoration: none;">support@hmsnova.com</a> eller
                📞 <a href="tel:+4799112916" style="color: #2d9c92; text-decoration: none;">+47 99 11 29 16</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px; line-height: 1.5;">
                HMS Nova - Norges mest intuitive HMS-system<br/>
                ISO 9001 compliance på autopilot
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                <a href="${dashboardUrl}" style="color: #2d9c92; text-decoration: none; margin: 0 8px;">hmsnova.no</a> |
                <a href="${dashboardUrl}/priser" style="color: #2d9c92; text-decoration: none; margin: 0 8px;">Priser</a> |
                <a href="${dashboardUrl}/hva-er-hms-nova" style="color: #2d9c92; text-decoration: none; margin: 0 8px;">Om oss</a>
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
  
  return {
    subject: `Din HMS-pakke er klar! 📦`,
    html,
  };
}

interface CustomerWelcomeEmailProps {
  contactPerson: string;
  companyName: string;
  orgNumber: string;
  employeeCount: string;
  pricingTier: string;
  yearlyPrice: number;
}

export function getCustomerWelcomeEmail({
  contactPerson,
  companyName,
  orgNumber,
  employeeCount,
  pricingTier,
  yearlyPrice,
}: CustomerWelcomeEmailProps): string {
  const logoBase64 = getLogoBase64();
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hmsnova.com";
  
  return `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Velkommen til HMS Nova</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #2d9c92 0%, #3db88a 100%); padding: 40px 40px 30px; text-align: center;">
              <img src="${logoBase64}" alt="HMS Nova" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 600; letter-spacing: -0.5px;">
                Velkommen til HMS Nova! 🎉
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hei <strong>${contactPerson}</strong>,
              </p>
              
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Takk for at du valgte HMS Nova! Vi har mottatt din registrering og jobber med å sette opp din konto.
              </p>
              
              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-left: 4px solid #3db88a; border-radius: 4px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 15px; font-weight: 600;">
                      📋 Din registrering
                    </h3>
                    <table cellpadding="0" cellspacing="0" style="width: 100%; font-size: 14px;">
                      <tr>
                        <td style="color: #666; padding: 4px 0; width: 40%;">Bedrift:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 500;">${companyName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Org.nr:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 500;">${orgNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Antall ansatte:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 500;">${employeeCount}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Pris per år:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 500;">${yearlyPrice.toLocaleString('nb-NO')} kr (eks. mva)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Next Steps -->
              <h3 style="color: #1a1a1a; font-size: 18px; margin: 30px 0 15px; font-weight: 600;">
                Hva skjer nå?
              </h3>
              
              <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="vertical-align: top; padding-right: 15px; width: 30px;">
                    <div style="background-color: #2d9c92; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">1</div>
                  </td>
                  <td style="padding-bottom: 15px;">
                    <strong style="color: #1a1a1a; font-size: 15px;">Vi setter opp din konto</strong>
                    <p style="color: #666; font-size: 14px; margin: 5px 0 0; line-height: 1.5;">
                      Vi konfigurerer systemet med ferdig HMS-håndbok og alle nødvendige moduler.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align: top; padding-right: 15px;">
                    <div style="background-color: #2d9c92; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">2</div>
                  </td>
                  <td style="padding-bottom: 15px;">
                    <strong style="color: #1a1a1a; font-size: 15px;">Du mottar innloggingsinformasjon</strong>
                    <p style="color: #666; font-size: 14px; margin: 5px 0 0; line-height: 1.5;">
                      Innen 24 timer sender vi deg en lenke for å sette passord og logge inn.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align: top; padding-right: 15px;">
                    <div style="background-color: #2d9c92; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">3</div>
                  </td>
                  <td style="padding-bottom: 15px;">
                    <strong style="color: #1a1a1a; font-size: 15px;">Personlig onboarding-samtale</strong>
                    <p style="color: #666; font-size: 14px; margin: 5px 0 0; line-height: 1.5;">
                      Vi tar kontakt for en kort gjennomgang av systemet (15-30 min).
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align: top; padding-right: 15px;">
                    <div style="background-color: #3db88a; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">✓</div>
                  </td>
                  <td>
                    <strong style="color: #1a1a1a; font-size: 15px;">Du er i gang!</strong>
                    <p style="color: #666; font-size: 14px; margin: 5px 0 0; line-height: 1.5;">
                      14 dagers gratis prøveperiode starter når du logger inn første gang.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}/gratis-hms-system" style="display: inline-block; background-color: #2d9c92; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Last ned gratis HMS-pakke mens du venter
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Contact Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-top: 30px;">
                <tr>
                  <td>
                    <p style="color: #1a1a1a; font-size: 14px; margin: 0 0 10px; font-weight: 600;">
                      Har du spørsmål i mellomtiden?
                    </p>
                    <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
                      📧 <a href="mailto:support@hmsnova.com" style="color: #2d9c92; text-decoration: none;">support@hmsnova.com</a><br/>
                      📞 <a href="tel:+4799112916" style="color: #2d9c92; text-decoration: none;">+47 99 11 29 16</a>
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 30px 0 0;">
                Med vennlig hilsen,<br/>
                <strong>HMS Nova-teamet</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px; line-height: 1.5;">
                HMS Nova - Norges mest intuitive HMS-system<br/>
                ISO 9001 compliance på autopilot
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                <a href="${dashboardUrl}" style="color: #2d9c92; text-decoration: none; margin: 0 8px;">Besøk hmsnova.no</a> |
                <a href="${dashboardUrl}/priser" style="color: #2d9c92; text-decoration: none; margin: 0 8px;">Se priser</a> |
                <a href="${dashboardUrl}/hva-er-hms-nova" style="color: #2d9c92; text-decoration: none; margin: 0 8px;">Om oss</a>
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

interface AdminNotificationEmailProps {
  companyName: string;
  orgNumber: string;
  employeeCount: string;
  industry: string;
  pricingTier: string;
  yearlyPrice: number;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  useEHF: boolean;
  invoiceEmail?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  notes?: string;
  tenantId: string;
}

export function getAdminNotificationEmail({
  companyName,
  orgNumber,
  employeeCount,
  industry,
  pricingTier,
  yearlyPrice,
  contactPerson,
  contactEmail,
  contactPhone,
  useEHF,
  invoiceEmail,
  address,
  postalCode,
  city,
  notes,
  tenantId,
}: AdminNotificationEmailProps): string {
  const logoBase64 = getLogoBase64();
  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://hmsnova.com"}/admin/tenants`;
  
  return `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ny registrering - ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 30px 40px; text-align: center;">
              <img src="${logoBase64}" alt="HMS Nova" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">
                🎯 Ny bedriftsregistrering
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Bedriftsinformasjon -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-left: 4px solid #3db88a; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 15px; font-weight: 600;">
                      🏢 Bedriftsinformasjon
                    </h3>
                    <table cellpadding="0" cellspacing="0" style="width: 100%; font-size: 14px;">
                      <tr>
                        <td style="color: #666; padding: 4px 0; width: 40%;">Bedriftsnavn:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 600;">${companyName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Org.nr:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 500;">${orgNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Antall ansatte:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 500;">${employeeCount}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Bransje:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 500;">${industry}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Prisklasse:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 600;">${pricingTier} (${yearlyPrice.toLocaleString('nb-NO')} kr/år)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Kontaktperson -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #2d9c92; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 15px; font-weight: 600;">
                      👤 Kontaktperson
                    </h3>
                    <table cellpadding="0" cellspacing="0" style="width: 100%; font-size: 14px;">
                      <tr>
                        <td style="color: #666; padding: 4px 0; width: 40%;">Navn:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 600;">${contactPerson}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">E-post:</td>
                        <td style="color: #1a1a1a; padding: 4px 0;"><a href="mailto:${contactEmail}" style="color: #2d9c92; text-decoration: none;">${contactEmail}</a></td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Telefon:</td>
                        <td style="color: #1a1a1a; padding: 4px 0;"><a href="tel:${contactPhone}" style="color: #2d9c92; text-decoration: none;">${contactPhone}</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Fakturainfo -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 15px; font-weight: 600;">
                      💳 Fakturainfo
                    </h3>
                    <table cellpadding="0" cellspacing="0" style="width: 100%; font-size: 14px;">
                      <tr>
                        <td style="color: #666; padding: 4px 0; width: 40%;">EHF-faktura:</td>
                        <td style="color: #1a1a1a; padding: 4px 0; font-weight: 500;">${useEHF ? "✅ Ja" : "❌ Nei"}</td>
                      </tr>
                      ${invoiceEmail ? `
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Faktura e-post:</td>
                        <td style="color: #1a1a1a; padding: 4px 0;"><a href="mailto:${invoiceEmail}" style="color: #2d9c92; text-decoration: none;">${invoiceEmail}</a></td>
                      </tr>
                      ` : ""}
                      ${!useEHF && address ? `
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Adresse:</td>
                        <td style="color: #1a1a1a; padding: 4px 0;">${address}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Postnummer:</td>
                        <td style="color: #1a1a1a; padding: 4px 0;">${postalCode}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 4px 0;">Poststed:</td>
                        <td style="color: #1a1a1a; padding: 4px 0;">${city}</td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>
              
              ${notes ? `
              <!-- Kommentar -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 10px; font-weight: 600;">
                      💬 Kommentar fra kunde
                    </h3>
                    <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
                      "${notes}"
                    </p>
                  </td>
                </tr>
              </table>
              ` : ""}
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}" style="display: inline-block; background-color: #2d9c92; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Gå til Admin-panel
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666; font-size: 12px; text-align: center; margin: 20px 0 0;">
                Tenant ID: <code style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${tenantId}</code>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                HMS Nova Admin Notification
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
