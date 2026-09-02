"use server";

import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTotpSecret, totpAuthUrl, verifyTotp } from "@/lib/totp";
import { decryptTotpSecret, encryptTotpSecret } from "@/lib/whistleblowing-crypto";
import {
  createStepUpToken,
  stepUpCookieOptions,
  verifyStepUpToken,
  WHISTLEBLOW_STEPUP_COOKIE,
} from "@/lib/whistleblow-stepup";
import { logWhistleblowAccess } from "@/lib/whistleblowing-audit";

function fail(code: string, message: string): never {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  throw error;
}

export async function hasWhistleblowStepUp(userId: string): Promise<boolean> {
  const store = await cookies();
  return verifyStepUpToken(store.get(WHISTLEBLOW_STEPUP_COOKIE)?.value, userId);
}

export async function getTotpStatus() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) fail("UNAUTHORIZED", "Ikke innlogget");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabledAt: true, email: true, totpSecret: true },
  });

  return {
    enabled: Boolean(user?.totpEnabledAt),
    email: user?.email ?? "",
    enrolled: Boolean(user?.totpSecret),
  };
}

export async function startTotpEnrollment() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) fail("UNAUTHORIZED", "Ikke innlogget");

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      totpSecret: encryptTotpSecret(secret),
      totpEnabledAt: null,
    },
  });

  return {
    secret,
    otpauthUrl: totpAuthUrl(secret, session.user.email),
  };
}

export async function confirmTotpEnrollment(code: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) fail("UNAUTHORIZED", "Ikke innlogget");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecret: true },
  });
  if (!user?.totpSecret) fail("VALIDATION", "Ingen påmelding pågår");

  const secret = decryptTotpSecret(user.totpSecret);
  if (!verifyTotp(secret, code)) fail("VALIDATION", "Ugyldig kode");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpEnabledAt: new Date() },
  });

  const store = await cookies();
  store.set(WHISTLEBLOW_STEPUP_COOKIE, createStepUpToken(session.user.id), stepUpCookieOptions());
  return { ok: true };
}

export async function verifyWhistleblowStepUp(code: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) fail("UNAUTHORIZED", "Ikke innlogget");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  if (!user?.totpSecret || !user.totpEnabledAt) {
    fail("SETUP_REQUIRED", "Tofaktor må aktiveres først");
  }

  const secret = decryptTotpSecret(user.totpSecret);
  if (!verifyTotp(secret, code)) fail("VALIDATION", "Ugyldig kode");

  const store = await cookies();
  store.set(WHISTLEBLOW_STEPUP_COOKIE, createStepUpToken(session.user.id), stepUpCookieOptions());

  if (session.user.tenantId) {
    await logWhistleblowAccess({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "STEP_UP",
    });
  }

  return { ok: true };
}

export async function userRequiresWhistleblowTotp(userId: string, tenantId: string | null, role?: string | null) {
  if (role === "VARSLINGSANSVARLIG") return true;
  if (!tenantId) return false;
  const grant = await prisma.whistleblowAccessGrant.findFirst({
    where: {
      tenantId,
      granteeId: userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return Boolean(grant);
}
