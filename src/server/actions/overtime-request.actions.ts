"use server";

/**
 * Overtidssøknad, AML § 10-6.
 * Søknaden dokumenterer at overtiden er avtalt. Den er ikke koblet til
 * TimeEntry og skal ikke hindre registrering eller godkjenning av timer.
 */

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { canViewEmployee, listVisibleEmployeeIds } from "@/server/lib/leader-employees";
import { createNotification } from "@/server/actions/notification.actions";
import { OVERTIME_TIME_TYPES, assessOvertimeLimits } from "@/lib/time/overtime-limits";

const CreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Velg en dato"),
  hours: z.number().gt(0, "Timer må være mer enn 0").max(24, "Maks 24 timer på én søknad"),
  reason: z.string().trim().min(3, "Skriv kort hva behovet er").max(500),
});

const DecideSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500).optional(),
});

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) return error.issues.map((issue) => issue.message).join(". ");
  if (error instanceof Error) return error.message;
  return fallback;
}

function todayInOslo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" }).format(new Date());
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function revalidateOvertime() {
  revalidatePath("/dashboard/time-registration");
  revalidatePath("/dashboard/hr");
  revalidatePath("/ansatt/timeregistrering");
}

async function notifyQuietly(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch {
    // Varsel skal ikke gjøre at søknaden feiler.
  }
}

export async function listOvertimeRequests() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canAccessTimeRegistration) {
    return { success: false as const, error: "Du har ikke tilgang til timeregistrering" };
  }

  const canApprove = auth.permissions.canApproveAbsence;
  const asOf = todayInOslo();
  const yearStart = new Date(`${asOf}T00:00:00.000Z`);
  yearStart.setUTCDate(yearStart.getUTCDate() - (52 * 7 - 1));

  const visibleIds = canApprove
    ? await listVisibleEmployeeIds({
        tenantId: auth.tenantId,
        userId: auth.userId,
        role: auth.role,
        departmentId: auth.departmentId,
      })
    : [auth.userId];

  const scope =
    visibleIds === null
      ? { tenantId: auth.tenantId }
      : { tenantId: auth.tenantId, userId: { in: visibleIds.length > 0 ? visibleIds : ["__none__"] } };

  const [mine, pending, entries] = await Promise.all([
    prisma.overtimeRequest.findMany({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    canApprove
      ? prisma.overtimeRequest.findMany({
          where: { ...scope, status: "PENDING" },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { date: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    prisma.timeEntry.findMany({
      where: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        date: { gte: yearStart },
        timeType: { in: [...OVERTIME_TIME_TYPES] },
      },
      select: { date: true, hours: true },
    }),
  ]);

  const limits = assessOvertimeLimits(
    entries.map((entry) => ({ date: dateOnly(entry.date), hours: entry.hours })),
    asOf,
  );

  return {
    success: true as const,
    data: {
      canApprove,
      limits,
      mine: mine.map(serializeRequest),
      pending: pending.map((row) => ({
        ...serializeRequest(row),
        userName: row.user.name || row.user.email,
      })),
    },
  };
}

export async function createOvertimeRequest(input: { date: string; hours: number; reason: string }) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canAccessTimeRegistration) {
      throw new Error("Du har ikke tilgang til timeregistrering");
    }
    const data = CreateSchema.parse(input);
    const request = await prisma.overtimeRequest.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        date: new Date(`${data.date}T00:00:00.000Z`),
        hours: data.hours,
        reason: data.reason,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true },
    });
    await notifyApprovers({
      tenantId: auth.tenantId,
      employeeUserId: auth.userId,
      employeeName: user?.name || user?.email || "En ansatt",
      date: data.date,
      hours: data.hours,
    });

    revalidateOvertime();
    return { success: true as const, data: serializeRequest(request) };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke sende søknaden") };
  }
}

export async function decideOvertimeRequest(input: {
  id: string;
  decision: "APPROVED" | "REJECTED";
  note?: string;
}) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canApproveAbsence) {
      throw new Error("Du har ikke tilgang til å behandle overtidsøknader");
    }
    const data = DecideSchema.parse(input);
    const request = await prisma.overtimeRequest.findFirst({
      where: { id: data.id, tenantId: auth.tenantId },
    });
    if (!request) throw new Error("Søknaden finnes ikke");
    if (request.status !== "PENDING") throw new Error("Søknaden er allerede behandlet");

    const allowed = await canViewEmployee({
      tenantId: auth.tenantId,
      viewerId: auth.userId,
      role: auth.role,
      employeeId: request.userId,
      departmentId: auth.departmentId,
    });
    if (!allowed) throw new Error("Du kan ikke behandle denne søknaden");

    const updated = await prisma.overtimeRequest.update({
      where: { id: request.id },
      data: {
        status: data.decision,
        decidedById: auth.userId,
        decidedAt: new Date(),
        decisionNote: data.note || null,
      },
    });

    await notifyQuietly({
      tenantId: auth.tenantId,
      userId: request.userId,
      type: "OVERTIME_DECIDED",
      title: data.decision === "APPROVED" ? "Overtid godkjent" : "Overtid avvist",
      message:
        data.decision === "APPROVED"
          ? `Overtid ${dateOnly(request.date)} er godkjent. Timer føres som vanlig.`
          : `Overtid ${dateOnly(request.date)} er avvist. Allerede førte timer står.`,
      link: "/dashboard/time-registration?tab=overtime",
    });

    revalidateOvertime();
    return { success: true as const, data: serializeRequest(updated) };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke behandle søknaden") };
  }
}

export async function cancelOvertimeRequest(input: { id: string }) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canAccessTimeRegistration) {
      throw new Error("Du har ikke tilgang til timeregistrering");
    }
    const request = await prisma.overtimeRequest.findFirst({
      where: { id: input.id, tenantId: auth.tenantId, userId: auth.userId },
    });
    if (!request) throw new Error("Søknaden finnes ikke");
    if (request.status !== "PENDING" && request.status !== "APPROVED") {
      throw new Error("Søknaden kan ikke trekkes");
    }

    const updated = await prisma.overtimeRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED" },
    });
    revalidateOvertime();
    return { success: true as const, data: serializeRequest(updated) };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke trekke søknaden") };
  }
}

async function notifyApprovers(input: {
  tenantId: string;
  employeeUserId: string;
  employeeName: string;
  date: string;
  hours: number;
}) {
  const recipients = new Set<string>();
  const membership = await prisma.userTenant.findFirst({
    where: { userId: input.employeeUserId, tenantId: input.tenantId },
    select: { managerId: true },
  });
  if (membership?.managerId) recipients.add(membership.managerId);

  const staff = await prisma.userTenant.findMany({
    where: { tenantId: input.tenantId, role: { in: ["ADMIN", "HMS", "LEDER", "HR"] } },
    select: { userId: true },
  });
  for (const row of staff) recipients.add(row.userId);
  recipients.delete(input.employeeUserId);

  await Promise.all(
    [...recipients].map((userId) =>
      notifyQuietly({
        tenantId: input.tenantId,
        userId,
        type: "OVERTIME_REQUESTED",
        title: "Overtidssøknad",
        message: `${input.employeeName} søker ${input.hours} t overtid ${input.date}`,
        link: "/dashboard/time-registration?tab=overtime",
      }),
    ),
  );
}

function serializeRequest(row: {
  id: string;
  date: Date;
  hours: number;
  reason: string;
  status: string;
  decisionNote: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    date: dateOnly(row.date),
    hours: row.hours,
    reason: row.reason,
    status: row.status,
    decisionNote: row.decisionNote,
    createdAt: row.createdAt.toISOString(),
  };
}
