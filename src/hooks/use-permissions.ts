"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import {
  emptyVisibleNavItems,
  getPermissions,
  getVisibleNavItems,
  hasPermission,
  type RolePermissions,
} from "@/lib/permissions";

/**
 * Hook for å få tilganger basert på brukerens rolle
 */
export function usePermissions() {
  const { data: session } = useSession();

  const role = session?.user?.tenantId
    ? ((session.user as { role?: Role }).role as Role | undefined)
    : undefined;

  if (!role) {
    return {
      role: null,
      permissions: null,
      hasPermission: () => false,
      visibleNavItems: emptyVisibleNavItems(),
    };
  }

  const permissions = getPermissions(role);
  const visibleNavItems = getVisibleNavItems(role);
  if (session?.user?.hasConfidentialInbox) {
    visibleNavItems.confidentialTasks = true;
  }

  return {
    role,
    permissions,
    hasPermission: (permission: keyof RolePermissions) => hasPermission(role, permission),
    visibleNavItems,
  };
}
