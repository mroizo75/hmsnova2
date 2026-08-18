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
        routines: false,
        legalRegister: false,
        risks: false,
        riskRegister: false,
        incidents: false,
        hseStatistics: false,
        ruh: false,
        sja: false,
        inspections: false,
        environment: false,
        chemicals: false,
        training: false,
        audits: false,
        managementReviews: false,
        annualHmsPlan: false,
        meetings: false,
        feedback: false,
        complaints: false,
        whistleblowing: false,
        actions: false,
        goals: false,
        settings: false,
        timeRegistration: false,
        exposureRegister: false,
        constructionCompliance: false,
        hmsTavle: false,
        employeeReviews: false,
        support: false,
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

