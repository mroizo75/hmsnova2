/**
 * Server-side authorization utility
 * 
 * Bruk denne for å sjekke tilganger i server actions
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { type RolePermissions } from "@/lib/permissions";
import {
  parseModuleVisibilityConfig,
  getEffectivePermissions,
  type ModuleVisibilityConfig,
} from "@/lib/module-visibility";

export interface AuthContext {
  userId: string;
  userEmail: string;
  tenantId: string;
  role: Role;
  permissions: RolePermissions;
  moduleVisibilityConfig: ModuleVisibilityConfig | null;
}

/**
 * Hent effektiv tilgang for en rolle i en tenant.
 * Respekterer moduleVisibilityConfig (null = MODULE_DEFAULTS).
 * Bruk denne i API-ruter i stedet for rå getPermissions(role).
 */
export async function resolveEffectivePermissions(
  tenantId: string,
  role: Role
): Promise<RolePermissions> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { moduleVisibilityConfig: true },
  });

  return getEffectivePermissions(
    role,
    parseModuleVisibilityConfig(tenant?.moduleVisibilityConfig)
  );
}

/**
 * Hent brukerens context og sjekk autorisasjon.
 * Inkluderer tenant-spesifikk modul-synlighet som overstyrer standard rolePermissions.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    return null;
  }

  const userTenant = session.user.tenantId
    ? await prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: session.user.tenantId,
          },
        },
      })
    : await prisma.userTenant.findFirst({
        where: { userId: user.id },
      });

  if (!userTenant) {
    return null;
  }

  const role = userTenant.role;

  const tenant = await prisma.tenant.findUnique({
    where: { id: userTenant.tenantId },
    select: { moduleVisibilityConfig: true },
  });

  const moduleVisibilityConfig = parseModuleVisibilityConfig(
    tenant?.moduleVisibilityConfig
  );

  const permissions = getEffectivePermissions(role, moduleVisibilityConfig);

  return {
    userId: user.id,
    userEmail: user.email,
    tenantId: userTenant.tenantId,
    role,
    permissions,
    moduleVisibilityConfig,
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

