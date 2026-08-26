import "next-auth";
import "next-auth/jwt";
import { Role, CorporateGroupRole } from "@prisma/client";

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
    corporateGroupId?: string | null;
    corporateGroupRole?: CorporateGroupRole | null;
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
      corporateGroupId?: string | null;
      corporateGroupRole?: CorporateGroupRole | null;
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
    corporateGroupId?: string | null;
    corporateGroupRole?: CorporateGroupRole | null;
  }
}
