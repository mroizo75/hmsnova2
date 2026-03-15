/**
 * FULL AUTOMATISERING - Nivå 3
 * E-post overvåking + Leverandør-API integrasjoner
 * 
 * Dette er den høyeste graden av automatisering
 */

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { processSDSFromEmail } from "@/lib/email-monitoring";
import { SupplierSDSManager } from "@/lib/supplier-api";
import { parseSDSFile } from "@/lib/sds-parser";
import { getStorage } from "@/lib/storage";
import { createNotification } from "@/server/actions/notification.actions";

/**
 * Daglig: Overvåk e-post for nye SDS-er
 */
export async function monitorEmailForSDS() {
  try {
    console.log("📧 Overvåker e-post for SDS-oppdateringer...");

    const tenants = await prisma.tenant.findMany({
      where: {
        status: "ACTIVE",
        // Kun bedrifter som har aktivert e-post overvåking
        hmsContactEmail: { not: null },
      },
    });

    let totalProcessed = 0;
    let totalSuggestions = 0;

    for (const tenant of tenants) {
      // Sjekk om bedriften har konfigurert Office 365 integrasjon
      const office365Config = {
        tenantId: process.env[`${tenant.id}_OFFICE365_TENANT_ID`] || process.env.OFFICE365_TENANT_ID || "",
        clientId: process.env[`${tenant.id}_OFFICE365_CLIENT_ID`] || process.env.OFFICE365_CLIENT_ID || "",
        clientSecret: process.env[`${tenant.id}_OFFICE365_CLIENT_SECRET`] || process.env.OFFICE365_CLIENT_SECRET || "",
        mailboxEmail: tenant.hmsContactEmail || "",
      };

      if (!office365Config.tenantId || !office365Config.clientId) {
        continue; // Skip hvis ikke konfigurert
      }

      try {
        const result = await processSDSFromEmail(tenant.id, office365Config);

        totalProcessed += result.processed;
        totalSuggestions += result.suggestions.length;

        // Send rapport til HMS-ansvarlig
        if (result.suggestions.length > 0) {
          await sendSDSSuggestionsEmail(tenant.id, result.suggestions);
        }

        console.log(`✅ ${tenant.name}: ${result.processed} auto-oppdatert, ${result.suggestions.length} forslag`);
      } catch (error) {
        console.error(`❌ Failed to process emails for ${tenant.name}:`, error);
      }

      // Vent litt mellom bedrifter
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ E-post overvåking fullført: ${totalProcessed} auto-oppdatert, ${totalSuggestions} forslag`);
    return { success: true, processed: totalProcessed, suggestions: totalSuggestions };
  } catch (error) {
    console.error("❌ Email monitoring failed:", error);
    throw error;
  }
}

/**
 * Send e-post med forslag til SDS-oppdateringer
 */
async function sendSDSSuggestionsEmail(
  tenantId: string,
  suggestions: Array<{
    chemicalId: string;
    chemicalName: string;
    emailSubject: string;
    emailFrom: string;
    attachmentName: string;
    confidence: number;
  }>
) {
  const hmsUsers = await prisma.userTenant.findMany({
    where: {
      tenantId,
      role: { in: ["ADMIN", "HMS"] },
    },
    include: { user: true },
  });

  for (const userTenant of hmsUsers) {
    const user = userTenant.user;

    if (!user.email || !userTenant.notifyByEmail) continue;

    await sendEmail({
      to: user.email,
      subject: `HMS Nova: ${suggestions.length} foreslåtte SDS-oppdateringer funnet`,
      html: `
        <h2>📧 Nye SDS-er funnet i innboks</h2>
        <p>Hei ${user.name || "der"},</p>

        <p>HMS Nova har automatisk overvåket din innboks og funnet <strong>${suggestions.length} potensielle SDS-oppdateringer</strong>:</p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:12px;text-align:left;border:1px solid #e5e7eb;">Kjemikalie</th>
              <th style="padding:12px;text-align:left;border:1px solid #e5e7eb;">E-post fra</th>
              <th style="padding:12px;text-align:left;border:1px solid #e5e7eb;">Vedlegg</th>
              <th style="padding:12px;text-align:center;border:1px solid #e5e7eb;">Match</th>
            </tr>
          </thead>
          <tbody>
            ${suggestions.map(s => `
              <tr>
                <td style="padding:12px;border:1px solid #e5e7eb;">${s.chemicalName}</td>
                <td style="padding:12px;border:1px solid #e5e7eb;">${s.emailFrom}</td>
                <td style="padding:12px;border:1px solid #e5e7eb;">${s.attachmentName}</td>
                <td style="padding:12px;border:1px solid #e5e7eb;text-align:center;">
                  <span style="background:${s.confidence > 0.7 ? '#10b981' : '#f59e0b'};color:white;padding:4px 8px;border-radius:4px;font-size:12px;">
                    ${Math.round(s.confidence * 100)}%
                  </span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <p><strong>Hva skjer nå?</strong></p>
        <ul>
          <li>Gå til HMS Nova og godkjenn/avvis forslagene</li>
          <li>Godkjente SDS-er blir automatisk parsert med AI</li>
          <li>Alle felter oppdateres automatisk</li>
        </ul>

        <p>
          <a href="https://hmsnova.no/dashboard/chemicals?filter=suggested-updates" 
             style="display:inline-block;padding:12px 24px;background:#0066CC;color:white;text-decoration:none;border-radius:6px;margin-top:16px;">
            Se foreslåtte oppdateringer
          </a>
        </p>

        <p style="color:#666;font-size:14px;margin-top:24px;">
          Dette er en automatisk varsling fra HMS Nova sitt e-post overvåkingssystem.
          Du kan skru av dette i innstillinger.
        </p>
      `,
    });
  }
}

/**
 * Daglig: Sjekk leverandør-APIer for oppdateringer
 * VIKTIG: Kjører PER TENANT for full isolasjon
 */
export async function checkSupplierAPIsForUpdates() {
  try {
    console.log("🔄 Sjekker leverandør-APIer for SDS-oppdateringer...");

    // Initialiser leverandør-manager
    const supplierManager = new SupplierSDSManager({
      vwrApiKey: process.env.VWR_API_KEY,
      sigmaAldrichApiKey: process.env.SIGMA_ALDRICH_API_KEY,
      fisherScientificApiKey: process.env.FISHER_SCIENTIFIC_API_KEY,
    });

    // Hent alle aktive tenants
    const tenants = await prisma.tenant.findMany({
      where: {
        status: "ACTIVE",
      },
    });

    let totalUpdatesFound = 0;
    let totalAutoUpdated = 0;

    // Loop gjennom hver tenant (full isolasjon!)
    for (const tenant of tenants) {
      // Finn kjemikalier KUN for denne tenanten
      const chemicals = await prisma.chemical.findMany({
        where: {
          tenantId: tenant.id, // ← VIKTIG: Tenant-isolert!
          status: "ACTIVE",
          supplier: { not: null },
          // Kun sjekk de som ikke er sjekket siste 7 dager
          OR: [
            { lastEchaSync: null },
            { lastEchaSync: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
        take: 10, // Maks 10 per tenant per dag (rate limiting)
      });

      let updatesFound = 0;
      let autoUpdated = 0;

      for (const chemical of chemicals) {
        if (!chemical.supplier) continue;

        // Anta katalognummer er lagret i notes eller et eget felt
        // For demo: bruk CAS-nummer som fallback
        const catalogNumber = chemical.casNumber || "";

        if (!catalogNumber) continue;

        try {
          const updateCheck = await supplierManager.checkForUpdates(
            chemical.supplier,
            catalogNumber,
            chemical.sdsDate || undefined
          );

          if (updateCheck.hasUpdate && updateCheck.sdsInfo) {
            updatesFound++;

            // Last ned ny SDS
            const pdfBuffer = await supplierManager.downloadUpdatedSDS(
              chemical.supplier,
              catalogNumber
            );

            if (pdfBuffer) {
              // Last opp til storage (tenant-isolert path!)
              const storage = getStorage();
              const sdsKey = `sds/${tenant.id}/${chemical.id}-${Date.now()}.pdf`;
              await storage.upload(sdsKey, pdfBuffer);

              // Parse med AI
              const extractedData = await parseSDSFile(pdfBuffer);

              if (extractedData.confidence && extractedData.confidence > 0.8) {
                // Auto-oppdater hvis høy confidence
                await prisma.chemical.update({
                  where: { 
                    id: chemical.id,
                    tenantId: tenant.id, // ← VIKTIG: Dobbel-sjekk tenant!
                  },
                  data: {
                    sdsKey,
                    sdsDate: updateCheck.sdsInfo.sdsLastUpdated || new Date(),
                    sdsVersion: updateCheck.sdsInfo.sdsVersion,
                    lastEchaSync: new Date(),
                  },
                });

                autoUpdated++;

                // Send varsel (tenant-isolert)
                await sendAutoUpdateNotification(chemical, tenant.id);

                console.log(`✅ ${tenant.name}: Auto-oppdatert ${chemical.productName}`);
              }
            }
          }
        } catch (error) {
          console.error(`❌ ${tenant.name}: Failed to check ${chemical.productName}:`, error);
        }

        // Vent mellom API-kall for rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      totalUpdatesFound += updatesFound;
      totalAutoUpdated += autoUpdated;

      console.log(`✅ ${tenant.name}: ${updatesFound} oppdateringer, ${autoUpdated} auto-oppdatert`);
    }

    console.log(`✅ Leverandør-API sjekk fullført: ${totalUpdatesFound} oppdateringer funnet, ${totalAutoUpdated} auto-oppdatert`);
    return { success: true, updatesFound: totalUpdatesFound, autoUpdated: totalAutoUpdated };
  } catch (error) {
    console.error("❌ Supplier API check failed:", error);
    throw error;
  }
}

/**
 * Send varsel om automatisk oppdatering
 * VIKTIG: Tenant-isolert varsling
 */
async function sendAutoUpdateNotification(chemical: any, tenantId: string) {
  const hmsUsers = await prisma.userTenant.findMany({
    where: {
      tenantId: tenantId, // ← VIKTIG: Kun denne tenantens brukere!
      role: { in: ["ADMIN", "HMS"] },
    },
    include: { user: true },
  });

  for (const userTenant of hmsUsers) {
    const user = userTenant.user;

    await createNotification({
      tenantId: tenantId,
      userId: user.id,
      type: "CHEMICAL_SDS_REVIEW",
      title: `✅ SDS automatisk oppdatert: ${chemical.productName}`,
      message: `HMS Nova har automatisk hentet og oppdatert sikkerhetsdatablad fra ${chemical.supplier}.`,
      link: `/dashboard/chemicals/${chemical.id}`,
    });
  }
}
