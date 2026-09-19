"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  importUsersIntoTenant,
  inviteUserIntoTenant,
  parseUserImportFile,
  type ImportUsersResult,
} from "@/lib/user-import";
import { USER_IMPORT_ROLES } from "@/lib/user-import-rows";
import { Role } from "@prisma/client";

async function requirePrivilegedActor() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      isSupport: true,
    },
  });

  if (!user || (!user.isSuperAdmin && !user.isSupport)) {
    return null;
  }

  return user;
}

export async function importUsersForTenantAsStaff(
  formData: FormData,
): Promise<ImportUsersResult> {
  try {
    const actor = await requirePrivilegedActor();
    if (!actor) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenantId = String(formData.get("tenantId") ?? "").trim();
    if (!tenantId) {
      return { success: false, error: "Mangler bedrift" };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "Ingen fil valgt" };
    }

    const parsed = await parseUserImportFile(file);
    if (parsed.success === false) {
      return parsed;
    }

    const result = await importUsersIntoTenant({
      tenantId,
      rows: parsed.rows,
      parseErrors: parsed.errors,
      actor: { id: actor.id, name: actor.name, email: actor.email },
      importedByStaff: true,
    });

    if (result.success) {
      revalidatePath(`/admin/tenants/${tenantId}`);
      revalidatePath("/admin/users");
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke importere brukere";
    return { success: false, error: message };
  }
}

const inviteStaffSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email("Ugyldig e-post"),
  name: z.string().min(1, "Navn er påkrevd"),
  role: z.string().refine((role) => USER_IMPORT_ROLES.includes(role as Role), {
    message: "Ugyldig rolle",
  }),
});

export async function inviteUserForTenantAsStaff(input: {
  tenantId: string;
  email: string;
  name: string;
  role: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const actor = await requirePrivilegedActor();
    if (!actor) {
      return { success: false, error: "Ingen tilgang" };
    }

    const data = inviteStaffSchema.parse(input);

    const result = await inviteUserIntoTenant({
      tenantId: data.tenantId,
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
      },
      actor: { id: actor.id, name: actor.name, email: actor.email },
      invitedByStaff: true,
    });

    if (result.success) {
      revalidatePath(`/admin/tenants/${data.tenantId}`);
      revalidatePath("/admin/users");
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((issue) => issue.message).join(". ") };
    }
    const message = error instanceof Error ? error.message : "Kunne ikke invitere bruker";
    return { success: false, error: message };
  }
}
