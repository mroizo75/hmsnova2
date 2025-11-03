/**
 * Server-side authorization utility
 * 
 * Bruk denne for å sjekke tilganger i server actions
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { getPermissions, type RolePermissions } from "@/lib/permissions";

export interface AuthContext {
  userId: string;
  userEmail: string;
  tenantId: string;
  role: Role;
  permissions: RolePermissions;
}

/**
 * Hent brukerens context og sjekk autorisasjon
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        take: 1,
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return null;
  }

  const userTenant = user.tenants[0];
  const role = userTenant.role;
  const permissions = getPermissions(role);

  return {
    userId: user.id,
    userEmail: user.email,
    tenantId: userTenant.tenantId,
    role,
    permissions,
  };
}

/**
 * Sjekk om brukeren har en spesifikk tilgang
 * Kaster feil hvis ikke autorisert
 */
export async function requirePermission(
  permission: keyof RolePermissions
): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    throw new Error("Ikke autentisert");
  }

  if (!context.permissions[permission]) {
    throw new Error("Ikke autorisert til å utføre denne handlingen");
  }

  return context;
}

/**
 * Sjekk om brukeren har tilgang til en bestemt tenant
 */
export async function requireTenantAccess(tenantId: string): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    throw new Error("Ikke autentisert");
  }

  if (context.tenantId !== tenantId) {
    throw new Error("Ikke autorisert til å aksessere denne bedriften");
  }

  return context;
}

/**
 * Sjekk om brukeren eier en ressurs (eller har tilgang til den)
 */
export async function requireResourceAccess(
  resourceType: "document" | "risk" | "incident" | "measure" | "audit" | "training" | "goal" | "chemical",
  resourceId: string
): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    throw new Error("Ikke autentisert");
  }

  // Hent ressursen for å sjekke tenantId
  let resource: { tenantId: string; [key: string]: any } | null = null;

  switch (resourceType) {
    case "document":
      resource = await prisma.document.findUnique({ where: { id: resourceId } });
      break;
    case "risk":
      resource = await prisma.risk.findUnique({ where: { id: resourceId } });
      break;
    case "incident":
      resource = await prisma.incident.findUnique({ where: { id: resourceId } });
      break;
    case "measure":
      resource = await prisma.measure.findUnique({ where: { id: resourceId } });
      break;
    case "audit":
      resource = await prisma.audit.findUnique({ where: { id: resourceId } });
      break;
    case "training":
      resource = await prisma.training.findUnique({ where: { id: resourceId } });
      break;
    case "goal":
      resource = await prisma.goal.findUnique({ where: { id: resourceId } });
      break;
    case "chemical":
      resource = await prisma.chemical.findUnique({ where: { id: resourceId } });
      break;
  }

  if (!resource) {
    throw new Error("Ressurs ikke funnet");
  }

  if (resource.tenantId !== context.tenantId) {
    throw new Error("Ikke autorisert til å aksessere denne ressursen");
  }

  return context;
}

