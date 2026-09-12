import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  canonicalizeAzureAdEmail,
  extractEmailDomain,
  isPublicEmailDomain,
  resolveAzureAdJitRole,
} from "@/lib/azure-ad-email";

export type AzureAdLoginValidation = {
  allowed: boolean;
  tenantId?: string;
  role?: Role;
  error?: string;
  email?: string;
};

/**
 * Validerer om en Microsoft-bruker kan logge inn basert på UPN-domene.
 * Oppretter ikke bruker — det gjør PrismaAdapter etter signIn.
 */
export async function validateAzureAdLogin(
  upnOrEmail: string
): Promise<AzureAdLoginValidation> {
  const email = canonicalizeAzureAdEmail(upnOrEmail);
  const domain = extractEmailDomain(email);

  if (!domain) {
    return { allowed: false, error: "Ugyldig e-postadresse" };
  }

  if (isPublicEmailDomain(domain)) {
    return { allowed: false, error: "Offentlige e-postdomener kan ikke brukes til bedrifts-SSO" };
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      azureAdEnabled: true,
      azureAdDomain: domain,
    },
    select: {
      id: true,
      azureAdAutoRole: true,
      status: true,
    },
  });

  if (!tenant) {
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

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      tenants: {
        where: { tenantId: tenant.id },
      },
    },
  });

  const tenantMembership = existingUser?.tenants.find(
    (membership) => membership.tenantId === tenant.id
  );

  return {
    allowed: true,
    tenantId: tenant.id,
    role: tenantMembership?.role ?? resolveAzureAdJitRole(tenant.azureAdAutoRole),
    email,
  };
}

async function isPrivilegedForExtraTenant(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, isSupport: true },
  });

  if (user?.isSuperAdmin || user?.isSupport) {
    return true;
  }

  const groupMembership = await prisma.corporateGroupUser.findFirst({
    where: { userId, role: { in: ["GROUP_ADMIN", "GROUP_HMS"] } },
    select: { id: true },
  });

  return Boolean(groupMembership);
}

/**
 * Avviser SSO når e-posten allerede tilhører en annen bedrift
 * og brukeren ikke er superadmin/support/konsern.
 */
export async function getAzureAdJoinBlockReason(
  email: string,
  tenantId: string
): Promise<string | null> {
  const existingUser = await prisma.user.findUnique({
    where: { email: canonicalizeAzureAdEmail(email) },
    select: {
      id: true,
      tenants: {
        select: { tenantId: true },
      },
    },
  });

  if (!existingUser) {
    return null;
  }

  if (existingUser.tenants.some((membership) => membership.tenantId === tenantId)) {
    return null;
  }

  if (existingUser.tenants.length === 0) {
    return null;
  }

  if (await isPrivilegedForExtraTenant(existingUser.id)) {
    return null;
  }

  return "E-postadressen er allerede tilknyttet en annen bedrift";
}

export async function ensureAzureAdUserTenant(
  userId: string,
  email: string
): Promise<{ ok: boolean; userId: string }> {
  const validation = await validateAzureAdLogin(email);
  if (!validation.allowed || !validation.tenantId || !validation.role) {
    return { ok: false, userId };
  }

  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, emailVerified: true },
  });

  if (!user && validation.email) {
    user = await prisma.user.findUnique({
      where: { email: validation.email },
      select: { id: true, emailVerified: true },
    });
  }

  if (!user) {
    return { ok: false, userId };
  }

  const blockReason = await getAzureAdJoinBlockReason(validation.email ?? email, validation.tenantId);
  if (blockReason) {
    return { ok: false, userId: user.id };
  }

  const existing = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: validation.tenantId,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    try {
      await prisma.userTenant.create({
        data: {
          userId: user.id,
          tenantId: validation.tenantId,
          role: validation.role,
        },
      });
    } catch {
      const raced = await prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: validation.tenantId,
          },
        },
        select: { id: true },
      });
      if (!raced) {
        return { ok: false, userId: user.id };
      }
    }
  }

  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  return { ok: true, userId: user.id };
}
