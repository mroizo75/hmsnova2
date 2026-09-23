import type { Role } from "@prisma/client";

/**
 * OIDC-scopes for Microsoft-innlogging.
 * User.Read brukes kun til org-felter via Graph (/me og /me/manager).
 * Profilbilde hentes ikke — Azure-provideren overstyrer profile() uten Graph-foto.
 */
export const AZURE_AD_OIDC_SCOPE = "openid profile email";
export const AZURE_AD_ORG_SCOPE = "User.Read";
export const AZURE_AD_LOGIN_SCOPE = `${AZURE_AD_OIDC_SCOPE} ${AZURE_AD_ORG_SCOPE}`;

export const AZURE_AD_JIT_ROLES: Role[] = [
  "ANSATT",
  "LEDER",
  "HR",
  "HMS",
  "VERNEOMBUD",
  "BHT",
  "REVISOR",
];

const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.no",
  "hotmail.com",
  "hotmail.no",
  "live.com",
  "live.no",
  "msn.com",
  "yahoo.com",
  "yahoo.no",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
]);

const DOMAIN_REGEX = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;

export type AzureAdIdTokenProfile = {
  sub?: string;
  name?: string | null;
  email?: string | null;
  preferred_username?: string | null;
  upn?: string | null;
};

export function canonicalizeAzureAdEmail(
  profileOrEmail: AzureAdIdTokenProfile | string | null | undefined
): string {
  if (typeof profileOrEmail === "string") {
    return profileOrEmail.toLowerCase().trim();
  }

  const raw =
    profileOrEmail?.preferred_username ||
    profileOrEmail?.upn ||
    profileOrEmail?.email ||
    "";

  return raw.toLowerCase().trim();
}

export function extractEmailDomain(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain || null;
}

export function normalizeAzureAdDomain(domain: string): string {
  return domain.toLowerCase().trim().replace(/^@/, "");
}

export function isValidAzureAdDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(normalizeAzureAdDomain(domain));
}

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(normalizeAzureAdDomain(domain));
}

export function resolveAzureAdJitRole(role: Role | string | null | undefined): Role {
  if (role && AZURE_AD_JIT_ROLES.includes(role as Role)) {
    return role as Role;
  }
  return "ANSATT";
}

/**
 * Microsoft-innlogging skal aldri utstede session uten bedrift.
 * Superadmin/support kan være uten UserTenant (de bruker /admin).
 * Konsern-medlemskap alene er ikke nok — SSO krever tenant.
 */
export function azureAdLoginMayIssueSession(input: {
  membershipCount: number;
  tenantId: string | null | undefined;
  isSuperAdmin: boolean;
  isSupport: boolean;
}): boolean {
  if (input.isSuperAdmin || input.isSupport) {
    return true;
  }

  return input.membershipCount > 0 && Boolean(input.tenantId);
}

