/**
 * Automatiske varsler for stoffkartotek
 * Kjøres daglig via BullMQ
 */

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/server/actions/notification.actions";

/**
 * Sjekk for utdaterte SDS-er og send varsler
 */
export async function checkOutdatedSDS() {
  try {
    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Finn alle aktive tenants
    const tenants = await prisma.tenant.findMany({
      where: {
        status: "ACTIVE",
      },
    });

    for (const tenant of tenants) {
      // Finn utdaterte SDS-er
      const outdatedChemicals = await prisma.chemical.findMany({
        where: {
          tenantId: tenant.id,
          status: "ACTIVE",
          OR: [
            // SDS eldre enn 3 år
            {
              sdsDate: {
                lt: threeYearsAgo,
              },
            },
            // Revisjon forfaller snart
            {
              nextReviewDate: {
                lte: thirtyDaysFromNow,
                gt: new Date(),
              },
            },
          ],
        },
      });

      if (outdatedChemicals.length === 0) continue;

      // Finn HMS-ansvarlig og admin
      const hmsUsers = await prisma.userTenant.findMany({
        where: {
          tenantId: tenant.id,
          role: {
            in: ["ADMIN", "HMS"],
          },
        },
        include: {
          user: true,
        },
      });

      // Send varsler
      for (const userTenant of hmsUsers) {
        const user = userTenant.user;

        if (!userTenant.notifyByEmail || !userTenant.notifyRisks) continue;

        // Opprett notifikasjon i systemet
        await createNotification({
          tenantId: tenant.id,
          userId: user.id,
          type: "CHEMICAL_SDS_REVIEW",
          title: "Stoffkartotek trenger oppdatering",
          message: `${outdatedChemicals.length} kjemikalie(r) har utdaterte sikkerhetsdatablad eller trenger revisjon.`,
          link: "/dashboard/chemicals",
        });

        // Send e-post hvis brukeren har aktivert det
        if (user.email) {
          try {
            await sendEmail({
              to: user.email,
              subject: "HMS Nova: Stoffkartotek trenger oppdatering",
              html: `
                <h2>Stoffkartotek trenger oppdatering</h2>
                <p>Hei ${user.name || "der"},</p>
                <p><strong>${outdatedChemicals.length} kjemikalie(r)</strong> i stoffkartoteket ditt trenger oppmerksomhet:</p>
                <ul>
                  ${outdatedChemicals.slice(0, 5).map(c => `
                    <li><strong>${c.productName}</strong>
                      ${c.sdsDate && new Date(c.sdsDate) < threeYearsAgo 
                        ? `- SDS er eldre enn 3 år (${new Date(c.sdsDate).toLocaleDateString("no-NO")})`
                        : ""
                      }
                      ${c.nextReviewDate 
                        ? `- Revisjon forfaller ${new Date(c.nextReviewDate).toLocaleDateString("no-NO")}`
                        : ""
                      }
                    </li>
                  `).join("")}
                  ${outdatedChemicals.length > 5 ? `<li>... og ${outdatedChemicals.length - 5} til</li>` : ""}
                </ul>
                <p>
                  <a href="https://hmsnova.no/dashboard/chemicals" 
                     style="display:inline-block;padding:12px 24px;background:#0066CC;color:white;text-decoration:none;border-radius:6px;">
                    Se stoffkartotek
                  </a>
                </p>
                <p style="color:#666;font-size:14px;">
                  Arbeidstilsynet anbefaler at sikkerhetsdatablad oppdateres hvert 3. år.
                </p>
              `,
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${user.email}:`, emailError);
          }
        }
      }
    }

    console.log(`✅ Chemical SDS check completed for ${tenants.length} tenants`);
    return { success: true, tenantsProcessed: tenants.length };
  } catch (error) {
    console.error("Chemical SDS check failed:", error);
    throw error;
  }
}

/**
 * Varsle om CMR-stoffer og substitusjonsbehov
 */
export async function checkCMRAndSubstitution() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: {
        status: "ACTIVE",
      },
    });

    for (const tenant of tenants) {
      // Finn CMR-stoffer og høy substitusjonsprioritet
      const dangerousChemicals = await prisma.chemical.findMany({
        where: {
          tenantId: tenant.id,
          status: "ACTIVE",
          OR: [
            { isCMR: true },
            { isSVHC: true },
            { substitutionPriority: "HIGH" },
          ],
        },
      });

      if (dangerousChemicals.length === 0) continue;

      // Finn HMS-ansvarlig
      const hmsUsers = await prisma.userTenant.findMany({
        where: {
          tenantId: tenant.id,
          role: {
            in: ["ADMIN", "HMS"],
          },
        },
        include: {
          user: true,
        },
      });

      for (const userTenant of hmsUsers) {
        const user = userTenant.user;

        if (!userTenant.notifyByEmail) continue;

        const cmrCount = dangerousChemicals.filter(c => c.isCMR).length;
        const svhcCount = dangerousChemicals.filter(c => c.isSVHC).length;

        // Opprett notifikasjon
        await createNotification({
          tenantId: tenant.id,
          userId: user.id,
          type: "CHEMICAL_SDS_REVIEW",
          title: "Farlige kjemikalier krever substitusjonsvurdering",
          message: `Du har ${cmrCount} CMR-stoffer og ${svhcCount} SVHC-stoffer som bør vurderes erstattet.`,
          link: "/dashboard/chemicals?filter=high-risk",
        });

        // Send ukentlig e-post (kun på mandager)
        const today = new Date().getDay();
        if (today === 1 && user.email) { // Mandag
          try {
            await sendEmail({
              to: user.email,
              subject: "HMS Nova: Substitusjonsvurdering påkrevd",
              html: `
                <h2>Farlige kjemikalier krever substitusjonsvurdering</h2>
                <p>Hei ${user.name || "der"},</p>
                <p>Du har følgende farlige kjemikalier i stoffkartoteket:</p>
                <ul>
                  <li><strong>${cmrCount} CMR-stoffer</strong> (kreftfremkallende, mutagene, reproduksjonstoksiske)</li>
                  <li><strong>${svhcCount} SVHC-stoffer</strong> (Substance of Very High Concern)</li>
                </ul>
                <p>⚠️ <strong>Arbeidstilsynet krever substitusjonsvurdering for CMR-stoffer.</strong></p>
                <h3>Kjemikalier med høy substitusjonsprioritet:</h3>
                <ul>
                  ${dangerousChemicals.slice(0, 5).map(c => `
                    <li>
                      <strong>${c.productName}</strong>
                      ${c.isCMR ? '<span style="background:#ff4444;color:white;padding:2px 6px;border-radius:3px;font-size:12px;">CMR</span>' : ""}
                      ${c.isSVHC ? '<span style="background:#ff9944;color:white;padding:2px 6px;border-radius:3px;font-size:12px;">SVHC</span>' : ""}
                    </li>
                  `).join("")}
                  ${dangerousChemicals.length > 5 ? `<li>... og ${dangerousChemicals.length - 5} til</li>` : ""}
                </ul>
                <p>
                  <a href="https://hmsnova.no/dashboard/chemicals?filter=high-risk" 
                     style="display:inline-block;padding:12px 24px;background:#ff4444;color:white;text-decoration:none;border-radius:6px;">
                    Gjennomgå farlige kjemikalier
                  </a>
                </p>
              `,
            });
          } catch (emailError) {
            console.error(`Failed to send CMR email to ${user.email}:`, emailError);
          }
        }
      }
    }

    console.log(`✅ CMR/SVHC check completed for ${tenants.length} tenants`);
    return { success: true, tenantsProcessed: tenants.length };
  } catch (error) {
    console.error("CMR check failed:", error);
    throw error;
  }
}

/**
 * Auto-sync med ECHA for kjemikalier som ikke er synkronisert på lenge
 */
export async function autoSyncWithECHA() {
  try {
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

    const chemicalsNeedingSync = await prisma.chemical.findMany({
      where: {
        status: "ACTIVE",
        casNumber: { not: null },
        OR: [
          { lastEchaSync: null },
          { lastEchaSync: { lt: sixMonthsAgo } },
        ],
      },
      take: 50, // Maks 50 per kjøring for å unngå rate limiting
    });

    console.log(`Auto-syncing ${chemicalsNeedingSync.length} chemicals with ECHA...`);

    // Denne jobben kjøres nattestid, så vi kan ta oss tid
    // Import av synkroniseringsfunksjon må gjøres dynamisk
    const { syncWithECHA } = await import("../actions/chemical-ai.actions");

    let synced = 0;
    let failed = 0;

    for (const chemical of chemicalsNeedingSync) {
      try {
        const result = await syncWithECHA(chemical.id);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        console.error(`Failed to auto-sync ${chemical.id}:`, error);
      }

      // Vent 2 sekunder mellom hver synkronisering
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ Auto-sync completed: ${synced} synced, ${failed} failed`);
    return { success: true, synced, failed };
  } catch (error) {
    console.error("Auto-sync failed:", error);
    throw error;
  }
}
