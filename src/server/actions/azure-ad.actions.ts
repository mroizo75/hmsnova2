"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { getRequiredTenantContext } from "@/lib/tenant-context";

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext().catch(() => null);
  if (!tenantContext) {
    return { error: "Ikke autentisert" };
  }

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    include: {
      tenants: { take: 1 },
    },
  });

  if (!user || user.tenants.length === 0) {
    return { error: "Ingen tenant funnet" };
  }

  const membership = user.tenants.find((tenant) => tenant.tenantId === tenantContext.tenantId);
  if (!membership) {
    return { error: "Ingen tenant funnet" };
  }
  const tenantId = membership.tenantId;
  const role = membership.role;

  if (role !== "ADMIN") {
    return { error: "Kun administratorer kan endre Azure AD-innstillinger" };
  }

  return { user, tenantId, role };
}

const allowedRoles: Role[] = ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"];

/**
 * Oppdater Azure AD/Microsoft SSO innstillinger for tenant
 * FORENKLET: Krever kun domene, ikke Tenant ID fra kunde
 */
export async function updateAzureAdSettings(data: {
  azureAdEnabled?: boolean;
  azureAdDomain?: string;
  azureAdAutoRole?: string;
}) {
  try {
    const context = await getSessionContext();
    if ("error" in context) {
      return { success: false, error: context.error };
    }

    const { tenantId } = context;

    // Valider domene-format (påkrevd hvis SSO aktiveres)
    if (data.azureAdEnabled && !data.azureAdDomain) {
      return {
        success: false,
        error: "E-postdomene er påkrevd for å aktivere SSO",
      };
    }

    if (data.azureAdDomain) {
      const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
      if (!domainRegex.test(data.azureAdDomain)) {
        return {
          success: false,
          error: "Ugyldig domene-format. Eksempel: bedrift.no (uten @)",
        };
      }
    }

    if (data.azureAdAutoRole && !allowedRoles.includes(data.azureAdAutoRole as Role)) {
      return {
        success: false,
        error: "Ugyldig rolle for automatisk tildeling",
      };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        azureAdEnabled: data.azureAdEnabled,
        azureAdDomain: data.azureAdDomain?.toLowerCase(),
        azureAdAutoRole: data.azureAdAutoRole ? (data.azureAdAutoRole as Role) : null,
      },
    });

    revalidatePath("/dashboard/settings");
    
    return { success: true };
  } catch (error) {
    console.error("Error updating Azure AD settings:", error);
    return {
      success: false,
      error: "Kunne ikke oppdatere Microsoft SSO-innstillinger",
    };
  }
}

/**
 * @deprecated Synkronisering krever Microsoft Graph API admin consent fra HVER kunde.
 * Dette er for komplisert for små bedrifter. Bruk heller JIT provisioning (automatisk opprettelse ved innlogging).
 * Beholdes for bakoverkompatibilitet.
 */
export async function syncAzureAdUsers() {
  try {
    const context = await getSessionContext();
    if ("error" in context) {
      return { success: false, error: context.error };
    }

    const { tenantId } = context;

    // Hent tenant med Azure AD konfigurasjon
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        azureAdTenantId: true,
        azureAdEnabled: true,
        azureAdDomain: true,
        azureAdAutoRole: true,
      },
    });

    if (!tenant?.azureAdEnabled || !tenant.azureAdTenantId) {
      return {
        success: false,
        error: "Azure AD er ikke konfigurert for denne bedriften",
      };
    }

    // Hent brukere fra Azure AD via Microsoft Graph API
    const { fetchAzureAdUsers } = await import("@/lib/microsoft-graph");
    const graphResult = await fetchAzureAdUsers(
      tenant.azureAdTenantId,
      tenant.azureAdDomain || undefined
    );

    if (!graphResult.success || !graphResult.users) {
      return {
        success: false,
        error: graphResult.error || "Kunne ikke hente brukere fra Azure AD",
      };
    }

    let createdCount = 0;
    let updatedCount = 0;

    // Opprett eller oppdater brukere i HMS Nova
    for (const azureUser of graphResult.users) {
      const email = azureUser.mail || azureUser.userPrincipalName;
      if (!email) continue;

      // Sjekk om bruker allerede eksisterer
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          tenants: {
            where: { tenantId: tenant.id },
          },
        },
      });

      if (existingUser) {
        // Oppdater eksisterende bruker
        if (existingUser.tenants.length === 0) {
          // Bruker eksisterer, men ikke i denne tenanten - legg til
          await prisma.userTenant.create({
            data: {
              userId: existingUser.id,
              tenantId: tenant.id,
              role: (tenant.azureAdAutoRole as Role) || "ANSATT",
              department: azureUser.department || undefined,
            },
          });
          createdCount++;
        } else {
          // Bruker eksisterer allerede i tenant - oppdater navn hvis endret
          if (azureUser.displayName && existingUser.name !== azureUser.displayName) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { name: azureUser.displayName },
            });
            updatedCount++;
          }
        }
      } else {
        // Opprett ny bruker
        await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            name: azureUser.displayName,
            emailVerified: new Date(), // Azure AD brukere er automatisk verifisert
            phone: azureUser.mobilePhone || azureUser.businessPhones?.[0] || undefined,
            tenants: {
              create: {
                tenantId: tenant.id,
                role: (tenant.azureAdAutoRole as Role) || "ANSATT",
                department: azureUser.department || undefined,
              },
            },
          },
        });
        createdCount++;
      }
    }

    // Oppdater sist synkronisert
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        azureAdLastSync: new Date(),
      },
    });

    revalidatePath("/dashboard/settings");

    return {
      success: true,
      data: {
        created: createdCount,
        updated: updatedCount,
        total: graphResult.users.length,
      },
    };
  } catch (error) {
    console.error("Error syncing Azure AD users:", error);
    return {
      success: false,
      error: "Kunne ikke synkronisere brukere fra Azure AD",
    };
  }
}

/**
 * Validerer om en bruker kan logge inn via Azure AD basert på tenant-konfigurasjon
 * @param upnOrEmail - UserPrincipalName fra Azure AD (for domene-sjekk)
 * @param primaryEmail - Primær e-post som skal brukes for brukeroppretting (optional)
 */
export async function validateAzureAdLogin(
  upnOrEmail: string,
  primaryEmail?: string
): Promise<{
  allowed: boolean;
  tenantId?: string;
  role?: Role;
  error?: string;
  email?: string; // E-posten som skal brukes for brukeren
}> {
  try {
    // Hent domene fra UPN/e-post (for tenant-matching)
    const domain = upnOrEmail.split("@")[1];
    if (!domain) {
      return { allowed: false, error: "Ugyldig e-postadresse" };
    }

    console.log(`🔍 Validating SSO: UPN domain="${domain}", primaryEmail="${primaryEmail || upnOrEmail}"`);

    // Finn tenant med matching domene og aktivert Azure AD
    const tenant = await prisma.tenant.findFirst({
      where: {
        azureAdEnabled: true,
        azureAdDomain: domain.toLowerCase(),
      },
      select: {
        id: true,
        azureAdAutoRole: true,
        status: true,
        name: true,
      },
    });

    if (!tenant) {
      console.log(`❌ No tenant found for domain: ${domain}`);
      return {
        allowed: false,
        error: "Ingen aktiv HMS Nova-konto funnet for dette domenet",
      };
    }

    if (tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
      return {
        allowed: false,
        error: "Bedriftskontoen er suspendert. Kontakt support@hmsnova.com",
      };
    }

    // Bruk primær e-post hvis oppgitt, ellers UPN
    const userEmail = (primaryEmail || upnOrEmail).toLowerCase();

    console.log(`✅ Tenant found: ${tenant.name} (${tenant.id}) for domain ${domain}`);
    console.log(`📧 User email to use: ${userEmail}`);

    // Sjekk om bruker allerede eksisterer (med HVILKEN SOM HELST e-post)
    // Dette håndterer tilfeller hvor bruker har byttet fra gmail.com til bedrift.no
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        tenants: {
          where: {
            tenantId: tenant.id,
          },
        },
      },
    });

    if (existingUser && existingUser.tenants.length > 0) {
      const tenantMembership = existingUser.tenants.find((membership) => membership.tenantId === tenant.id);
      if (!tenantMembership) {
        return {
          allowed: true,
          tenantId: tenant.id,
          role: (tenant.azureAdAutoRole as Role) || "ANSATT",
          email: userEmail,
        };
      }
      // Bruker eksisterer allerede
      console.log(`✅ Existing user found with tenant: ${userEmail}`);
      return {
        allowed: true,
        tenantId: tenant.id,
        role: tenantMembership.role,
        email: userEmail,
      };
    }

    // Ny bruker - skal opprettes med standard rolle
    console.log(`🆕 New user will be created: ${userEmail} in tenant ${tenant.name}`);
    return {
      allowed: true,
      tenantId: tenant.id,
      role: (tenant.azureAdAutoRole as Role) || "ANSATT",
      email: userEmail,
    };
  } catch (error) {
    console.error("Error validating Azure AD login:", error);
    return {
      allowed: false,
      error: "Kunne ikke validere innlogging",
    };
  }
}

