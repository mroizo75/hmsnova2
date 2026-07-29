import test from "node:test";
import assert from "node:assert/strict";
import type { AdapterAccount } from "next-auth/adapters";
import { sanitizeAdapterAccount } from "../src/lib/oauth-account";

// Speiler token-responsen fra Azure AD v2.0, som inkluderer ext_expires_in.
const azureAdAccount = {
  userId: "clx0000000000000000000000",
  type: "oauth",
  provider: "azure-ad",
  providerAccountId: "00000000-0000-0000-0000-000000000001",
  access_token: "access",
  id_token: "id",
  refresh_token: "refresh",
  token_type: "Bearer",
  scope: "openid profile email User.Read",
  expires_at: 1893456000,
  ext_expires_in: 3599,
} as unknown as AdapterAccount;

test("felt som ikke finnes i Account-modellen fjernes", () => {
  const sanitized = sanitizeAdapterAccount(azureAdAccount) as unknown as Record<string, unknown>;
  assert.equal("ext_expires_in" in sanitized, false);
});

test("alle kjente felt beholdes uendret", () => {
  const sanitized = sanitizeAdapterAccount(azureAdAccount) as unknown as Record<string, unknown>;
  assert.deepEqual(sanitized, {
    userId: "clx0000000000000000000000",
    type: "oauth",
    provider: "azure-ad",
    providerAccountId: "00000000-0000-0000-0000-000000000001",
    refresh_token: "refresh",
    access_token: "access",
    expires_at: 1893456000,
    token_type: "Bearer",
    scope: "openid profile email User.Read",
    id_token: "id",
  });
});

test("felt som mangler tas ikke med som undefined", () => {
  const minimalAccount = {
    userId: "clx0000000000000000000000",
    type: "oauth",
    provider: "azure-ad",
    providerAccountId: "00000000-0000-0000-0000-000000000002",
  } as unknown as AdapterAccount;

  const sanitized = sanitizeAdapterAccount(minimalAccount) as unknown as Record<string, unknown>;
  assert.deepEqual(Object.keys(sanitized).sort(), [
    "provider",
    "providerAccountId",
    "type",
    "userId",
  ]);
});
