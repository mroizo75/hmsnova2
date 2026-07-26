import "next-auth";
import "next-auth/jwt";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    isSuperAdmin?: boolean;
    isSupport?: boolean;
    tenantId?: string | null;
    tenantName?: string | null;
    role?: Role;
    hasMultipleTenants?: boolean;
    preferredLocale?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isSuperAdmin?: boolean;
      isSupport?: boolean;
      tenantId?: string | null;
      tenantName?: string | null;
      role?: Role;
      hasMultipleTenants?: boolean;
      preferredLocale?: string;
      isTavleOnly?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isSuperAdmin?: boolean;
    isSupport?: boolean;
    tenantId?: string | null;
    tenantName?: string | null;
    role?: Role;
    hasMultipleTenants?: boolean;
    preferredLocale?: string;
    isTavleOnly?: boolean;
  }
}
