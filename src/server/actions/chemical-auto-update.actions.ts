/**
 * AUTOMATISK SDS-OPPDATERING
 * 
 * Flyt:
 * 1. Bruker registrerer kjemikalie manuelt (første gang)
 * 2. Systemet sjekker AUTOMATISK om det er nyeste versjon
 * 3. Hvis ikke → Last ned nyeste → Parse → Oppdater
 * 4. UKENTLIG: Sjekk ALLE kjemikalier for oppdateringer
 */

"use server";

import { prisma } from "@/lib/db";
import { parseSDSFile } from "@/lib/sds-parser";
import { SupplierSDSManager } from "@/lib/supplier-api";
import { getStorage } from "@/lib/storage";
import { searchSubstanceByCAS, calculateHazardLevel, isCMRSubstance } from "@/lib/echa-api";
import { createNotification } from "@/server/actions/notification.actions";

/**
 * STEG 1: Sjekk om nyeste versjon ved første registrering
 * Kalles AUTOMATISK når bruker registrerer et nytt kjemikalie
 */
export async function checkAndUpdateSDSOnCreate(
  chemicalId: string,
  tenantId: string
): Promise<{
  success: boolean;
  message: string;
  wasUpdated: boolean;
  newVersion?: string;
}> {
  try {
    // Hent kjemikaliet
    const chemical = await prisma.chemical.findUnique({
      where: {
        id: chemicalId,
        tenantId, // Tenant-isolert!
      },
    });

    if (!chemical) {
      return { success: false, message: "Kjemikalie ikke funnet", wasUpdated: false };
    }

    // Hvis ingen leverandør eller CAS-nummer, kan ikke sjekke
    if (!chemical.supplier || !chemical.casNumber) {
      return {
        success: true,
        message: "Ingen leverandør eller CAS-nummer registrert. Kan ikke sjekke for oppdateringer.",
        wasUpdated: false,
      };
    }

    // Initialiser leverandør-manager
    const supplierManager = new SupplierSDSManager({
      vwrApiKey: process.env.VWR_API_KEY,
      sigmaAldrichApiKey: process.env.SIGMA_ALDRICH_API_KEY,
      fisherScientificApiKey: process.env.FISHER_SCIENTIFIC_API_KEY,
    });

    // Sjekk om det finnes nyere versjon hos leverandør
    const updateCheck = await supplierManager.checkForUpdates(
      chemical.supplier,
      chemical.casNumber,
      chemical.sdsDate || undefined
    );

    // Ingen oppdatering funnet
    if (!updateCheck.hasUpdate || !updateCheck.sdsInfo) {
      return {
        success: true,
        message: "Du har allerede nyeste versjon av SDS",
        wasUpdated: false,
      };
    }

    // NYERE VERSJON FUNNET! → Last ned automatisk
    console.log(`🔄 Nyere SDS funnet for ${chemical.productName}: ${updateCheck.sdsInfo.sdsVersion}`);

    const pdfBuffer = await supplierManager.downloadUpdatedSDS(
      chemical.supplier,
      chemical.casNumber
    );

    if (!pdfBuffer) {
      return {
        success: false,
        message: "Kunne ikke laste ned oppdatert SDS",
        wasUpdated: false,
      };
    }

    // Last opp til storage (tenant-isolert path!)
    const storage = getStorage();
    const sdsKey = `sds/${tenantId}/${chemicalId}-${Date.now()}.pdf`;
    await storage.upload(sdsKey, pdfBuffer);

    // Parse med AI
    const extractedData = await parseSDSFile(pdfBuffer);

    // Hent ECHA-data
    let echaData = null;
    if (chemical.casNumber) {
      echaData = await searchSubstanceByCAS(chemical.casNumber);
    }

    // Oppdater kjemikaliet med ny data
    await prisma.chemical.update({
      where: {
        id: chemicalId,
        tenantId, // Tenant-isolert!
      },
      data: {
        sdsKey,
        sdsDate: updateCheck.sdsInfo.sdsLastUpdated || new Date(),
        sdsVersion: updateCheck.sdsInfo.sdsVersion,
        lastEchaSync: new Date(),
        // Oppdater også AI-ekstraherte felt hvis høy confidence
        ...(extractedData.confidence && extractedData.confidence > 0.7
          ? {
              hazardStatements: extractedData.hazardStatements 
                ? (Array.isArray(extractedData.hazardStatements) 
                    ? JSON.stringify(extractedData.hazardStatements)
                    : extractedData.hazardStatements)
                : chemical.hazardStatements,
              precautionaryStatements: extractedData.precautionaryStatements 
                ? (Array.isArray(extractedData.precautionaryStatements)
                    ? JSON.stringify(extractedData.precautionaryStatements)
                    : extractedData.precautionaryStatements)
                : chemical.precautionaryStatements,
              aiExtractedData: extractedData as any,
            }
          : {}),
        // ECHA-data
        ...(echaData
          ? {
              isCMR: echaData.isCMR || false,
              isSVHC: echaData.isSVHC || false,
              reachStatus: echaData.reachStatus,
              ecNumber: echaData.ecNumber,
            }
          : {}),
      },
    });

    // Opprett notifikasjon
    const hmsUsers = await prisma.userTenant.findMany({
      where: {
        tenantId,
        role: { in: ["ADMIN", "HMS"] },
      },
      include: { user: true },
    });

    for (const userTenant of hmsUsers) {
      await createNotification({
        tenantId,
        userId: userTenant.user.id,
        type: "CHEMICAL_SDS_REVIEW",
        title: `✅ SDS oppdatert automatisk: ${chemical.productName}`,
        message: `Nyere versjon (${updateCheck.sdsInfo.sdsVersion}) ble funnet hos ${chemical.supplier} og lastet ned automatisk.`,
        link: `/dashboard/chemicals/${chemicalId}`,
      });
    }

    return {
      success: true,
      message: `Oppdatert til versjon ${updateCheck.sdsInfo.sdsVersion}`,
      wasUpdated: true,
      newVersion: updateCheck.sdsInfo.sdsVersion,
    };
  } catch (error) {
    console.error("Failed to check/update SDS on create:", error);
    return {
      success: false,
      message: "Feil ved sjekking av SDS-versjon",
      wasUpdated: false,
    };
  }
}

/**
 * STEG 2: Ukentlig sjekk av ALLE kjemikalier
 * Kjøres som cron-jobb hver mandag kl 03:00
 */
export async function weeklyCheckAllChemicals(): Promise<{
  success: boolean;
  totalChecked: number;
  totalUpdated: number;
  tenantResults: Array<{
    tenantName: string;
    checked: number;
    updated: number;
  }>;
}> {
  try {
    console.log("🔄 UKENTLIG SJEKK: Starter sjekk av alle kjemikalier...");

    const supplierManager = new SupplierSDSManager({
      vwrApiKey: process.env.VWR_API_KEY,
      sigmaAldrichApiKey: process.env.SIGMA_ALDRICH_API_KEY,
      fisherScientificApiKey: process.env.FISHER_SCIENTIFIC_API_KEY,
    });

    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
    });

    let totalChecked = 0;
    let totalUpdated = 0;
    const tenantResults = [];

    for (const tenant of tenants) {
      // Hent ALLE aktive kjemikalier for denne tenanten
      const chemicals = await prisma.chemical.findMany({
        where: {
          tenantId: tenant.id,
          status: "ACTIVE",
          supplier: { not: null },
          casNumber: { not: null },
        },
      });

      let tenantChecked = 0;
      let tenantUpdated = 0;

      for (const chemical of chemicals) {
        try {
          tenantChecked++;

          // Sjekk for oppdatering
          const updateCheck = await supplierManager.checkForUpdates(
            chemical.supplier!,
            chemical.casNumber!,
            chemical.sdsDate || undefined
          );

          if (updateCheck.hasUpdate && updateCheck.sdsInfo) {
            // Last ned ny versjon
            const pdfBuffer = await supplierManager.downloadUpdatedSDS(
              chemical.supplier!,
              chemical.casNumber!
            );

            if (pdfBuffer) {
              // Last opp til storage
              const storage = getStorage();
              const sdsKey = `sds/${tenant.id}/${chemical.id}-${Date.now()}.pdf`;
              await storage.upload(sdsKey, pdfBuffer);

              // Parse med AI
              const extractedData = await parseSDSFile(pdfBuffer);

              // Oppdater database
              await prisma.chemical.update({
                where: {
                  id: chemical.id,
                  tenantId: tenant.id,
                },
                data: {
                  sdsKey,
                  sdsDate: updateCheck.sdsInfo.sdsLastUpdated || new Date(),
                  sdsVersion: updateCheck.sdsInfo.sdsVersion,
                  lastEchaSync: new Date(),
                  ...(extractedData.confidence && extractedData.confidence > 0.7
                    ? {
                        hazardStatements: extractedData.hazardStatements 
                          ? (Array.isArray(extractedData.hazardStatements) 
                              ? JSON.stringify(extractedData.hazardStatements)
                              : extractedData.hazardStatements)
                          : chemical.hazardStatements,
                        precautionaryStatements: extractedData.precautionaryStatements 
                          ? (Array.isArray(extractedData.precautionaryStatements)
                              ? JSON.stringify(extractedData.precautionaryStatements)
                              : extractedData.precautionaryStatements)
                          : chemical.precautionaryStatements,
                        aiExtractedData: extractedData as any,
                      }
                    : {}),
                },
              });

              tenantUpdated++;
              console.log(`✅ ${tenant.name}: Oppdatert ${chemical.productName} til ${updateCheck.sdsInfo.sdsVersion}`);
            }
          }

          // Rate limiting - vent 2 sekunder mellom hver sjekk
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Feil ved sjekk av ${chemical.productName}:`, error);
        }
      }

      totalChecked += tenantChecked;
      totalUpdated += tenantUpdated;

      tenantResults.push({
        tenantName: tenant.name,
        checked: tenantChecked,
        updated: tenantUpdated,
      });

      // Send ukentlig rapport til HMS-ansvarlig
      if (tenantChecked > 0) {
        await sendWeeklyReport(tenant.id, tenantChecked, tenantUpdated);
      }

      console.log(`✅ ${tenant.name}: ${tenantChecked} sjekket, ${tenantUpdated} oppdatert`);
    }

    console.log(`✅ UKENTLIG SJEKK FULLFØRT: ${totalChecked} sjekket, ${totalUpdated} oppdatert`);

    return {
      success: true,
      totalChecked,
      totalUpdated,
      tenantResults,
    };
  } catch (error) {
    console.error("❌ Weekly check failed:", error);
    throw error;
  }
}

/**
 * Send ukentlig rapport til HMS-ansvarlig
 */
async function sendWeeklyReport(
  tenantId: string,
  checked: number,
  updated: number
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

    await createNotification({
      tenantId,
      userId: user.id,
      type: "CHEMICAL_SDS_REVIEW",
      title: `📊 Ukentlig SDS-rapport: ${updated} oppdateringer`,
      message: `HMS Nova har sjekket ${checked} kjemikalier og oppdatert ${updated} sikkerhetsdatablad automatisk.`,
      link: `/dashboard/chemicals`,
    });
  }
}

/**
 * Sjekk ETT spesifikt kjemikalie manuelt
 * Kan brukes fra UI hvis bruker vil sjekke et kjemikalie med en gang
 */
export async function manualCheckChemical(
  chemicalId: string,
  tenantId: string
): Promise<{
  success: boolean;
  message: string;
  hasUpdate: boolean;
  currentVersion?: string;
  availableVersion?: string;
}> {
  try {
    const chemical = await prisma.chemical.findUnique({
      where: {
        id: chemicalId,
        tenantId,
      },
    });

    if (!chemical) {
      return {
        success: false,
        message: "Kjemikalie ikke funnet",
        hasUpdate: false,
      };
    }

    if (!chemical.supplier || !chemical.casNumber) {
      return {
        success: false,
        message: "Mangler leverandør eller CAS-nummer",
        hasUpdate: false,
      };
    }

    const supplierManager = new SupplierSDSManager({
      vwrApiKey: process.env.VWR_API_KEY,
      sigmaAldrichApiKey: process.env.SIGMA_ALDRICH_API_KEY,
      fisherScientificApiKey: process.env.FISHER_SCIENTIFIC_API_KEY,
    });

    const updateCheck = await supplierManager.checkForUpdates(
      chemical.supplier,
      chemical.casNumber,
      chemical.sdsDate || undefined
    );

    if (!updateCheck.hasUpdate) {
      return {
        success: true,
        message: "Du har allerede nyeste versjon",
        hasUpdate: false,
        currentVersion: chemical.sdsVersion || "Ukjent",
      };
    }

    return {
      success: true,
      message: "Ny versjon tilgjengelig!",
      hasUpdate: true,
      currentVersion: chemical.sdsVersion || "Ukjent",
      availableVersion: updateCheck.sdsInfo?.sdsVersion || "Ukjent",
    };
  } catch (error) {
    console.error("Manual check failed:", error);
    return {
      success: false,
      message: "Feil ved sjekking av versjon",
      hasUpdate: false,
    };
  }
}
