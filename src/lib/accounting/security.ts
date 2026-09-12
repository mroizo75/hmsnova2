import { createHash, timingSafeEqual } from "crypto";

export const WEBHOOK_SECRET_PREFIX = "v1:";

export function hashWebhookSecret(plain: string): string {
  const digest = createHash("sha256").update(plain, "utf8").digest("hex");
  return `${WEBHOOK_SECRET_PREFIX}${digest}`;
}

export function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length >= 16 ? token : null;
}

export function isHashedWebhookSecret(stored: string): boolean {
  return stored.startsWith(WEBHOOK_SECRET_PREFIX);
}

export function webhookSecretsEqual(storedPlain: string, incomingPlain: string): boolean {
  const a = Buffer.from(storedPlain);
  const b = Buffer.from(incomingPlain);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function tripletexSessionCacheKey(tenantId: string, employeeToken: string): string {
  const tokenHash = createHash("sha256").update(employeeToken, "utf8").digest("hex").slice(0, 16);
  return `${tenantId}:${tokenHash}`;
}

export function isTripletexSessionKeyForTenant(cacheKey: string, tenantId: string): boolean {
  return cacheKey === tenantId || cacheKey.startsWith(`${tenantId}:`);
}
