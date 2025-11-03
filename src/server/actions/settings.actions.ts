"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { AuditLog } from "@/lib/audit-log";

async function getSessionContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }

  return { user, tenantId: user.tenants[0].tenantId };
}

// ============================================================================
// TENANT SETTINGS
// ============================================================================

export async function updateTenantSettings(data: {
  name: string;
  orgNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Sjekk om bruker er admin
    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre bedriftsinnstillinger" };
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        orgNumber: data.orgNumber,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
      },
    });

    await AuditLog.log(tenantId, user.id, "TENANT_SETTINGS_UPDATED", "Tenant", tenantId, {
      name: tenant.name,
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: tenant };
  } catch (error: any) {
    console.error("Update tenant settings error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere innstillinger" };
  }
}

// ============================================================================
// USER SETTINGS
// ============================================================================

export async function updateUserProfile(data: { name?: string; email?: string }) {
  try {
    const { user } = await getSessionContext();

    // Sjekk om e-post allerede eksisterer (hvis endret)
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return { success: false, error: "E-postadressen er allerede i bruk" };
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        email: data.email,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: updatedUser };
  } catch (error: any) {
    console.error("Update user profile error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere profil" };
  }
}

export async function updateUserPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const { user } = await getSessionContext();

    // Verifiser nåværende passord
    if (!user.password) {
      return { success: false, error: "Ugyldig bruker" };
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: "Nåværende passord er feil" };
    }

    // Hash nytt passord
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Update password error:", error);
    return { success: false, error: error.message || "Kunne ikke endre passord" };
  }
}

// ============================================================================
// USER MANAGEMENT (Admin only)
// ============================================================================

export async function getTenantUsers() {
  try {
    const { tenantId } = await getSessionContext();

    const userTenants = await prisma.userTenant.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: userTenants };
  } catch (error: any) {
    console.error("Get tenant users error:", error);
    return { success: false, error: error.message || "Kunne ikke hente brukere" };
  }
}

export async function inviteUser(data: { email: string; name: string; role: string }) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Sjekk om bruker er admin
    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan invitere brukere" };
    }

    // Hent tenant med subscription info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { pricingTier: true },
    });

    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    // Tell antall eksisterende brukere
    const currentUserCount = await prisma.userTenant.count({
      where: { tenantId },
    });

    // Hent brukergrense basert på pricing tier
    const { getSubscriptionLimits } = await import("@/lib/subscription");
    const limits = getSubscriptionLimits(tenant.pricingTier as any);

    // Sjekk om de har nådd maks antall brukere
    if (currentUserCount >= limits.maxUsers) {
      return {
        success: false,
        error: `Du har nådd maks antall brukere (${limits.maxUsers}) for din pakke. Kontakt support for å oppgradere.`,
      };
    }

    // Sjekk om bruker allerede eksisterer
    let existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Hvis bruker eksisterer, sjekk om de allerede er med i tenant
    if (existingUser) {
      const existingUserTenant = await prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: existingUser.id,
            tenantId,
          },
        },
      });

      if (existingUserTenant) {
        return { success: false, error: "Brukeren er allerede medlem av denne bedriften" };
      }
    }

    // Hent tenant og inviter-info for epost
    const tenantInfo = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // Generer ALLTID midlertidig passord når bruker inviteres til tenant
    // Dette sikrer at de får tilgang, uansett om de eksisterer fra før eller ikke
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    if (!existingUser) {
      // Opprett helt ny bruker
      existingUser = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: hashedPassword,
        },
      });
      
      console.log(`✅ Ny bruker opprettet: ${data.email}`);
      console.log(`🔑 Midlertidig passord generert: ${tempPassword}`);
    } else {
      // Bruker eksisterer - oppdater med nytt midlertidig passord
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword },
      });
      
      console.log(`ℹ️ Eksisterende bruker legges til i tenant: ${data.email}`);
      console.log(`🔑 Nytt midlertidig passord generert: ${tempPassword}`);
    }

    // Legg til bruker i tenant
    const userTenantRelation = await prisma.userTenant.create({
      data: {
        userId: existingUser.id,
        tenantId,
        role: data.role as any,
      },
    });

    // Send invitasjonsepost til ALLE inviterte brukere
    try {
      console.log(`📧 Sender invitasjonsepost til ${data.email}...`);
      
      const { sendUserInvitationEmail } = await import("@/lib/email-service");
      await sendUserInvitationEmail({
        to: data.email,
        userName: data.name,
        userEmail: data.email,
        tempPassword: tempPassword,
        companyName: tenantInfo?.name || "Bedrift",
        invitedByName: user.name || user.email,
      });
      
      console.log(`✅ Invitasjonsepost sendt til ${data.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send invitation email to ${data.email}:`, emailError);
      // Vi fortsetter selv om epost feiler - brukeren er opprettet
    }

    await AuditLog.log(tenantId, user.id, "USER_INVITED", "User", existingUser.id, {
      email: data.email,
      role: data.role,
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: userTenantRelation };
  } catch (error: any) {
    console.error("Invite user error:", error);
    return { success: false, error: error.message || "Kunne ikke invitere bruker" };
  }
}

export async function updateUserRole(userId: string, role: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Sjekk om bruker er admin
    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre brukerroller" };
    }

    // Ikke la admin endre sin egen rolle
    if (userId === user.id) {
      return { success: false, error: "Du kan ikke endre din egen rolle" };
    }

    const updatedUserTenant = await prisma.userTenant.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      data: { role: role as any },
    });

    await AuditLog.log(tenantId, user.id, "USER_ROLE_UPDATED", "User", userId, {
      newRole: role,
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: updatedUserTenant };
  } catch (error: any) {
    console.error("Update user role error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere rolle" };
  }
}

export async function removeUserFromTenant(userId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Sjekk om bruker er admin
    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan fjerne brukere" };
    }

    // Ikke la admin fjerne seg selv
    if (userId === user.id) {
      return { success: false, error: "Du kan ikke fjerne deg selv" };
    }

    await prisma.userTenant.delete({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    await AuditLog.log(tenantId, user.id, "USER_REMOVED", "User", userId, {});

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Remove user error:", error);
    return { success: false, error: error.message || "Kunne ikke fjerne bruker" };
  }
}

// ============================================================================
// SUBSCRIPTION & INVOICES
// ============================================================================

export async function getSubscriptionInfo() {
  try {
    const { tenantId } = await getSessionContext();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    return { success: true, data: tenant };
  } catch (error: any) {
    console.error("Get subscription info error:", error);
    return { success: false, error: error.message || "Kunne ikke hente abonnementsinformasjon" };
  }
}

