import { getServerSession } from "next-auth/next";
import { CorporateGroupRole } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { canEnterKonsernFromHms } from "@/lib/konsern-access";
import { prisma } from "@/lib/db";

export interface CorporateGroupContext {
  userId: string;
  email: string;
  groupId: string;
  groupRole: CorporateGroupRole;
}

export type CorporateGroupPermission =
  | "canManageGroup"
  | "canManageUsers"
  | "canManageTenants"
  | "canCreateContent"
  | "canEditContent"
  | "canPublishContent"
  | "canDistributeContent"
  | "canViewAuditLog"
  | "canReadContent"
  | "canReadTenants";

const groupRolePermissions: Record<CorporateGroupRole, Record<CorporateGroupPermission, boolean>> = {
  GROUP_ADMIN: {
    canManageGroup: true,
    canManageUsers: true,
    canManageTenants: true,
    canCreateContent: true,
    canEditContent: true,
    canPublishContent: true,
    canDistributeContent: true,
    canViewAuditLog: true,
    canReadContent: true,
    canReadTenants: true,
  },
  GROUP_HMS: {
    canManageGroup: false,
    canManageUsers: false,
    canManageTenants: false,
    canCreateContent: true,
    canEditContent: true,
    canPublishContent: true,
    canDistributeContent: true,
    canViewAuditLog: true,
    canReadContent: true,
    canReadTenants: true,
  },
  GROUP_READER: {
    canManageGroup: false,
    canManageUsers: false,
    canManageTenants: false,
    canCreateContent: false,
    canEditContent: false,
    canPublishContent: false,
    canDistributeContent: false,
    canViewAuditLog: false,
    canReadContent: true,
    canReadTenants: true,
  },
};

export function getGroupPermissions(role: CorporateGroupRole) {
  return groupRolePermissions[role];
}

export function hasGroupPermission(
  role: CorporateGroupRole,
  permission: CorporateGroupPermission
): boolean {
  return groupRolePermissions[role][permission];
}

export async function getCorporateGroupContext(): Promise<CorporateGroupContext | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.email) {
    return null;
  }

  const groupId = session.user.corporateGroupId;
  if (!groupId) {
    return null;
  }

  if (
    !session.user.isSuperAdmin &&
    !session.user.isSupport &&
    session.user.tenantId &&
    !canEnterKonsernFromHms(session.user.role)
  ) {
    return null;
  }

  const membership = await prisma.corporateGroupUser.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    groupId: membership.groupId,
    groupRole: membership.role,
  };
}

export async function requireCorporateGroupContext(): Promise<CorporateGroupContext> {
  const context = await getCorporateGroupContext();

  if (!context) {
    throw new Error("Ikke autorisert for konsern-tilgang");
  }

  return context;
}

export async function requireGroupPermission(
  permission: CorporateGroupPermission
): Promise<CorporateGroupContext> {
  const context = await requireCorporateGroupContext();

  if (!hasGroupPermission(context.groupRole, permission)) {
    throw new Error("Ikke autorisert til å utføre denne handlingen i konsernet");
  }

  return context;
}

export async function getAccessibleTenantIds(groupId: string): Promise<string[]> {
  const tenants = await prisma.corporateGroupTenant.findMany({
    where: { groupId, status: "ACTIVE" },
    select: { tenantId: true },
  });

  return tenants.map((t) => t.tenantId);
}

export async function requireTenantInGroup(
  groupId: string,
  tenantId: string
): Promise<void> {
  const membership = await prisma.corporateGroupTenant.findUnique({
    where: {
      groupId_tenantId: { groupId, tenantId },
    },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new Error("Bedriften tilhører ikke dette konsernet");
  }
}

export async function assertTenantsInGroup(
  groupId: string,
  tenantIds: string[]
): Promise<void> {
  if (tenantIds.length === 0) {
    return;
  }

  const accessible = new Set(await getAccessibleTenantIds(groupId));
  const invalid = tenantIds.filter((id) => !accessible.has(id));

  if (invalid.length > 0) {
    throw new Error("En eller flere bedrifter tilhører ikke dette konsernet");
  }
}

/**
 * Konsern-admin kan kun gjenopprette en bedrift som tidligere var
 * tilknyttet *dette* konsernet. Tilknytning av en vilkårlig eksisterende
 * tenant er superadmin-only — ellers kan et konsern lese et annet selskaps data.
 */
export async function assertKonsernCanAttachTenant(
  groupId: string,
  tenantId: string
): Promise<"reactivate" | "already-active"> {
  const membership = await prisma.corporateGroupTenant.findUnique({
    where: {
      groupId_tenantId: { groupId, tenantId },
    },
  });

  if (membership?.status === "ACTIVE") {
    return "already-active";
  }

  if (membership?.status === "REMOVED") {
    return "reactivate";
  }

  throw new Error(
    "Eksisterende bedrifter kan kun knyttes til konsernet av HMS Nova-administrator"
  );
}

export function resolveWritableGroupId(input: {
  sessionGroupId: string | null | undefined;
  requestedGroupId: string | null | undefined;
  isSuperAdmin: boolean;
}): string {
  if (input.isSuperAdmin) {
    const groupId = input.requestedGroupId || input.sessionGroupId;
    if (!groupId) {
      throw new Error("Mangler konsern-ID");
    }
    return groupId;
  }

  if (!input.sessionGroupId) {
    throw new Error("Ikke autorisert for konsern-tilgang");
  }

  if (input.requestedGroupId && input.requestedGroupId !== input.sessionGroupId) {
    throw new Error("Ikke autorisert til å endre et annet konsern");
  }

  return input.sessionGroupId;
}
