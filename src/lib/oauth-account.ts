import type { AdapterAccount } from "next-auth/adapters";

/**
 * Kolonnene som faktisk finnes i Prisma-modellen `Account`.
 *
 * NextAuth bygger `account` som `{ provider, type, providerAccountId, ...tokenSet }`,
 * og PrismaAdapter sender objektet rått inn i `account.create()`. Azure AD returnerer
 * `ext_expires_in` i token-responsen, som ikke finnes i modellen og får Prisma til å
 * kaste "Unknown argument" midt i OAuth-callbacken.
 */
const ACCOUNT_COLUMNS = [
  "userId",
  "type",
  "provider",
  "providerAccountId",
  "refresh_token",
  "access_token",
  "expires_at",
  "token_type",
  "scope",
  "id_token",
  "session_state",
] as const;

export function sanitizeAdapterAccount(account: AdapterAccount): AdapterAccount {
  const source = account as unknown as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const column of ACCOUNT_COLUMNS) {
    const value = source[column];
    if (value !== undefined) {
      sanitized[column] = value;
    }
  }

  return sanitized as unknown as AdapterAccount;
}
