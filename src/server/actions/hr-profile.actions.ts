"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { assertNoManagerCycle } from "@/lib/incident-notification-routing";

const EmployeeDirectorySchema = z.object({
  userId: z.string().min(1),
  nationality: z.string().max(80).nullable().optional(),
  languages: z.array(z.string().max(40)).max(12).optional(),
  hrNotes: z.string().max(4000).nullable().optional(),
  startedAt: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  nextOfKin: z
    .array(
      z.object({
        name: z.string().max(120),
        relation: z.string().max(80).nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
      }),
    )
    .max(2)
    .optional(),
  name: z.string().max(120).optional(),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(160).nullable().optional(),
  postalCode: z.string().max(12).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  employeeNumber: z.string().max(40).nullable().optional(),
  departmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
});

type NextOfKinInput = {
  name: string;
  relation?: string | null;
  phone?: string | null;
};

function fail(message: string) {
  return { success: false as const, error: message };
}

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

async function loadMembership(userId: string, tenantId: string) {
  return prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { id: true, departmentId: true, managerId: true },
  });
}

export async function updateEmployeeHrProfile(raw: {
  userId: string;
  nationality?: string | null;
  languages?: string[];
  hrNotes?: string | null;
  startedAt?: string | null;
  dateOfBirth?: string | null;
  nextOfKin?: NextOfKinInput[];
  name?: string;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  position?: string | null;
  employeeNumber?: string | null;
  departmentId?: string | null;
  managerId?: string | null;
}) {
  const auth = await getAuthContext();
  if (!auth) return fail("Ikke innlogget");

  const parsed = EmployeeDirectorySchema.safeParse(raw);
  if (!parsed.success) return fail(formatActionError(parsed.error, "Ugyldige personalopplysninger"));
  const input = parsed.data;

  const isSelf = auth.userId === input.userId;
  const canHr = auth.permissions.canManageUsers;
  const canDept =
    auth.permissions.canReadDepartmentPersonnelFiles &&
    auth.departmentId != null;

  const membership = await loadMembership(input.userId, auth.tenantId);
  if (!membership) return fail("Brukeren er ikke medlem i virksomheten");

  const isDirectManager = membership.managerId === auth.userId;
  if (!isSelf && !canHr && !canDept && !isDirectManager) {
    return fail("Du har ikke tilgang til å oppdatere personalopplysninger");
  }
  if (!isSelf && canDept && !canHr && !isDirectManager && membership.departmentId !== auth.departmentId) {
    return fail("Du kan bare oppdatere ansatte i egen avdeling");
  }

  const canWriteNotes = auth.permissions.canReadHrNotes;
  const canWriteHrFields = isSelf || canHr || canDept || isDirectManager;
  const canWriteNationality = isSelf || canHr || isDirectManager;
  const canWriteBirthDate = isSelf || canHr || isDirectManager;
  const canWriteKin = isSelf || canHr || canDept || isDirectManager;
  const canEditContact = canHr || isDirectManager;
  const canEditOrg = canHr;

  try {
    await prisma.employeeHrProfile.upsert({
      where: { userTenantId: membership.id },
      create: {
        userTenantId: membership.id,
        nationality: canWriteNationality ? input.nationality?.trim() || null : undefined,
        languages: canWriteHrFields && input.languages ? JSON.stringify(input.languages) : undefined,
        hrNotes: canWriteNotes ? input.hrNotes?.trim() || null : undefined,
        startedAt: canWriteHrFields && input.startedAt ? new Date(input.startedAt) : undefined,
        dateOfBirth: canWriteBirthDate && input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
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
        ...(canWriteBirthDate && input.dateOfBirth !== undefined
          ? { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }
          : {}),
      },
    });

    if (canEditContact) {
      const contact = {
        ...(input.phone !== undefined ? { phone: emptyToNull(input.phone) } : {}),
        ...(input.address !== undefined ? { address: emptyToNull(input.address) } : {}),
        ...(input.postalCode !== undefined ? { postalCode: emptyToNull(input.postalCode) } : {}),
        ...(input.city !== undefined ? { city: emptyToNull(input.city) } : {}),
        ...(input.name !== undefined ? { name: emptyToNull(input.name) } : {}),
      };
      if (Object.keys(contact).length > 0) {
        await prisma.user.update({
          where: { id: input.userId },
          data: contact,
        });
      }

      await prisma.userTenant.update({
        where: { userId_tenantId: { userId: input.userId, tenantId: auth.tenantId } },
        data: {
          ...(input.name !== undefined ? { displayName: emptyToNull(input.name) } : {}),
          ...(input.phone !== undefined ? { phone: emptyToNull(input.phone) } : {}),
          ...(input.position !== undefined ? { position: emptyToNull(input.position) } : {}),
          ...(input.employeeNumber !== undefined
            ? { employeeNumber: emptyToNull(input.employeeNumber) }
            : {}),
        },
      });
    }

    if (canEditOrg && (input.departmentId !== undefined || input.managerId !== undefined)) {
      if (input.departmentId) {
        const department = await prisma.department.findFirst({
          where: { id: input.departmentId, tenantId: auth.tenantId, isActive: true },
          select: { id: true, name: true },
        });
        if (!department) return fail("Avdelingen ble ikke funnet");
        await prisma.userTenant.update({
          where: { userId_tenantId: { userId: input.userId, tenantId: auth.tenantId } },
          data: { departmentId: department.id, department: department.name },
        });
      } else if (input.departmentId === null) {
        await prisma.userTenant.update({
          where: { userId_tenantId: { userId: input.userId, tenantId: auth.tenantId } },
          data: { departmentId: null, department: null },
        });
      }

      if (input.managerId) {
        if (input.managerId === input.userId) return fail("En ansatt kan ikke være sin egen leder");
        const manager = await prisma.userTenant.findUnique({
          where: { userId_tenantId: { userId: input.managerId, tenantId: auth.tenantId } },
          select: { userId: true },
        });
        if (!manager) return fail("Lederen er ikke medlem i virksomheten");
        await assertNoManagerCycle(input.userId, input.managerId, async (userId) => {
          const row = await prisma.userTenant.findUnique({
            where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
            select: { managerId: true },
          });
          return row?.managerId ?? null;
        });
        await prisma.userTenant.update({
          where: { userId_tenantId: { userId: input.userId, tenantId: auth.tenantId } },
          data: { managerId: input.managerId },
        });
      } else if (input.managerId === null) {
        await prisma.userTenant.update({
          where: { userId_tenantId: { userId: input.userId, tenantId: auth.tenantId } },
          data: { managerId: null },
        });
      }
    }

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
    revalidatePath("/dashboard/personalarkiv");
    revalidatePath("/dashboard/brukere");
    revalidatePath("/ansatt/profil");
    return { success: true as const };
  } catch (error) {
    return fail(formatActionError(error, "Kunne ikke lagre personalopplysninger"));
  }
}
