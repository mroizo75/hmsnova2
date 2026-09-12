"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

type NextOfKinInput = {
  name: string;
  relation?: string | null;
  phone?: string | null;
};

function fail(message: string) {
  return { success: false as const, error: message };
}

async function loadMembership(userId: string, tenantId: string) {
  return prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { id: true, departmentId: true },
  });
}

export async function updateEmployeeHrProfile(input: {
  userId: string;
  nationality?: string | null;
  languages?: string[];
  hrNotes?: string | null;
  startedAt?: string | null;
  dateOfBirth?: string | null;
  nextOfKin?: NextOfKinInput[];
}) {
  const auth = await getAuthContext();
  if (!auth) return fail("Ikke innlogget");

  const isSelf = auth.userId === input.userId;
  const canHr = auth.permissions.canReadAllPersonnelFiles && auth.permissions.canReadHrNotes;
  const canDept =
    auth.permissions.canReadDepartmentPersonnelFiles &&
    auth.departmentId != null;

  if (!isSelf && !canHr && !canDept) {
    return fail("Du har ikke tilgang til å oppdatere personalopplysninger");
  }

  const membership = await loadMembership(input.userId, auth.tenantId);
  if (!membership) return fail("Brukeren er ikke medlem i virksomheten");

  if (!isSelf && canDept && !canHr && membership.departmentId !== auth.departmentId) {
    return fail("Du kan bare oppdatere ansatte i egen avdeling");
  }

  const canWriteNotes = canHr;
  const canWriteHrFields = canHr || canDept;
  const canWriteNationality = canHr;
  const canWriteKin = isSelf || canHr || canDept;

  try {
    await prisma.employeeHrProfile.upsert({
      where: { userTenantId: membership.id },
      create: {
        userTenantId: membership.id,
        nationality: canWriteNationality ? input.nationality?.trim() || null : undefined,
        languages: canWriteHrFields && input.languages ? JSON.stringify(input.languages) : undefined,
        hrNotes: canWriteNotes ? input.hrNotes?.trim() || null : undefined,
        startedAt: canWriteHrFields && input.startedAt ? new Date(input.startedAt) : undefined,
        dateOfBirth: (isSelf || canHr) && input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      },
      update: {
        ...(canWriteNationality && input.nationality !== undefined
          ? { nationality: input.nationality?.trim() || null }
          : {}),
        ...(canWriteHrFields && input.languages
          ? { languages: JSON.stringify(input.languages) }
          : {}),
        ...(canWriteNotes && input.hrNotes !== undefined ? { hrNotes: input.hrNotes?.trim() || null } : {}),
        ...(canWriteHrFields && input.startedAt !== undefined
          ? { startedAt: input.startedAt ? new Date(input.startedAt) : null }
          : {}),
        ...((isSelf || canHr) && input.dateOfBirth !== undefined
          ? { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }
          : {}),
      },
    });

    if (canWriteKin && input.nextOfKin) {
      const kin = input.nextOfKin
        .map((item, index) => ({
          name: item.name.trim(),
          relation: item.relation?.trim() || null,
          phone: item.phone?.trim() || null,
          sortOrder: index,
        }))
        .filter((item) => item.name.length > 0)
        .slice(0, 2);

      await prisma.$transaction([
        prisma.employeeNextOfKin.deleteMany({ where: { userTenantId: membership.id } }),
        ...kin.map((item) =>
          prisma.employeeNextOfKin.create({
            data: { userTenantId: membership.id, ...item },
          }),
        ),
      ]);
    }

    revalidatePath(`/dashboard/personalarkiv/${input.userId}`);
    revalidatePath("/ansatt/profil");
    return { success: true as const };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Kunne ikke lagre HR-profil");
  }
}
