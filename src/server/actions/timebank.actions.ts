"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/server-authorization";
import { applyTimeBankFactor, nextTimeBankBalance } from "@/lib/time/timebank";
import type { TimeBankEntryKind, TimeEntryType } from "@prisma/client";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function listTimeBank(userId?: string) {
  const ctx = await requirePermission("canAccessTimeRegistration");
  const targetUserId = ctx.permissions.canApproveTimesheet && userId ? userId : ctx.userId;
  const [ledgers, rules, last] = await Promise.all([
    prisma.timeBankLedger.findMany({
      where: { tenantId: ctx.tenantId, userId: targetUserId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.timeBankRule.findMany({ where: { tenantId: ctx.tenantId } }),
    prisma.timeBankLedger.findFirst({
      where: { tenantId: ctx.tenantId, userId: targetUserId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return JSON.parse(
    JSON.stringify({
      balance: last?.balanceAfter ?? 0,
      ledgers,
      rules,
      userId: targetUserId,
    })
  );
}

export async function saveTimeBankRule(input: {
  id?: string;
  salaryTypeId?: string | null;
  timeType?: TimeEntryType | null;
  factor: number;
}) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    if (input.factor <= 0) {
      return { success: false as const, error: "Faktor må være større enn 0" };
    }
    const data = {
      tenantId: ctx.tenantId,
      salaryTypeId: input.salaryTypeId || null,
      timeType: input.timeType || null,
      factor: input.factor,
    };
    const row = input.id
      ? await prisma.timeBankRule.update({ where: { id: input.id }, data })
      : await prisma.timeBankRule.create({ data });
    revalidatePath("/dashboard/time-registration");
    return { success: true as const, data: row };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre regel") };
  }
}

export async function requestTimeBankTake(input: { hours: number; reason: string; salaryTypeId?: string }) {
  try {
    const ctx = await requirePermission("canAccessTimeRegistration");
    if (input.hours <= 0) return { success: false as const, error: "Timer må være over 0" };
    if (!input.reason.trim()) return { success: false as const, error: "Årsak er påkrevd" };
    const last = await prisma.timeBankLedger.findFirst({
      where: { tenantId: ctx.tenantId, userId: ctx.userId },
      orderBy: { createdAt: "desc" },
    });
    const current = last?.balanceAfter ?? 0;
    if (input.hours > current) {
      return { success: false as const, error: "Ikke nok timebank" };
    }
    const hours = applyTimeBankFactor(input.hours, 1);
    const balance = nextTimeBankBalance(current, "TAKE", hours);
    await prisma.timeBankLedger.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        kind: "TAKE",
        hours,
        balanceAfter: balance,
        reason: input.reason.trim(),
      },
    });
    revalidatePath("/dashboard/time-registration");
    revalidatePath("/ansatt/timeregistrering");
    return { success: true as const, data: { balance } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke registrere uttak") };
  }
}

export async function correctTimeBank(input: {
  userId: string;
  hours: number;
  reason: string;
  kind?: TimeBankEntryKind;
}) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    if (!input.reason.trim()) {
      return { success: false as const, error: "Årsak er påkrevd ved manuell korreksjon" };
    }
    const last = await prisma.timeBankLedger.findFirst({
      where: { tenantId: ctx.tenantId, userId: input.userId },
      orderBy: { createdAt: "desc" },
    });
    const kind = input.kind ?? "CORRECTION";
    const balance = nextTimeBankBalance(last?.balanceAfter ?? 0, kind, input.hours);
    await prisma.timeBankLedger.create({
      data: {
        tenantId: ctx.tenantId,
        userId: input.userId,
        kind,
        hours: input.hours,
        balanceAfter: balance,
        reason: input.reason.trim(),
        correctedById: ctx.userId,
      },
    });
    revalidatePath("/dashboard/time-registration");
    return { success: true as const, data: { balance } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke korrigere") };
  }
}
