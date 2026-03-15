/**
 * PROAKTIV SDS-OVERVÅKING
 * Tettere rutiner for å sikre oppdaterte sikkerhetsdatablad
 * 
 * Trigger: Daglig, ukentlig, månedlig
 */

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { searchSubstanceByCAS } from "@/lib/echa-api";
import { createNotification } from "@/server/actions/notification.actions";

/**
 * Daglig: Sjekk ECHA for omklassifiseringer
 */
export async function checkECHAReclassifications() {
  try {
    console.log("🔍 Sjekker ECHA for omklassifiseringer...");

    const chemicals = await prisma.chemical.findMany({
      where: {
        status: "ACTIVE",
        casNumber: { not: null },
      },
      include: {
        tenant: true,
      },
    });

    const reclassifications: Array<{
      chemical: any;
      oldClassification: string;
      newClassification: string;
      isCritical: boolean;
    }> = [];

    for (const chemical of chemicals) {
      if (!chemical.casNumber) continue;

      // Hent oppdatert data fra ECHA
      const echaData = await searchSubstanceByCAS(chemical.casNumber);
      if (!echaData) continue;

      // Sjekk om CMR-status har endret seg
      const oldCMR = chemical.isCMR;
      const newCMR = echaData.isCMR;

      if (oldCMR !== newCMR) {
        reclassifications.push({
          chemical,
          oldClassification: oldCMR ? "CMR" : "Ikke-CMR",
          newClassification: newCMR ? "CMR" : "Ikke-CMR",
          isCritical: newCMR, // Kritisk hvis nytt CMR-stoff
        });

        // Oppdater i database
        await prisma.chemical.update({
          where: { id: chemical.id },
          data: {
            isCMR: newCMR,
            isSVHC: echaData.isSVHC,
            lastEchaSync: new Date(),
          },
        });
      }

      // Vent litt mellom kall
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Send kritiske varsler
    for (const reclass of reclassifications.filter(r => r.isCritical)) {
      await sendCriticalReclassificationAlert(reclass);
    }

    console.log(`✅ ECHA-sjekk fullført: ${reclassifications.length} omklassifiseringer`);
    return { success: true, reclassifications: reclassifications.length };
  } catch (error) {
    console.error("❌ ECHA reclassification check failed:", error);
    throw error;
  }
}

/**
 * Send kritisk varsel om omklassifisering
 */
async function sendCriticalReclassificationAlert(reclass: any) {
  const { chemical } = reclass;

  // Finn HMS-ansvarlige
  const hmsUsers = await prisma.userTenant.findMany({
    where: {
      tenantId: chemical.tenantId,
      role: { in: ["ADMIN", "HMS"] },
    },
    include: { user: true },
  });

  for (const userTenant of hmsUsers) {
    const user = userTenant.user;

    // Opprett kritisk notifikasjon
    await createNotification({
      tenantId: chemical.tenantId,
      userId: user.id,
      type: "CHEMICAL_SDS_REVIEW",
      title: `🚨 KRITISK: ${chemical.productName} omklassifisert`,
      message: `ECHA har omklassifisert dette stoffet til CMR (kreftfremkallende/mutagent/reproduksjonstoksisk). Handling påkrevd innen 48 timer.`,
      link: `/dashboard/chemicals/${chemical.id}`,
    });

    // Send e-post (bruker innstillinger fra userTenant)
    if (user.email && userTenant.notifyByEmail) {
      await sendEmail({
        to: user.email,
        subject: "🚨 KRITISK: Kjemikalie omklassifisert til CMR",
        html: `
          <h2 style="color:#dc2626;">🚨 KRITISK VARSEL</h2>
          <p>Hei ${user.name || "der"},</p>
          
          <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:16px;margin:16px 0;">
            <h3 style="margin-top:0;">Kjemikalie omklassifisert av ECHA</h3>
            <p><strong>Produkt:</strong> ${chemical.productName}</p>
            <p><strong>CAS:</strong> ${chemical.casNumber}</p>
            <p><strong>Ny klassifisering:</strong> CMR (kreftfremkallende, mutagent, eller reproduksjonstoksisk)</p>
            <p><strong>Frist for handling:</strong> 48 timer</p>
          </div>

          <h3>Påkrevde tiltak:</h3>
          <ol>
            <li><strong>Last ned ny SDS</strong> fra leverandør (inneholder oppdatert klassifisering)</li>
            <li><strong>Oppdater risikovurdering</strong> for alle som bruker produktet</li>
            <li><strong>Vurder substitusjon</strong> - CMR-stoffer skal erstattes hvis mulig (Arbeidstilsynets krav)</li>
            <li><strong>Informer berørte ansatte</strong> om endret farestatus</li>
          </ol>

          <p>
            <a href="https://hmsnova.no/dashboard/chemicals/${chemical.id}" 
               style="display:inline-block;padding:12px 24px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;">
              Se kjemikalie i HMS Nova
            </a>
          </p>

          <p style="color:#666;font-size:14px;">
            Dette er en automatisk varsling fra HMS Nova sitt ECHA-overvåkingssystem.
          </p>
        `,
      });
    }
  }
}

/**
 * Ukentlig: Varsle om SDS >6 måneder gamle (forvarsel)
 */
export async function checkAgingSDS() {
  try {
    console.log("📅 Sjekker SDS-alder...");

    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
    });

    for (const tenant of tenants) {
      const agingChemicals = await prisma.chemical.findMany({
        where: {
          tenantId: tenant.id,
          status: "ACTIVE",
          sdsDate: {
            lt: sixMonthsAgo,
          },
        },
      });

      if (agingChemicals.length === 0) continue;

      const oldChemicals = agingChemicals.filter(
        c => c.sdsDate && c.sdsDate < oneYearAgo
      );

      // Send ukentlig rapport
      const hmsUsers = await prisma.userTenant.findMany({
        where: {
          tenantId: tenant.id,
          role: { in: ["ADMIN", "HMS"] },
        },
        include: { user: true },
      });

      for (const userTenant of hmsUsers) {
        const user = userTenant.user;

        if (!user.email || !userTenant.weeklyDigest) continue;

        await sendEmail({
          to: user.email,
          subject: `HMS Nova: ${agingChemicals.length} kjemikalier bør sjekkes for oppdateringer`,
          html: `
            <h2>Ukentlig stoffkartotek-rapport</h2>
            <p>Hei ${user.name || "der"},</p>

            <h3>📊 Statistikk:</h3>
            <ul>
              <li><strong>${agingChemicals.length} kjemikalier</strong> har SDS >6 måneder gamle</li>
              <li><strong>${oldChemicals.length} kjemikalier</strong> har SDS >1 år gamle</li>
            </ul>

            <h3>⚠️ Anbefaling:</h3>
            <p>Vi anbefaler å kontakte leverandører for å bekrefte at SDS fortsatt er gjeldende:</p>

            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="padding:8px;text-align:left;border:1px solid #e5e7eb;">Produkt</th>
                  <th style="padding:8px;text-align:left;border:1px solid #e5e7eb;">Leverandør</th>
                  <th style="padding:8px;text-align:left;border:1px solid #e5e7eb;">SDS-dato</th>
                </tr>
              </thead>
              <tbody>
                ${agingChemicals.slice(0, 10).map(c => `
                  <tr>
                    <td style="padding:8px;border:1px solid #e5e7eb;">${c.productName}</td>
                    <td style="padding:8px;border:1px solid #e5e7eb;">${c.supplier || "Ukjent"}</td>
                    <td style="padding:8px;border:1px solid #e5e7eb;">
                      ${c.sdsDate ? new Date(c.sdsDate).toLocaleDateString("no-NO") : "Ukjent"}
                    </td>
                  </tr>
                `).join("")}
                ${agingChemicals.length > 10 ? `
                  <tr>
                    <td colspan="3" style="padding:8px;border:1px solid #e5e7eb;text-align:center;">
                      ... og ${agingChemicals.length - 10} til
                    </td>
                  </tr>
                ` : ""}
              </tbody>
            </table>

            <p>
              <a href="https://hmsnova.no/dashboard/chemicals?filter=aging" 
                 style="display:inline-block;padding:12px 24px;background:#0066CC;color:white;text-decoration:none;border-radius:6px;margin-top:16px;">
                Se alle i HMS Nova
              </a>
            </p>
          `,
        });
      }
    }

    console.log(`✅ SDS-aldersjekk fullført for ${tenants.length} bedrifter`);
    return { success: true, tenantsProcessed: tenants.length };
  } catch (error) {
    console.error("❌ Aging SDS check failed:", error);
    throw error;
  }
}

/**
 * Månedlig: Send automatisk forespørsel til leverandører
 */
export async function sendSupplierUpdateRequests() {
  try {
    console.log("📧 Sender leverandør-forespørsler...");

    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

    // Finn kjemikalier som trenger sjekk (10% av porteføljen per måned)
    const chemicals = await prisma.chemical.findMany({
      where: {
        status: "ACTIVE",
        supplier: { not: null },
        sdsDate: {
          lt: sixMonthsAgo,
        },
      },
      include: {
        tenant: true,
      },
      take: 100, // Maks 100 per kjøring
    });

    let emailsSent = 0;

    for (const chemical of chemicals) {
      // Send e-post til leverandør (hvis e-post er registrert)
      // MERK: Dette krever at leverandør-e-post lagres i systemet
      
      // Send også påminnelse til HMS-ansvarlig
      const hmsUsers = await prisma.userTenant.findMany({
        where: {
          tenantId: chemical.tenantId,
          role: { in: ["ADMIN", "HMS"] },
        },
        include: { user: true },
      });

      for (const userTenant of hmsUsers) {
        const user = userTenant.user;

        if (!user.email) continue;

        await sendEmail({
          to: user.email,
          subject: `Påminnelse: Sjekk SDS for ${chemical.productName}`,
          html: `
            <h2>Månedlig SDS-sjekk</h2>
            <p>Hei ${user.name || "der"},</p>
            
            <p>Det er på tide å sjekke om sikkerhetsdatabladet for <strong>${chemical.productName}</strong> fortsatt er oppdatert.</p>

            <h3>Produktinformasjon:</h3>
            <ul>
              <li><strong>Produkt:</strong> ${chemical.productName}</li>
              <li><strong>Leverandør:</strong> ${chemical.supplier || "Ukjent"}</li>
              <li><strong>CAS:</strong> ${chemical.casNumber || "Ukjent"}</li>
              <li><strong>SDS-dato:</strong> ${chemical.sdsDate ? new Date(chemical.sdsDate).toLocaleDateString("no-NO") : "Ukjent"}</li>
            </ul>

            <h3>Foreslått handling:</h3>
            <ol>
              <li>Kontakt ${chemical.supplier || "leverandøren"} og be om bekreftelse på at SDS er gjeldende</li>
              <li>Hvis ny versjon finnes, last ned og oppdater i HMS Nova</li>
              <li>Hvis SDS er uendret, marker som sjekket i HMS Nova</li>
            </ol>

            <p>
              <a href="https://hmsnova.no/dashboard/chemicals/${chemical.id}" 
                 style="display:inline-block;padding:12px 24px;background:#0066CC;color:white;text-decoration:none;border-radius:6px;">
                Gå til kjemikalie
              </a>
            </p>
          `,
        });

        emailsSent++;
      }

      // Vent litt mellom e-poster
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ Sendt ${emailsSent} leverandør-påminnelser`);
    return { success: true, emailsSent };
  } catch (error) {
    console.error("❌ Supplier update requests failed:", error);
    throw error;
  }
}
