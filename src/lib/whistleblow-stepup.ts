/**
 * Signert step-up-cookie for varslingsmodulen. Gyldig 15 minutter.
 * IdP-MFA (Azure AD) erstatter ikke dette steget.
 */

import { createHmac, timingSafeEqual } from "crypto";

export const WHISTLEBLOW_STEPUP_COOKIE = "hmsnova_wb_stepup";
export const WHISTLEBLOW_STEPUP_MAX_AGE_MS = 15 * 60 * 1000;

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.FIELD_ENCRYPTION_KEY || "dev-stepup-secret";
}

export function createStepUpToken(userId: string, now = Date.now()): string {
  const exp = now + WHISTLEBLOW_STEPUP_MAX_AGE_MS;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyStepUpToken(token: string | undefined, userId: string, now = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [id, expRaw, sig] = parts;
  if (id !== userId) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now) return false;
  const payload = `${id}.${expRaw}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function stepUpCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(WHISTLEBLOW_STEPUP_MAX_AGE_MS / 1000),
  };
}
