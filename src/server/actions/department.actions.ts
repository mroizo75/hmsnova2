"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

function fail(message: string) {
  return { success: false as const, error: message };
}

export async function createDepartment(input: { name: string; code?: string }) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canManageDepartments) {
    return fail("Du har ikke tilgang til å opprette avdelinger");
  }

  const name = input.name.trim().slice(0, 120);
  if (name.length < 2) {
    return fail("Avdelingsnavn må være minst 2 tegn");
  }

  try {
    const existing = await prisma.department.findFirst({
      where: { tenantId: auth.tenantId, name },
    });
    if (existing) {
      return fail("Avdelingen finnes allerede");
    }

    const maxSort = await prisma.department.aggregate({
      where: { tenantId: auth.tenantId },
      _max: { sortOrder: true },
    });

    const department = await prisma.department.create({
      data: {
        tenantId: auth.tenantId,
        name,
        code: input.code?.trim().slice(0, 40) || null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    revalidatePath("/dashboard/avdelinger");
    revalidatePath("/dashboard/brukere");
    return { success: true as const, data: department };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Kunne ikke opprette avdeling");
  }
}

export async function updateDepartment(input: {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
}) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canManageDepartments) {
    return fail("Du har ikke tilgang til å endre avdelinger");
  }

  const name = input.name.trim().slice(0, 120);
  if (name.length < 2) {
    return fail("Avdelingsnavn må være minst 2 tegn");
  }

  try {
    const existing = await prisma.department.findFirst({
      where: { id: input.id, tenantId: auth.tenantId },
    });
    if (!existing) {
      return fail("Avdelingen ble ikke funnet");
    }

    const clash = await prisma.department.findFirst({
      where: { tenantId: auth.tenantId, name, id: { not: input.id } },
    });
    if (clash) {
      return fail("Avdelingen finnes allerede");
    }

    await prisma.department.update({
      where: { id: input.id },
      data: {
        name,
        code: input.code === undefined ? undefined : input.code?.trim().slice(0, 40) || null,
        isActive: input.isActive,
      },
    });

    revalidatePath("/dashboard/avdelinger");
    revalidatePath("/dashboard/brukere");
    return { success: true as const };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Kunne ikke oppdatere avdeling");
  }
}

export async function assignUserDepartment(userId: string, departmentId: string | null) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canManageDepartments && !auth?.permissions.canManageUsers) {
    return fail("Du har ikke tilgang til å knytte ansatte til avdeling");
  }

  try {
    if (departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: departmentId, tenantId: auth.tenantId },
      });
      if (!department) {
        return fail("Avdelingen ble ikke funnet");
      }
    }

    await prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
      data: {
        departmentId,
        department: departmentId
          ? (await prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } }))?.name ?? null
          : null,
      },
    });

    revalidatePath("/dashboard/brukere");
    revalidatePath("/dashboard/avdelinger");
    revalidatePath("/dashboard/personalarkiv");
    return { success: true as const };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Kunne ikke knytte avdeling");
  }
}
