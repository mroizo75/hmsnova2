"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/server-authorization";
import {
  applyTimeBankFactor,
  assertTimeBankBalance,
  nextTimeBankBalance,
  withinTakeLimit,
} from "@/lib/time/timebank";
import type { TimeBankEntryKind, TimeEntryType } from "@prisma/client";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function revalidateBank() {
  revalidatePath("/dashboard/time-registration");
  revalidatePath("/ansatt/timeregistrering");
}

async function lastApprovedBalance(tenantId: string, userId: string): Promise<number> {
  const last = await prisma.timeBankLedger.findFirst({
    where: { tenantId, userId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });
  return last?.balanceAfter ?? 0;
}

export async function listTimeBank(input?: { userId?: string; from?: string; to?: string }) {
  const ctx = await requirePermission("canAccessTimeRegistration");
  const targetUserId = ctx.permissions.canApproveTimesheet && input?.userId ? input.userId : ctx.userId;
  const from = input?.from ? new Date(`${input.from.slice(0, 10)}T00:00:00`) : undefined;
  const to = input?.to ? new Date(`${input.to.slice(0, 10)}T23:59:59`) : undefined;
  const [ledgers, rules, tenant, users, pending, salaryTypes] = await Promise.all([
    prisma.timeBankLedger.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: targetUserId,
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.timeBankRule.findMany({ where: { tenantId: ctx.tenantId } }),
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { timeBankMaxBalance: true, timeBankMinBalance: true },
    }),
    ctx.permissions.canApproveTimesheet
      ? prisma.userTenant.findMany({
          where: { tenantId: ctx.tenantId },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      : Promise.resolve([]),
    ctx.permissions.canApproveTimesheet
      ? prisma.timeBankLedger.findMany({
          where: { tenantId: ctx.tenantId, kind: "TAKE", status: "PENDING" },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.accountingSalaryType.findMany({
      where: { tenantId: ctx.tenantId, isInactive: false },
      orderBy: { name: "asc" },
    }),
  ]);
  const balance = await lastApprovedBalance(ctx.tenantId, targetUserId);
  return JSON.parse(
    JSON.stringify({
      balance,
      ledgers,
      rules,
      userId: targetUserId,
      maxBalance: tenant?.timeBankMaxBalance ?? null,
      minBalance: tenant?.timeBankMinBalance ?? null,
      users: Array.isArray(users)
        ? users.map((u) => ({
            userId: u.userId,
            name: u.user.name,
            email: u.user.email,
          }))
        : [],
      pendingTakes: pending,
      salaryTypes,
    })
  );
}

export async function saveTimeBankRule(input: {
  id?: string;
  salaryTypeId?: string | null;
  timeType?: TimeEntryType | null;
  factor: number;
  appliesToUserIds?: string[];
  maxTakeHours?: number | null;
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
      appliesToUserIds: input.appliesToUserIds ?? [],
      maxTakeHours: input.maxTakeHours ?? null,
    };
    const row = input.id
      ? await prisma.timeBankRule.update({ where: { id: input.id }, data })
      : await prisma.timeBankRule.create({ data });
    revalidateBank();
    return { success: true as const, data: row };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre regel") };
  }
}

export async function saveTimeBankLimits(input: { maxBalance?: number | null; minBalance?: number | null }) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        timeBankMaxBalance: input.maxBalance ?? null,
        timeBankMinBalance: input.minBalance ?? null,
      },
    });
    revalidateBank();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre grenser") };
  }
}

export async function requestTimeBankTake(input: { hours: number; reason: string; salaryTypeId?: string }) {
  try {
    const ctx = await requirePermission("canAccessTimeRegistration");
    if (input.hours <= 0) return { success: false as const, error: "Timer må være over 0" };
    if (!input.reason.trim()) return { success: false as const, error: "Årsak er påkrevd" };
    const current = await lastApprovedBalance(ctx.tenantId, ctx.userId);
    if (input.hours > current) {
      return { success: false as const, error: "Ikke nok timebank" };
    }
    const rules = await prisma.timeBankRule.findMany({ where: { tenantId: ctx.tenantId } });
    const maxTake = rules.find((r) => r.maxTakeHours != null)?.maxTakeHours ?? null;
    if (!withinTakeLimit(input.hours, maxTake)) {
      return { success: false as const, error: `Uttak kan ikke overstige ${maxTake} t` };
    }
    const hours = applyTimeBankFactor(input.hours, 1);
    await prisma.timeBankLedger.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        kind: "TAKE",
        status: "PENDING",
        hours,
        balanceAfter: current,
        reason: input.reason.trim(),
      },
    });
    revalidateBank();
    return { success: true as const, data: { balance: current } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke registrere uttak") };
  }
}

export async function decideTimeBankTake(id: string, approve: boolean) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    const row = await prisma.timeBankLedger.findFirst({
      where: { id, tenantId: ctx.tenantId, kind: "TAKE" },
    });
    if (!row || row.status !== "PENDING") {
      return { success: false as const, error: "Uttak ikke funnet" };
    }
    if (!approve) {
      await prisma.timeBankLedger.update({
        where: { id },
        data: { status: "REJECTED", correctedById: ctx.userId },
      });
      revalidateBank();
      return { success: true as const };
    }
    const current = await lastApprovedBalance(ctx.tenantId, row.userId);
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { timeBankMaxBalance: true, timeBankMinBalance: true },
    });
    const balance = nextTimeBankBalance(current, "TAKE", row.hours);
    const check = assertTimeBankBalance(balance, {
      min: tenant?.timeBankMinBalance,
      max: tenant?.timeBankMaxBalance,
    });
    if (!check.ok) {
      return { success: false as const, error: check.error ?? "Ugyldig timebanksaldo" };
    }
    await prisma.timeBankLedger.update({
      where: { id },
      data: { status: "APPROVED", balanceAfter: balance, correctedById: ctx.userId },
    });
    revalidateBank();
    return { success: true as const, data: { balance } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke behandle uttak") };
  }
}

export async function payoutTimeBank(input: { userId: string; hours: number; reason: string }) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    if (input.hours <= 0) return { success: false as const, error: "Timer må være over 0" };
    if (!input.reason.trim()) return { success: false as const, error: "Årsak er påkrevd" };
    const current = await lastApprovedBalance(ctx.tenantId, input.userId);
    if (input.hours > current) {
      return { success: false as const, error: "Ikke nok timebank" };
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { timeBankMaxBalance: true, timeBankMinBalance: true },
    });
    const hours = applyTimeBankFactor(input.hours, 1);
    const balance = nextTimeBankBalance(current, "PAYOUT", hours);
    const check = assertTimeBankBalance(balance, {
      min: tenant?.timeBankMinBalance,
      max: tenant?.timeBankMaxBalance,
    });
    if (!check.ok) {
      return { success: false as const, error: check.error ?? "Ugyldig timebanksaldo" };
    }
    await prisma.timeBankLedger.create({
      data: {
        tenantId: ctx.tenantId,
        userId: input.userId,
        kind: "PAYOUT",
        status: "APPROVED",
        hours,
        balanceAfter: balance,
        reason: input.reason.trim(),
        correctedById: ctx.userId,
      },
    });
    revalidateBank();
    return { success: true as const, data: { balance } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke utbetale") };
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
    const current = await lastApprovedBalance(ctx.tenantId, input.userId);
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { timeBankMaxBalance: true, timeBankMinBalance: true },
    });
    const kind = input.kind ?? "CORRECTION";
    const balance = nextTimeBankBalance(current, kind, input.hours);
    const check = assertTimeBankBalance(balance, {
      min: tenant?.timeBankMinBalance,
      max: tenant?.timeBankMaxBalance,
    });
    if (!check.ok) {
      return { success: false as const, error: check.error ?? "Ugyldig timebanksaldo" };
    }
    await prisma.timeBankLedger.create({
      data: {
        tenantId: ctx.tenantId,
        userId: input.userId,
        kind,
        status: "APPROVED",
        hours: input.hours,
        balanceAfter: balance,
        reason: input.reason.trim(),
        correctedById: ctx.userId,
      },
    });
    revalidateBank();
    return { success: true as const, data: { balance } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke korrigere") };
  }
}
