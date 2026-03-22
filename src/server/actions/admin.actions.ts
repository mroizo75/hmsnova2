"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { SessionUser } from "@/types";

// Sjekk om bruker er superadmin
async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser;

  if (!session || !user.isSuperAdmin) {
    throw new Error("Unauthorized: Superadmin required");
  }

  return user;
}

// Schema for å opprette bruker
const createAdminUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  isSuperAdmin: z.boolean().default(false),
  tenantId: z.string().optional(),
  role: z.enum(["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"]).optional(),
});

// Schema for å oppdatere bruker
const updateAdminUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  isSuperAdmin: z.boolean().optional(),
  tenantId: z.string().optional(),
  role: z.enum(["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"]).optional(),
});

export async function createAdminUser(input: z.infer<typeof createAdminUserSchema>) {
  try {
    await requireSuperAdmin();

    const validated = createAdminUserSchema.parse(input);
    const mustHaveTenant = !validated.isSuperAdmin;

    if (mustHaveTenant && (!validated.tenantId || validated.tenantId === "NONE" || !validated.role)) {
      return { success: false, error: "Vanlige brukere må knyttes til en bedrift med gyldig rolle" };
    }

    // SIKKERHET: Normaliser e-post til lowercase
    const normalizedEmail = validated.email.toLowerCase().trim();

    // Sjekk om e-post allerede eksisterer
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return { success: false, error: "E-postadressen er allerede i bruk" };
    }

    // Hash passord
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    if (mustHaveTenant) {
      const tenantExists = await prisma.tenant.findUnique({
        where: { id: validated.tenantId! },
        select: { id: true },
      });

      if (!tenantExists) {
        return { success: false, error: "Bedrift ikke funnet" };
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: validated.name,
          password: hashedPassword,
          isSuperAdmin: validated.isSuperAdmin,
        },
      });

      if (mustHaveTenant) {
        await tx.userTenant.create({
          data: {
            userId: createdUser.id,
            tenantId: validated.tenantId!,
            role: validated.role!,
          },
        });
      }

      return createdUser;
    });

    revalidatePath("/admin/users");
    return { success: true, data: user };
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return { success: false, error: error.message || "Kunne ikke opprette bruker" };
  }
}

export async function updateAdminUser(userId: string, input: z.infer<typeof updateAdminUserSchema>) {
  try {
    await requireSuperAdmin();

    const validated = updateAdminUserSchema.parse(input);

    // Hent eksisterende bruker
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenants: true },
    });

    if (!existingUser) {
      return { success: false, error: "Bruker ikke funnet" };
    }

    if (validated.tenantId === "NONE" && !validated.isSuperAdmin) {
      return { success: false, error: "Bruker må være knyttet til en bedrift" };
    }

    if (validated.isSuperAdmin === false && (!validated.tenantId || validated.tenantId === "NONE" || !validated.role)) {
      return { success: false, error: "Vanlige brukere må knyttes til en bedrift med gyldig rolle" };
    }

    if (validated.tenantId && validated.tenantId !== "NONE") {
      const tenantExists = await prisma.tenant.findUnique({
        where: { id: validated.tenantId },
        select: { id: true },
      });

      if (!tenantExists) {
        return { success: false, error: "Bedrift ikke funnet" };
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          name: validated.name,
          isSuperAdmin: validated.isSuperAdmin,
        },
      });

      // Håndter tenant-tilknytning
      if (!validated.isSuperAdmin && validated.tenantId && validated.role) {
        await tx.userTenant.deleteMany({
          where: { userId },
        });

        if (validated.tenantId !== "NONE") {
          await tx.userTenant.create({
            data: {
              userId,
              tenantId: validated.tenantId,
              role: validated.role,
            },
          });
        }
      } else if (validated.isSuperAdmin) {
        await tx.userTenant.deleteMany({
          where: { userId },
        });
      }

      if (!updatedUser.isSuperAdmin && !updatedUser.isSupport) {
        const tenantLinkCount = await tx.userTenant.count({
          where: { userId },
        });
        if (tenantLinkCount === 0) {
          throw new Error("Bruker må være knyttet til minst én bedrift");
        }
      }

      return updatedUser;
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true, data: user };
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere bruker" };
  }
}

export async function deleteUser(userId: string) {
  try {
    await requireSuperAdmin();

    // Sjekk om bruker er superadmin (ikke tillatt å slette)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "Bruker ikke funnet" };
    }

    if (user.isSuperAdmin) {
      return { success: false, error: "Kan ikke slette superadmin-brukere" };
    }

    // Slett bruker (UserTenant slettes automatisk via onDelete: Cascade)
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return { success: false, error: error.message || "Kunne ikke slette bruker" };
  }
}

