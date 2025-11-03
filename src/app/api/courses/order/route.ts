import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface CourseOrderData {
  company: string;
  orgNr?: string;
  name: string;
  email: string;
  phone: string;
  courseType: string;
  participants?: number;
  format: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: CourseOrderData = await request.json();

    // Validering
    if (!data.company || !data.name || !data.email || !data.phone || !data.courseType || !data.format) {
      return NextResponse.json(
        { error: "Mangler påkrevde felt" },
        { status: 400 }
      );
    }

    // Sjekk om bedriften er HMS Nova-medlem (hvis org.nr er oppgitt)
    let isMember = false;
    let memberDiscount = 0;
    let tenant = null;

    if (data.orgNr) {
      // Fjern mellomrom og bindestrek fra org.nr
      const cleanOrgNr = data.orgNr.replace(/[\s-]/g, "");

      tenant = await prisma.tenant.findFirst({
        where: {
          orgNumber: cleanOrgNr,
          status: {
            in: ["ACTIVE", "TRIAL"],
          },
        },
      });

      if (tenant) {
        isMember = true;
        memberDiscount = 20; // 20% rabatt for medlemmer
      }
    }

    // Kursinfo mapping (priser fra kurshms.md)
    const courseInfo: Record<string, { name: string; price: number }> = {
      verneombud: { name: "Grunnleggende HMS for verneombud (40t)", price: 7500 },
      leder: { name: "Lovpålagt HMS for ledere (§3-5 AML)", price: 1990 },
      psykososialt: { name: "Psykososialt arbeidsmiljø", price: 4000 },
      fallsikring: { name: "Fallsikring og høydearbeid", price: 5200 },
      asbest: { name: "Asbest og farlige materialer", price: 5000 },
      maskinsikkerhet: { name: "Maskinsikkerhet og verneutstyr", price: 5000 },
      kjemikalie: { name: "Kjemikaliehåndtering inkl. diisocyanater", price: 1300 }, // Samme som diisocyanater
      vold: { name: "Vold og trusler – forebygging og håndtering", price: 4000 },
      ergonomi: { name: "Ergonomi og forflytningsteknikk", price: 4000 },
      trafikk: { name: "Trafikksikkerhet og lastsikring", price: 4000 },
      truck: { name: "Truck- og maskinførerkurs", price: 6500 },
      digital: { name: "Digital sikkerhet for offentlig ansatte", price: 990 },
      inneklima: { name: "Inneklima og psykososialt miljø", price: 4000 },
      "forstehjelp-barn": { name: "Førstehjelp for barn", price: 4500 },
      "forstehjelp-voksne": { name: "Førstehjelp for voksne", price: 4500 },
      annet: { name: "Annet kurs", price: 0 },
    };

    const selectedCourse = courseInfo[data.courseType] || { name: "Ukjent kurs", price: 0 };
    const basePrice = selectedCourse.price * (data.participants || 1);
    const discountAmount = isMember ? Math.round(basePrice * (memberDiscount / 100)) : 0;
    const finalPrice = basePrice - discountAmount;

    // Send e-post til KKS AS (Kurs-ansvarlig)
    const kursEmail = "kurs@kksas.no"; // Eller +4791540824@sms.example.com hvis SMS
    
    await resend.emails.send({
      from: "HMS Nova Kurs <kurs@hmsnova.com>",
      to: kursEmail,
      subject: `🎓 Ny kursbestilling${isMember ? " (HMS Nova-medlem - 20% rabatt)" : ""}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a; }
              .label { font-weight: bold; color: #16a34a; }
              .member-badge { background: #dcfce7; color: #15803d; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }
              .price-table { width: 100%; margin: 20px 0; }
              .price-table td { padding: 10px; }
              .price-table .total { font-size: 1.3em; font-weight: bold; color: #16a34a; border-top: 2px solid #16a34a; }
              .discount { color: #15803d; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎓 Ny kursbestilling</h1>
                ${isMember ? '<div class="member-badge">✨ HMS Nova-medlem - 20% rabatt</div>' : ''}
              </div>
              <div class="content">
                <div class="info-box">
                  <h2>📋 Bedriftsinfo</h2>
                  <p><span class="label">Bedrift:</span> ${data.company}</p>
                  ${data.orgNr ? `<p><span class="label">Org.nr:</span> ${data.orgNr}${isMember ? ' <span class="discount">(Verifisert medlem ✓)</span>' : ''}</p>` : ''}
                  <p><span class="label">Kontaktperson:</span> ${data.name}</p>
                  <p><span class="label">E-post:</span> ${data.email}</p>
                  <p><span class="label">Telefon:</span> ${data.phone}</p>
                </div>

                <div class="info-box">
                  <h2>🎯 Kursinfo</h2>
                  <p><span class="label">Kurs:</span> ${selectedCourse.name}</p>
                  ${data.participants ? `<p><span class="label">Antall deltakere:</span> ${data.participants}</p>` : ''}
                  <p><span class="label">Format:</span> ${data.format}</p>
                  ${data.message ? `<p><span class="label">Melding:</span><br>${data.message.replace(/\n/g, '<br>')}</p>` : ''}
                </div>

                ${selectedCourse.price > 0 ? `
                  <div class="info-box">
                    <h2>💰 Prisoverslag</h2>
                    <table class="price-table">
                      <tr>
                        <td>Kurspris (${data.participants || 1} deltaker${data.participants && data.participants > 1 ? 'e' : ''}):</td>
                        <td style="text-align: right;">${basePrice.toLocaleString('nb-NO')} kr</td>
                      </tr>
                      ${isMember ? `
                        <tr>
                          <td class="discount">HMS Nova-rabatt (20%):</td>
                          <td style="text-align: right;" class="discount">-${discountAmount.toLocaleString('nb-NO')} kr</td>
                        </tr>
                        <tr class="total">
                          <td>Total pris:</td>
                          <td style="text-align: right;">${finalPrice.toLocaleString('nb-NO')} kr</td>
                        </tr>
                      ` : `
                        <tr class="total">
                          <td>Total pris:</td>
                          <td style="text-align: right;">${finalPrice.toLocaleString('nb-NO')} kr</td>
                        </tr>
                      `}
                    </table>
                    <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                      <em>* Dette er et estimat. Endelig pris avtales direkte med kunden.</em>
                    </p>
                  </div>
                ` : ''}

                <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                  <p style="margin: 0;"><strong>⏰ Handling påkrevd:</strong></p>
                  <p style="margin: 5px 0 0 0;">Kontakt kunden innen 24 timer for å avtale dato og detaljer.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // Send bekreftelse til kunden
    await resend.emails.send({
      from: "HMS Nova Kurs <kurs@hmsnova.com>",
      to: data.email,
      subject: `Bekreftelse på kursbestilling - ${selectedCourse.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .logo { font-size: 2em; margin-bottom: 10px; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .member-badge { background: #dcfce7; color: #15803d; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 15px 0; font-size: 1.1em; }
              .cta-button { background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 0.9em; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🎓</div>
                <h1>Takk for kursbestillingen!</h1>
                <p style="margin: 0;">Vi har mottatt din bestilling</p>
              </div>
              <div class="content">
                ${isMember ? `
                  <div style="text-align: center;">
                    <div class="member-badge">🎉 Du får 20% HMS Nova-medlemsrabatt!</div>
                  </div>
                ` : ''}

                <div class="info-box">
                  <h2>📋 Din bestilling</h2>
                  <p><strong>Kurs:</strong> ${selectedCourse.name}</p>
                  ${data.participants ? `<p><strong>Antall deltakere:</strong> ${data.participants}</p>` : ''}
                  <p><strong>Format:</strong> ${data.format}</p>
                  ${selectedCourse.price > 0 ? `
                    <p><strong>Estimert pris:</strong> ${finalPrice.toLocaleString('nb-NO')} kr ${isMember ? `<span style="color: #15803d;">(Spart ${discountAmount.toLocaleString('nb-NO')} kr!)</span>` : ''}</p>
                  ` : ''}
                </div>

                <div class="info-box">
                  <h2>⏰ Hva skjer nå?</h2>
                  <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Vi kontakter deg innen <strong>24 timer</strong></li>
                    <li>Vi avtaler dato og opplegg som passer din bedrift</li>
                    <li>Du mottar bekreftelse med alle detaljer</li>
                    <li>Kurset gjennomføres med våre godkjente instruktører</li>
                    ${isMember ? '<li>Sertifikater registreres automatisk i HMS Nova</li>' : ''}
                  </ol>
                </div>

                ${!isMember && data.orgNr ? `
                  <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e40af;">💡 Visste du at...</h3>
                    <p>Som HMS Nova-medlem får du <strong>20% rabatt</strong> på alle HMS-kurs!</p>
                    <a href="https://hmsnova.com/priser" class="cta-button">Se HMS Nova-medlemskap</a>
                  </div>
                ` : ''}

                <div class="info-box">
                  <h2>📞 Kontakt oss</h2>
                  <p><strong>Kurs:</strong> +47 91 54 08 24<br>
                  <strong>E-post:</strong> kurs@kksas.no</p>
                </div>

                <div class="footer">
                  <p><strong>HMS Nova</strong> - utviklet av KKS AS<br>
                  Godkjent kursleverandør | ISO 9001 sertifisert</p>
                  <p style="font-size: 0.85em; color: #999; margin-top: 15px;">
                    <a href="https://hmsnova.com" style="color: #16a34a; text-decoration: none;">hmsnova.com</a> | 
                    <a href="https://www.kksas.no" style="color: #16a34a; text-decoration: none;">kksas.no</a>
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      isMember,
      discount: memberDiscount,
      basePrice,
      finalPrice,
      discountAmount,
    });

  } catch (error) {
    console.error("Course order error:", error);
    return NextResponse.json(
      { error: "Kunne ikke registrere kursbestilling" },
      { status: 500 }
    );
  }
}

