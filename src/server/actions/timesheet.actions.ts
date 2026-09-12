"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext, requirePermission } from "@/lib/server-authorization";
import { enqueueAccountingJob } from "@/lib/accounting/sync";
import { activityIdForTimeType } from "@/lib/accounting/timesheet";
import { canEnqueueTimesheetSync, isTimesheetEditableByEmployee } from "@/lib/time/approval";
import { splitDayHours, type DayRules } from "@/lib/time/split-day";
import { assignmentCoversDate } from "@/lib/time/resource-overlap";
import { applyTimeBankFactor, nextTimeBankBalance, pickTimeBankFactor } from "@/lib/time/timebank";
import { filterProductsByAndQuery } from "@/lib/time/product-search";
import type { TimeEntryType } from "@prisma/client";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function revalidateTimesheet() {
  revalidatePath("/ansatt/timeregistrering");
  revalidatePath("/ansatt/jobber");
  revalidatePath("/dashboard/time-registration");
}

async function loadDayRules(tenantId: string): Promise<DayRules & { weeklyHoursNorm: number }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      dayStartHour: true,
      dayEndHour: true,
      overtime50CapHours: true,
      saturdayOt50UntilHour: true,
      lunchBreakMinutes: true,
      weeklyHoursNorm: true,
    },
  });
  return {
    dayStartHour: tenant?.dayStartHour ?? 7,
    dayEndHour: tenant?.dayEndHour ?? 15.5,
    overtime50CapHours: tenant?.overtime50CapHours ?? 4.5,
    saturdayOt50UntilHour: tenant?.saturdayOt50UntilHour ?? 12,
    lunchMinutes: tenant?.lunchBreakMinutes ?? 30,
    weeklyHoursNorm: tenant?.weeklyHoursNorm ?? 37.5,
  };
}

export async function getDayTimesheetContext(dateIso: string, projectId?: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { success: false as const, error: "Ikke autentisert" };

  const date = new Date(`${dateIso.slice(0, 10)}T12:00:00`);
  const [projects, entries, usage, products, tenantSettings, salaryTypes, assignments] =
    await Promise.all([
      prisma.project.findMany({
        where: { tenantId: ctx.tenantId, status: { in: ["ACTIVE", "PLANNING"] } },
        select: {
          id: true,
          name: true,
          parentId: true,
          clientName: true,
          jobKind: true,
          status: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.timeEntry.findMany({
        where: { tenantId: ctx.tenantId, userId: ctx.userId, date },
        include: { project: { select: { name: true, parentId: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.projectUsageLine.findMany({
        where: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          createdAt: {
            gte: new Date(`${dateIso.slice(0, 10)}T00:00:00`),
            lt: new Date(new Date(`${dateIso.slice(0, 10)}T00:00:00`).getTime() + 86400000),
          },
        },
      }),
      prisma.accountingProduct.findMany({
        where: { tenantId: ctx.tenantId, isInactive: false },
        orderBy: { name: "asc" },
        take: 400,
      }),
      prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: {
          tripletexActivityNormalId: true,
          tripletexActivityOt50Id: true,
          tripletexActivityOt100Id: true,
          timeCommentPresets: true,
          lunchBreakMinutes: true,
          dayStartHour: true,
          dayEndHour: true,
          accountingProvider: true,
        },
      }),
      prisma.accountingSalaryType.findMany({
        where: { tenantId: ctx.tenantId, isInactive: false },
        orderBy: { name: "asc" },
      }),
      prisma.resourceAssignment.findMany({
        where: { tenantId: ctx.tenantId, userId: ctx.userId },
        include: { project: { select: { id: true, name: true } } },
      }),
    ]);

  const suggested = assignments.find((a) => assignmentCoversDate(a, date));
  const provider = await import("@/lib/accounting/factory").then((m) =>
    m.getAccountingProvider(ctx.tenantId)
  );
  const liveActivities = provider ? await provider.listActivities().catch(() => []) : [];

  return {
    success: true as const,
    data: JSON.parse(
      JSON.stringify({
        date: dateIso.slice(0, 10),
        projects,
        entries,
        usage,
        products,
        salaryTypes,
        activities: liveActivities,
        suggestedProjectId: projectId || suggested?.projectId || null,
        commentPresets: Array.isArray(tenantSettings?.timeCommentPresets)
          ? tenantSettings?.timeCommentPresets
          : [],
        lunchMinutes: tenantSettings?.lunchBreakMinutes ?? 30,
        dayStartHour: tenantSettings?.dayStartHour ?? 7,
        dayEndHour: tenantSettings?.dayEndHour ?? 15.5,
        canApprove: ctx.permissions.canApproveTimesheet,
      })
    ),
  };
}

export async function searchTimesheetProducts(query: string) {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  const products = await prisma.accountingProduct.findMany({
    where: { tenantId: ctx.tenantId, isInactive: false },
    take: 400,
  });
  return filterProductsByAndQuery(products, query).slice(0, 40);
}

export async function submitDayTimesheet(input: {
  date: string;
  clockFrom: string;
  clockTo: string;
  lunchMinutes?: number;
  projectId: string;
  comment: string;
  billingActivityId?: string | null;
  salaryTypeId?: string | null;
  usageLines?: Array<{
    kind: "PRODUCT" | "MACHINE" | "KM";
    productExternalId: string;
    quantity: number;
    comment?: string;
  }>;
}) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false as const, error: "Ikke autentisert" };
    if (!ctx.permissions.canAccessTimeRegistration) {
      return { success: false as const, error: "Ingen tilgang til timeregistrering" };
    }

    const comment = input.comment.trim();
    if (comment.length < 2) {
      return { success: false as const, error: "Kommentar er påkrevd" };
    }

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, tenantId: ctx.tenantId },
    });
    if (!project || (project.status !== "ACTIVE" && project.status !== "PLANNING")) {
      return { success: false as const, error: "Prosjekt ikke funnet" };
    }

    const date = new Date(`${input.date.slice(0, 10)}T12:00:00`);
    const rules = await loadDayRules(ctx.tenantId);
    const lunchMinutes = input.lunchMinutes ?? rules.lunchMinutes;
    const segments = splitDayHours({
      date,
      clockFrom: input.clockFrom,
      clockTo: input.clockTo,
      lunchMinutes,
      rules,
    });
    if (segments.length === 0) {
      return { success: false as const, error: "Ugyldig fra–til" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        tripletexActivityNormalId: true,
        tripletexActivityOt50Id: true,
        tripletexActivityOt100Id: true,
        tripletexProductKmId: true,
        defaultKmRate: true,
      },
    });

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const segment of segments) {
        const mapped = activityIdForTimeType(segment.timeType, {
          normal: tenant?.tripletexActivityNormalId,
          ot50: tenant?.tripletexActivityOt50Id,
          ot100: tenant?.tripletexActivityOt100Id,
        });
        const row = await tx.timeEntry.create({
          data: {
            tenantId: ctx.tenantId,
            projectId: input.projectId,
            userId: ctx.userId,
            date,
            hours: segment.hours,
            timeType: segment.timeType as TimeEntryType,
            clockFrom: input.clockFrom,
            clockTo: input.clockTo,
            lunchMinutes,
            comment,
            billingActivityId: input.billingActivityId || mapped,
            salaryTypeId: input.salaryTypeId || null,
            approvalStatus: "SUBMITTED",
            syncStatus: "IDLE",
          },
        });
        rows.push(row);
      }

      for (const line of input.usageLines ?? []) {
        if (line.quantity <= 0) continue;
        const productId =
          line.kind === "KM" && tenant?.tripletexProductKmId
            ? tenant.tripletexProductKmId
            : line.productExternalId;
        const product = await tx.accountingProduct.findUnique({
          where: { tenantId_externalId: { tenantId: ctx.tenantId, externalId: productId } },
        });
        await tx.projectUsageLine.create({
          data: {
            tenantId: ctx.tenantId,
            projectId: input.projectId,
            userId: ctx.userId,
            kind: line.kind,
            productExternalId: productId,
            productName: product?.name ?? (line.kind === "KM" ? "Km-tillegg" : "Produkt"),
            quantity: line.quantity,
            unitPrice: product?.priceExclVat ?? (line.kind === "KM" ? tenant?.defaultKmRate : null),
            comment: line.comment?.trim() || comment,
            syncStatus: "IDLE",
          },
        });
      }
      return rows;
    });

    revalidateTimesheet();
    return { success: true as const, data: created };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre dagen") };
  }
}

export async function updateOwnTimesheetEntry(
  id: string,
  input: { clockFrom?: string; clockTo?: string; comment?: string; projectId?: string }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false as const, error: "Ikke autentisert" };
    const entry = await prisma.timeEntry.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!entry) return { success: false as const, error: "Ikke funnet" };
    if (entry.userId !== ctx.userId) {
      return { success: false as const, error: "Du kan kun endre egne linjer" };
    }
    if (!isTimesheetEditableByEmployee(entry.approvalStatus)) {
      return { success: false as const, error: "Godkjente timer kan ikke endres av ansatt" };
    }
    if (input.comment !== undefined && input.comment.trim().length < 2) {
      return { success: false as const, error: "Kommentar er påkrevd" };
    }

    await prisma.timeEntry.update({
      where: { id },
      data: {
        comment: input.comment?.trim(),
        projectId: input.projectId,
        clockFrom: input.clockFrom,
        clockTo: input.clockTo,
        approvalStatus: "SUBMITTED",
      },
    });
    revalidateTimesheet();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke oppdatere") };
  }
}

export async function getWeekTimesheetSummary(weekStartIso: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { success: false as const, error: "Ikke autentisert" };
  const from = new Date(`${weekStartIso.slice(0, 10)}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  const entries = await prisma.timeEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      date: { gte: from, lte: to },
    },
    include: { project: { select: { name: true } } },
    orderBy: { date: "asc" },
  });
  const hours = entries.reduce((s, e) => s + e.hours, 0);
  return { success: true as const, data: { entries, hours } };
}

export async function listTimesheetApprovalQueue(status?: "SUBMITTED" | "APPROVED" | "SYNC_ERROR") {
  const ctx = await requirePermission("canApproveTimesheet");
  const entries = await prisma.timeEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      approvalStatus: status ?? { in: ["SUBMITTED", "SYNC_ERROR"] },
    },
    include: {
      user: { select: { name: true, email: true } },
      project: { select: { name: true, parentId: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "asc" }],
    take: 200,
  });
  const [activities, salaryTypes] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        tripletexActivityNormalId: true,
        tripletexActivityOt50Id: true,
        tripletexActivityOt100Id: true,
      },
    }),
    prisma.accountingSalaryType.findMany({
      where: { tenantId: ctx.tenantId, isInactive: false },
      orderBy: { name: "asc" },
    }),
  ]);
  return JSON.parse(JSON.stringify({ entries, mapping: activities, salaryTypes }));
}

export async function updateTimesheetStreams(
  id: string,
  input: { billingActivityId?: string | null; salaryTypeId?: string | null }
) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    const entry = await prisma.timeEntry.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!entry) return { success: false as const, error: "Ikke funnet" };
    await prisma.timeEntry.update({
      where: { id },
      data: {
        billingActivityId:
          input.billingActivityId !== undefined ? input.billingActivityId : entry.billingActivityId,
        salaryTypeId: input.salaryTypeId !== undefined ? input.salaryTypeId : entry.salaryTypeId,
        editedById: ctx.userId,
        editedAt: new Date(),
      },
    });
    revalidateTimesheet();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke oppdatere spor") };
  }
}

async function earnTimeBankForEntry(tenantId: string, userId: string, entryId: string, hours: number, salaryTypeId: string | null, timeType: string) {
  const rules = await prisma.timeBankRule.findMany({ where: { tenantId } });
  if (rules.length === 0) return;
  const factor = pickTimeBankFactor(rules, { salaryTypeId, timeType });
  const earned = applyTimeBankFactor(hours, factor);
  if (earned <= 0) return;
  const last = await prisma.timeBankLedger.findFirst({
    where: { tenantId, userId },
    orderBy: { createdAt: "desc" },
  });
  const balance = nextTimeBankBalance(last?.balanceAfter ?? 0, "EARN", earned);
  await prisma.timeBankLedger.create({
    data: {
      tenantId,
      userId,
      kind: "EARN",
      hours: earned,
      balanceAfter: balance,
      timeEntryId: entryId,
      reason: `Opptjening factor ${factor}`,
    },
  });
}

export async function approveTimesheetEntries(ids: string[]) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    const entries = await prisma.timeEntry.findMany({
      where: { tenantId: ctx.tenantId, id: { in: ids } },
    });
    for (const entry of entries) {
      if (entry.approvalStatus !== "SUBMITTED" && entry.approvalStatus !== "SYNC_ERROR") continue;
      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          approvalStatus: "APPROVED",
          approvedById: ctx.userId,
          approvedAt: new Date(),
          syncStatus: "PENDING",
        },
      });
      await earnTimeBankForEntry(
        ctx.tenantId,
        entry.userId,
        entry.id,
        entry.hours,
        entry.salaryTypeId,
        entry.timeType
      );
      if (canEnqueueTimesheetSync("APPROVED")) {
        await enqueueAccountingJob({
          tenantId: ctx.tenantId,
          entityType: "TimeEntry",
          entityId: entry.id,
          action: "UPSERT_TIME",
          payload: {},
        });
      }
    }
    revalidateTimesheet();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke godkjenne") };
  }
}

export async function rejectTimesheetEntry(id: string, reason: string) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    if (!reason.trim()) return { success: false as const, error: "Begrunnelse er påkrevd" };
    await prisma.timeEntry.updateMany({
      where: { id, tenantId: ctx.tenantId },
      data: {
        approvalStatus: "REJECTED",
        comment: reason.trim(),
        approvedById: ctx.userId,
        approvedAt: new Date(),
      },
    });
    revalidateTimesheet();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke avvise") };
  }
}

export async function retryTimesheetSync(id: string) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    const entry = await prisma.timeEntry.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!entry) return { success: false as const, error: "Ikke funnet" };
    await prisma.timeEntry.update({
      where: { id },
      data: { approvalStatus: "APPROVED", syncStatus: "PENDING" },
    });
    await enqueueAccountingJob({
      tenantId: ctx.tenantId,
      entityType: "TimeEntry",
      entityId: id,
      action: "UPSERT_TIME",
      payload: {},
    });
    revalidateTimesheet();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke prøve igjen") };
  }
}

export async function listAccountingSyncLog() {
  const ctx = await requirePermission("canApproveTimesheet");
  const jobs = await prisma.accountingSyncJob.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return JSON.parse(JSON.stringify(jobs));
}

export async function retryAccountingSyncJob(jobId: string) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    const job = await prisma.accountingSyncJob.findFirst({
      where: { id: jobId, tenantId: ctx.tenantId },
    });
    if (!job) return { success: false as const, error: "Jobb ikke funnet" };
    await prisma.accountingSyncJob.update({
      where: { id: jobId },
      data: { status: "PENDING", lastError: null },
    });
    await enqueueAccountingJob({
      tenantId: ctx.tenantId,
      entityType: job.entityType,
      entityId: job.entityId,
      action: job.action as "UPSERT_TIME",
      payload: (job.payload as Record<string, unknown>) ?? {},
    });
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke kjøre på nytt") };
  }
}
