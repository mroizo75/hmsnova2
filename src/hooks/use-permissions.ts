"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { getPermissions, hasPermission, getVisibleNavItems, type RolePermissions } from "@/lib/permissions";

/**
 * Hook for å få tilganger basert på brukerens rolle
 */
export function usePermissions() {
  const { data: session } = useSession();
  
  // Hent rolle fra første tenant (bruker kan kun ha én tenant)
  const role = session?.user?.tenantId 
    ? ((session.user as any).role as Role | undefined)
    : undefined;

  // Hvis ingen rolle, returner ingen tilganger
  if (!role) {
    return {
      role: null,
      permissions: null,
      hasPermission: () => false,
      visibleNavItems: {
        dashboard: false,
        documents: false,
        forms: false,
        risks: false,
        incidents: false,
        inspections: false,
        chemicals: false,
        training: false,
        audits: false,
        actions: false,
        goals: false,
        settings: false,
      },
    };
  }

  const permissions = getPermissions(role);
  const visibleNavItems = getVisibleNavItems(role);

  return {
    role,
    permissions,
    hasPermission: (permission: keyof RolePermissions) => hasPermission(role, permission),
    visibleNavItems,
  };
}

