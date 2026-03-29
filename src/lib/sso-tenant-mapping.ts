import { prisma } from "@/lib/db";

/**
 * Mapper SSO-brukere til riktig tenant basert på e-postdomenet
 * 
 * Eksempel:
 * - bruker@firma.no → Finn tenant med orgNumber som matcher firma.no
 * - Eller admin kan manuelt opprette brukeren først
 */
export async function mapSSOUserToTenant(email: string): Promise<string | null> {
  // Hent brukerens domene
  const domain = email.split("@")[1];
  
  if (!domain) {
    return null;
  }

  // Strategi 1: Finn tenant basert på contactEmail-domene
  const tenantByContact = await prisma.tenant.findFirst({
    where: {
      contactEmail: {
        contains: `@${domain}`,
      },
    },
  });

  if (tenantByContact) {
    return tenantByContact.id;
  }

  // Strategi 2: Finn tenant basert på invoiceEmail-domene
  const tenantByInvoice = await prisma.tenant.findFirst({
    where: {
      invoiceEmail: {
        contains: `@${domain}`,
      },
    },
  });

  if (tenantByInvoice) {
    return tenantByInvoice.id;
  }

  // Strategi 3: Finn tenant basert på eksisterende brukere med samme domene
  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        contains: `@${domain}`,
      },
      tenants: {
        some: {},
      },
    },
    include: {
      tenants: {
        take: 1,
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (existingUser && existingUser.tenants.length > 0) {
    const [firstMembership] = existingUser.tenants;
    return firstMembership?.tenantId ?? null;
  }

  return null;
}

/**
 * Oppretter en ny bruker med SSO og kobler til tenant
 */
export async function createSSOUser(
  email: string,
  name: string | null,
  tenantId: string,
  role: "ADMIN" | "HMS" | "LEDER" | "VERNEOMBUD" | "ANSATT" = "ANSATT"
) {
  // SIKKERHET: Normaliser e-post til lowercase
  const normalizedEmail = email.toLowerCase().trim();

  // Sjekk om bruker allerede eksisterer
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      tenants: true,
    },
  });

  if (existingUser) {
    // Hvis bruker eksisterer men ikke har tenant, legg til
    if (existingUser.tenants.length === 0) {
      await prisma.userTenant.create({
        data: {
          userId: existingUser.id,
          tenantId,
          role,
        },
      });
      return existingUser;
    }
    return existingUser;
  }

  // Opprett ny bruker med tenant
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      emailVerified: new Date(), // SSO-brukere er automatisk verifisert
      tenants: {
        create: {
          tenantId,
          role,
        },
      },
    },
    include: {
      tenants: true,
    },
  });

  return user;
}

/**
 * Validerer om en bruker har tilgang til en tenant via SSO
 */
export async function validateSSOAccess(userId: string, tenantId: string): Promise<boolean> {
  const userTenant = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId,
      },
    },
  });

  return !!userTenant;
}

