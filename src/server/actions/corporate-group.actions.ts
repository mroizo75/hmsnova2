"use server";

import { revalidatePath } from "next/cache";
import { CorporateGroupRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  requireCorporateGroupContext,
  requireGroupPermission,
  getAccessibleTenantIds,
  assertKonsernCanAttachTenant,
} from "@/lib/corporate-group-context";
import { createTenantAdminAndSendEmail } from "@/lib/konsern-tenant-email";

export async function getCorporateGroupDetails() {
  const context = await requireCorporateGroupContext();

  const group = await prisma.corporateGroup.findUnique({
    where: { id: context.groupId },
    include: {
      tenants: {
        where: { status: "ACTIVE" },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              orgNumber: true,
              industry: true,
              city: true,
              status: true,
              employeeCount: true,
              onboardingStatus: true,
            },
          },
        },
      },
      users: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          content: true,
          distributions: true,
        },
      },
    },
  });

  if (!group) {
    throw new Error("Konsernet ble ikke funnet");
  }

  return group;
}

export async function listGroupTenants() {
  const context = await requireCorporateGroupContext();

  return prisma.corporateGroupTenant.findMany({
    where: { groupId: context.groupId, status: "ACTIVE" },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          orgNumber: true,
          industry: true,
          city: true,
          status: true,
          employeeCount: true,
          onboardingStatus: true,
          contactEmail: true,
          contactPerson: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function addTenantToGroup(tenantId: string) {
  const context = await requireGroupPermission("canManageTenants");
  const decision = await assertKonsernCanAttachTenant(context.groupId, tenantId);

  if (decision === "already-active") {
    throw new Error("Bedriften er allerede tilknyttet konsernet");
  }

  await prisma.corporateGroupTenant.update({
    where: {
      groupId_tenantId: { groupId: context.groupId, tenantId },
    },
    data: { status: "ACTIVE", joinedAt: new Date() },
  });

  await logGroupAction(context.groupId, context.userId, "ADD_TENANT", "tenant", tenantId);
  revalidatePath("/konsern");
}

export async function createTenantForGroup(data: {
  name: string;
  orgNumber?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  industry?: string;
  employeeCount?: number;
}) {
  const context = await requireGroupPermission("canManageTenants");

  if (!data.name.trim()) {
    throw new Error("Bedriftsnavn er påkrevd");
  }

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/g, "-")
    .replace(/(^-|-$)/g, "")
    + `-${Date.now().toString(36)}`;

  const tenant = await prisma.tenant.create({
    data: {
      name: data.name.trim(),
      slug,
      orgNumber: data.orgNumber || undefined,
      contactPerson: data.contactPerson || undefined,
      contactEmail: data.contactEmail || undefined,
      contactPhone: data.contactPhone || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      postalCode: data.postalCode || undefined,
      industry: data.industry || undefined,
      employeeCount: data.employeeCount || undefined,
      status: "ACTIVE",
      onboardingStatus: "NOT_STARTED",
    },
  });

  await prisma.corporateGroupTenant.create({
    data: { groupId: context.groupId, tenantId: tenant.id },
  });

  // Opprett admin-bruker og send velkomst-e-post
  let emailSent = false;
  if (data.contactEmail) {
    const group = await prisma.corporateGroup.findUnique({
      where: { id: context.groupId },
      select: { name: true },
    });
    const result = await createTenantAdminAndSendEmail({
      tenantId: tenant.id,
      tenantName: data.name.trim(),
      contactEmail: data.contactEmail,
      contactPerson: data.contactPerson,
      groupName: group?.name ?? "Konsern",
    });
    emailSent = result.emailSent;
  }

  await logGroupAction(context.groupId, context.userId, "ADD_TENANT", "tenant", tenant.id);
  revalidatePath("/konsern");
  return { ...tenant, emailSent };
}

export async function removeTenantFromGroup(tenantId: string) {
  const context = await requireGroupPermission("canManageTenants");

  await prisma.corporateGroupTenant.update({
    where: {
      groupId_tenantId: { groupId: context.groupId, tenantId },
    },
    data: { status: "REMOVED" },
  });

  await logGroupAction(context.groupId, context.userId, "REMOVE_TENANT", "tenant", tenantId);
  revalidatePath("/konsern");
}

export async function listGroupUsers() {
  const context = await requireCorporateGroupContext();

  return prisma.corporateGroupUser.findMany({
    where: { groupId: context.groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function addGroupUser(userId: string, role: CorporateGroupRole) {
  const context = await requireGroupPermission("canManageUsers");

  const existing = await prisma.corporateGroupUser.findUnique({
    where: {
      groupId_userId: { groupId: context.groupId, userId },
    },
  });

  if (existing) {
    throw new Error("Brukeren er allerede medlem av konsernet");
  }

  await prisma.corporateGroupUser.create({
    data: {
      groupId: context.groupId,
      userId,
      role,
    },
  });

  await logGroupAction(context.groupId, context.userId, "ADD_USER", "user", userId, { role });
  revalidatePath("/konsern");
}

export async function updateGroupUserRole(userId: string, role: CorporateGroupRole) {
  const context = await requireGroupPermission("canManageUsers");

  if (userId === context.userId) {
    throw new Error("Du kan ikke endre din egen rolle");
  }

  await prisma.corporateGroupUser.update({
    where: {
      groupId_userId: { groupId: context.groupId, userId },
    },
    data: { role },
  });

  await logGroupAction(context.groupId, context.userId, "UPDATE_USER_ROLE", "user", userId, { role });
  revalidatePath("/konsern");
}

export async function removeGroupUser(userId: string) {
  const context = await requireGroupPermission("canManageUsers");

  if (userId === context.userId) {
    throw new Error("Du kan ikke fjerne deg selv fra konsernet");
  }

  await prisma.corporateGroupUser.delete({
    where: {
      groupId_userId: { groupId: context.groupId, userId },
    },
  });

  await logGroupAction(context.groupId, context.userId, "REMOVE_USER", "user", userId);
  revalidatePath("/konsern");
}

export async function inviteGroupUserByEmail(email: string, role: CorporateGroupRole) {
  const context = await requireGroupPermission("canManageUsers");
  const normalizedEmail = email.trim().toLowerCase();

  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedEmail.split("@")[0],
        password: "",
      },
    });
  }

  const existing = await prisma.corporateGroupUser.findUnique({
    where: { groupId_userId: { groupId: context.groupId, userId: user.id } },
  });

  if (existing) {
    throw new Error("Brukeren er allerede medlem av konsernet");
  }

  await prisma.corporateGroupUser.create({
    data: {
      groupId: context.groupId,
      userId: user.id,
      role,
    },
  });

  await logGroupAction(context.groupId, context.userId, "INVITE_USER", "user", user.id, {
    email: normalizedEmail,
    role,
  });

  revalidatePath("/konsern/brukere");
  return { success: true, userName: user.name, userEmail: user.email };
}

export async function updateGroupSettings(data: {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const context = await requireGroupPermission("canManageGroup");

  await prisma.corporateGroup.update({
    where: { id: context.groupId },
    data,
  });

  await logGroupAction(context.groupId, context.userId, "UPDATE_SETTINGS", "group", context.groupId);
  revalidatePath("/konsern");
}

export async function getGroupDashboardStats() {
  const context = await requireCorporateGroupContext();
  const tenantIds = await getAccessibleTenantIds(context.groupId);

  const [
    totalTenants,
    totalContent,
    totalDistributions,
    pendingDistributions,
  ] = await Promise.all([
    prisma.corporateGroupTenant.count({
      where: { groupId: context.groupId, status: "ACTIVE" },
    }),
    prisma.corporateGroupContent.count({
      where: { groupId: context.groupId },
    }),
    prisma.corporateGroupDistribution.count({
      where: { groupId: context.groupId, status: "DISTRIBUTED" },
    }),
    prisma.corporateGroupDistribution.count({
      where: { groupId: context.groupId, status: "PENDING" },
    }),
  ]);

  return {
    totalTenants,
    totalContent,
    totalDistributions,
    pendingDistributions,
    tenantIds,
  };
}

async function logGroupAction(
  groupId: string,
  userId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  await prisma.corporateGroupAuditLog.create({
    data: {
      groupId,
      userId,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
    },
  });
}
