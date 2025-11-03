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

    // Sjekk om e-post allerede eksisterer
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { success: false, error: "E-postadressen er allerede i bruk" };
    }

    // Hash passord
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Opprett bruker
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        password: hashedPassword,
        isSuperAdmin: validated.isSuperAdmin,
      },
    });

    // Knytt til tenant hvis ikke superadmin
    if (!validated.isSuperAdmin && validated.tenantId && validated.tenantId !== "NONE" && validated.role) {
      await prisma.userTenant.create({
        data: {
          userId: user.id,
          tenantId: validated.tenantId,
          role: validated.role,
        },
      });
    }

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

    // Oppdater bruker
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: validated.name,
        isSuperAdmin: validated.isSuperAdmin,
      },
    });

    // Håndter tenant-tilknytning
    if (!validated.isSuperAdmin && validated.tenantId && validated.role) {
      // Fjern eksisterende tenant-tilknytninger
      await prisma.userTenant.deleteMany({
        where: { userId },
      });

      // Legg til ny tenant-tilknytning hvis ikke "NONE"
      if (validated.tenantId !== "NONE") {
        await prisma.userTenant.create({
          data: {
            userId,
            tenantId: validated.tenantId,
            role: validated.role,
          },
        });
      }
    } else if (validated.isSuperAdmin) {
      // Fjern alle tenant-tilknytninger for superadmin
      await prisma.userTenant.deleteMany({
        where: { userId },
      });
    }

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

