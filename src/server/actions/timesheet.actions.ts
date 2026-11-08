"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext, requirePermission } from "@/lib/server-authorization";
import { enqueueAccountingJob, ensureDefaultKmProducts, ensureDefaultSalaryTypes, ensureProjectSyncedToAccounting, refreshAccountingProjectsIfStale, requeueAccountingJob } from "@/lib/accounting/sync";
import { isAccountingEnabled } from "@/lib/accounting/factory";
import {
  canRetrySyncJob,
  formatSyncSubject,
  humanizeAccountingSyncError,
  syncLogStatusRank,
} from "@/lib/accounting/sync-copy";
import { activityIdForTimeType } from "@/lib/accounting/timesheet";
import { canEnqueueTimesheetSync, isTimesheetEditableByEmployee } from "@/lib/time/approval";
import { clocksOverlap, splitDayHours, type DayRules } from "@/lib/time/split-day";
import { assignmentCoversDate } from "@/lib/time/resource-overlap";
import { applyTimeBankFactor, assertTimeBankBalance, nextTimeBankBalance, pickTimeBankFactor } from "@/lib/time/timebank";
import { filterProductsByAndQuery, groupIdsWithDescendants, tokenizeProductQuery, uniqueProductCategories } from "@/lib/time/product-search";
import { buildKmRegistration, type CarKind } from "@/lib/time/km-product";
import type { ProjectUsageKind, TimeEntryType } from "@prisma/client";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function carKindFromLine(line: { carKind?: CarKind; isPrivateCar?: boolean }): CarKind {
  if (line.carKind === "PRIVATE" || line.carKind === "COMPANY") return line.carKind;
  return line.isPrivateCar ? "PRIVATE" : "COMPANY";
}

async function createDayKmLine(input: {
  db: typeof prisma;
  tenantId: string;
  projectId: string;
  userId: string;
  date: Date;
  kilometers: number;
  carKind: CarKind;
  comment: string | null;
  mapping: { taxable: string | null; nonTaxable: string | null };
  defaultKmRate: number | null;
  kmAllowanceTaxable: boolean;
  syncStatus: "IDLE" | "PENDING";
  fromAddress?: string | null;
  toAddress?: string | null;
}) {
  const built = buildKmRegistration({
    carKind: input.carKind,
    tenantKmAllowanceTaxable: input.kmAllowanceTaxable,
    taxableProductId: input.mapping.taxable,
    nonTaxableProductId: input.mapping.nonTaxable,
    defaultKmRate: input.defaultKmRate,
  });
  const product =
    built.productExternalId !== "km"
      ? await input.db.accountingProduct.findUnique({
          where: {
            tenantId_externalId: { tenantId: input.tenantId, externalId: built.productExternalId },
          },
        })
      : null;
  const line = await input.db.projectUsageLine.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      userId: input.userId,
      date: input.date,
      kind: "KM",
      productExternalId: built.productExternalId,
      productName: product?.name ?? built.productName,
      quantity: input.kilometers,
      unitPrice: product?.priceExclVat ?? built.unitPrice,
      comment: input.comment,
      isPrivateCar: built.isPrivateCar,
      kmTaxable: built.kmTaxable,
      fromAddress: input.fromAddress?.trim() || null,
      toAddress: input.toAddress?.trim() || null,
      syncStatus: input.syncStatus,
    },
  });
  if (built.createMileage) {
    const rate = product?.priceExclVat ?? input.defaultKmRate;
    await input.db.mileageEntry.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        userId: input.userId,
        date: input.date,
        kilometers: input.kilometers,
        ratePerKm: rate,
        amount: (rate ?? 0) * input.kilometers,
        comment: input.comment,
        syncStatus: input.syncStatus,
      },
    });
  }
  return line;
}

async function enqueueUsageLinesForDay(input: {
  tenantId: string;
  userId: string;
  date: Date;
  projectId: string;
}) {
  const lines = await prisma.projectUsageLine.findMany({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
      projectId: input.projectId,
      date: input.date,
      syncStatus: { in: ["IDLE", "ERROR"] },
    },
  });
  for (const line of lines) {
    await prisma.projectUsageLine.update({
      where: { id: line.id },
      data: { syncStatus: "PENDING" },
    });
    await enqueueAccountingJob({
      tenantId: input.tenantId,
      entityType: "ProjectUsageLine",
      entityId: line.id,
      action: "UPSERT_LINE",
      payload: {},
    });
  }
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
  const [projects, entries, usage, products, tenantSettings, salaryTypes, assignments, absences, customers] =
    await Promise.all([
      prisma.project.findMany({
        // Kun aktive prosjekter kan stemples på (avsluttet i Tripletex = COMPLETED).
        where: { tenantId: ctx.tenantId, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          code: true,
          parentId: true,
          parent: { select: { name: true } },
          clientName: true,
          jobKind: true,
          status: true,
          externalProjectId: true,
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
          date,
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
          absenceProjectId: true,
          absencePayrollTypes: true,
          tripletexTemplateProjectExternalId: true,
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
      prisma.absence.findMany({
        where: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { lte: date },
          endDate: { gte: date },
        },
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          percentage: true,
          status: true,
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.accountingCustomer.findMany({
        where: { tenantId: ctx.tenantId, isInactive: false },
        select: { externalId: true, name: true, organizationNumber: true },
        orderBy: { name: "asc" },
        take: 80,
      }),
    ]);

  const suggested = assignments.find((a) => assignmentCoversDate(a, date));
  const templateId = tenantSettings?.tripletexTemplateProjectExternalId;
  const stampable = templateId
    ? projects.filter((project) => project.externalProjectId !== templateId)
    : projects;
  const activities = await prisma.accountingActivity.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
  });
  const productGroups = await prisma.accountingProductGroup.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
  });

  return {
    success: true as const,
    data: JSON.parse(
      JSON.stringify({
        date: dateIso.slice(0, 10),
        projects: stampable.map(({ parent, ...p }) => ({ ...p, parentName: parent?.name ?? null })),
        projectSyncError: null,
        entries,
        usage,
        products,
        salaryTypes: ctx.permissions.canApproveTimesheet ? salaryTypes : [],
        activities,
        productGroups,
        suggestedProjectId: projectId || suggested?.projectId || null,
        assignedProjects: assignments
          .filter((a) => assignmentCoversDate(a, date))
          .map((a) => ({
            id: a.project.id,
            name: a.project.name,
            startDate: a.startDate,
            endDate: a.endDate,
            plannedHours: a.plannedHours,
          })),
        commentPresets: Array.isArray(tenantSettings?.timeCommentPresets)
          ? tenantSettings?.timeCommentPresets
          : [],
        lunchMinutes: tenantSettings?.lunchBreakMinutes ?? 30,
        dayStartHour: tenantSettings?.dayStartHour ?? 7,
        dayEndHour: tenantSettings?.dayEndHour ?? 15.5,
        canApprove: ctx.permissions.canApproveTimesheet,
        canCreateAbsence: ctx.permissions.canCreateAbsence,
        canCreateFieldProject: ctx.permissions.canCreateFieldProject,
        accountingConnected: isAccountingEnabled(tenantSettings?.accountingProvider),
        customers,
        absences,
        absenceProjectId: tenantSettings?.absenceProjectId ?? null,
        absencePayrollTypes: tenantSettings?.absencePayrollTypes ?? null,
        productCategories: uniqueProductCategories(products),
      })
    ),
  };
}

export async function searchTimesheetProducts(
  query: string,
  options?: { groupExternalId?: string | null; kind?: "PRODUCT" | "MACHINE" }
) {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  const words = tokenizeProductQuery(query).slice(0, 6);
  const groupId = options?.groupExternalId || null;
  const groupIds = groupId
    ? groupIdsWithDescendants(
        await prisma.accountingProductGroup.findMany({
          where: { tenantId: ctx.tenantId },
          select: { externalId: true, parentExternalId: true },
        }),
        groupId
      )
    : null;
  const memberIds = groupIds
    ? (
        await prisma.accountingProductGroupMember.findMany({
          where: { tenantId: ctx.tenantId, groupExternalId: { in: groupIds } },
          select: { productExternalId: true },
        })
      ).map((row) => row.productExternalId)
    : null;
  const products = await prisma.accountingProduct.findMany({
    where: {
      tenantId: ctx.tenantId,
      isInactive: false,
      ...(memberIds ? { externalId: { in: memberIds.length > 0 ? memberIds : ["__none__"] } } : {}),
      AND: words.map((word) => ({
        OR: [
          { name: { contains: word } },
          { number: { contains: word } },
        ],
      })),
    },
    orderBy: [{ number: "asc" }, { name: "asc" }],
    take: 80,
  });
  const { isMachineProduct } = await import("@/lib/time/product-search");
  const filtered = products.filter((product) =>
    options?.kind === "MACHINE" ? isMachineProduct(product) : options?.kind === "PRODUCT" ? !isMachineProduct(product) : true
  );
  return filterProductsByAndQuery(filtered, query).slice(0, 40);
}

export async function searchGeonorgeAddresses(query: string) {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL("https://ws.geonorge.no/adresser/v1/sok");
  url.searchParams.set("sok", q);
  url.searchParams.set("treffPerSide", "6");
  url.searchParams.set("asciiKompatibel", "true");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    adresser?: Array<{
      adressetekst?: string;
      postnummer?: string;
      poststed?: string;
      representasjonspunkt?: { lat?: number; lon?: number };
    }>;
  };
  return (data.adresser ?? [])
    .map((row) => ({
      label: [row.adressetekst, row.postnummer, row.poststed].filter(Boolean).join(", "),
      lat: row.representasjonspunkt?.lat ?? 0,
      lon: row.representasjonspunkt?.lon ?? 0,
    }))
    .filter((row) => row.label && row.lat && row.lon);
}

/** Søk i kunderegisteret (Tripletex-cache) på navn eller org.nr. */
export async function searchTimesheetCustomers(query: string) {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  const words = tokenizeProductQuery(query).slice(0, 5);
  return prisma.accountingCustomer.findMany({
    where: {
      tenantId: ctx.tenantId,
      isInactive: false,
      AND: words.map((word) => ({
        OR: [{ name: { contains: word } }, { organizationNumber: { contains: word.replace(/\s/g, "") } }],
      })),
    },
    select: { externalId: true, name: true, organizationNumber: true },
    orderBy: { name: "asc" },
    take: 30,
  });
}

/** «Oppdater fra Tripletex»-knappen: tving ny prosjektsynk. */
export async function syncTimesheetProjectsNow() {
  const ctx = await getAuthContext();
  if (!ctx) return { success: false as const, error: "Ikke autentisert" };
  if (!ctx.permissions.canAccessTimeRegistration) {
    return { success: false as const, error: "Ingen tilgang til timeregistrering" };
  }
  try {
    await refreshAccountingProjectsIfStale(ctx.tenantId, 0, { force: true });
    return { success: true as const };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: formatActionError(error, "Kunne ikke hente prosjekter fra Tripletex"),
    };
  }
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
    isPrivateCar?: boolean;
    kmTaxable?: boolean;
    carKind?: CarKind;
    fromAddress?: string;
    toAddress?: string;
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
    if (!project) {
      return { success: false as const, error: "Prosjekt ikke funnet" };
    }
    if (project.status !== "ACTIVE") {
      return {
        success: false as const,
        error: "Prosjektet er ikke aktivt (avsluttet eller satt på vent) og kan ikke føres timer på",
      };
    }

    const date = new Date(`${input.date.slice(0, 10)}T12:00:00`);
    const rules = await loadDayRules(ctx.tenantId);
    const lunchMinutes = input.lunchMinutes ?? rules.lunchMinutes;
    // Timer allerede ført i dag (andre prosjekt) teller med når overtid beregnes.
    const prior = await prisma.timeEntry.aggregate({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        date,
        approvalStatus: { not: "REJECTED" },
      },
      _sum: { hours: true },
    });
    const segments = splitDayHours({
      date,
      clockFrom: input.clockFrom,
      clockTo: input.clockTo,
      lunchMinutes,
      rules,
      priorNetHours: Number(prior._sum.hours ?? 0),
    });
    if (segments.length === 0) {
      return { success: false as const, error: "Ugyldig fra–til" };
    }
    const sameDay = await prisma.timeEntry.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        date,
        approvalStatus: { not: "REJECTED" },
      },
      select: { clockFrom: true, clockTo: true },
    });
    const overlaps = sameDay.some(
      (row) => row.clockFrom && row.clockTo && clocksOverlap(input.clockFrom, input.clockTo, row.clockFrom, row.clockTo)
    );
    if (overlaps) {
      return { success: false as const, error: "Tiden overlapper en registrering samme dag" };
    }

    const kmLine = (input.usageLines ?? []).find((line) => line.kind === "KM" && line.quantity > 0);
    if (kmLine && (!kmLine.fromAddress?.trim() || !kmLine.toAddress?.trim())) {
      return { success: false as const, error: "Kjøring krever fra- og til-adresse" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        tripletexActivityNormalId: true,
        tripletexActivityOt50Id: true,
        tripletexActivityOt100Id: true,
        tripletexProductKmId: true,
        tripletexProductKmNonTaxableId: true,
        defaultKmRate: true,
        kmAllowanceTaxable: true,
        accountingProvider: true,
      },
    });

    const kmMapping = await ensureDefaultKmProducts(ctx.tenantId);
    const salaryMapping = await ensureDefaultSalaryTypes(ctx.tenantId);

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
            billingActivityId: mapped,
            salaryTypeId: activityIdForTimeType(segment.timeType, salaryMapping),
            approvalStatus: "SUBMITTED",
            syncStatus: "IDLE",
          },
        });
        rows.push(row);
      }

      for (const line of input.usageLines ?? []) {
        if (line.quantity <= 0) continue;
        if (line.kind === "KM") {
          await createDayKmLine({
            db: tx as typeof prisma,
            tenantId: ctx.tenantId,
            projectId: input.projectId,
            userId: ctx.userId,
            date,
            kilometers: line.quantity,
            carKind: carKindFromLine(line),
            comment: line.comment?.trim() || comment,
            mapping: {
              taxable: kmMapping.taxable ?? tenant?.tripletexProductKmId ?? null,
              nonTaxable: kmMapping.nonTaxable ?? tenant?.tripletexProductKmNonTaxableId ?? null,
            },
            defaultKmRate: tenant?.defaultKmRate ?? null,
            kmAllowanceTaxable: Boolean(tenant?.kmAllowanceTaxable),
            syncStatus: "IDLE",
            fromAddress: line.fromAddress,
            toAddress: line.toAddress,
          });
          continue;
        }
        const product = await tx.accountingProduct.findUnique({
          where: { tenantId_externalId: { tenantId: ctx.tenantId, externalId: line.productExternalId } },
        });
        await tx.projectUsageLine.create({
          data: {
            tenantId: ctx.tenantId,
            projectId: input.projectId,
            userId: ctx.userId,
            date,
            kind: line.kind,
            productExternalId: line.productExternalId,
            productName: product?.name ?? "Produkt",
            quantity: line.quantity,
            unitPrice: product?.priceExclVat ?? null,
            comment: line.comment?.trim() || comment,
            syncStatus: "IDLE",
          },
        });
      }
      return rows;
    });

    if (isAccountingEnabled(tenant?.accountingProvider) && !project.externalProjectId) {
      await enqueueAccountingJob({
        tenantId: ctx.tenantId,
        entityType: "Project",
        entityId: project.id,
        action: "CREATE_PROJECT",
        payload: { customerExternalId: project.externalCustomerId },
      });
    }

    revalidateTimesheet();
    const hours = created.reduce((sum, row) => sum + Number(row.hours), 0);
    return { success: true as const, data: { hours, date: input.date.slice(0, 10) } };
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

    const comment = input.comment?.trim();
    await prisma.timeEntry.update({
      where: { id },
      data: {
        comment,
        projectId: input.projectId,
        clockFrom: input.clockFrom,
        clockTo: input.clockTo,
        approvalStatus: "SUBMITTED",
      },
    });
    if (comment) {
      await prisma.timeEntry.updateMany({
        where: {
          tenantId: ctx.tenantId,
          userId: entry.userId,
          projectId: entry.projectId,
          date: entry.date,
          clockFrom: entry.clockFrom,
          clockTo: entry.clockTo,
        },
        data: { comment },
      });
    }
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

export async function listTimesheetApprovalQueue(input?: {
  from?: string;
  to?: string;
  status?: "SUBMITTED" | "APPROVED" | "SYNC_ERROR";
}) {
  const ctx = await requirePermission("canApproveTimesheet");
  const from = input?.from ? new Date(`${input.from.slice(0, 10)}T00:00:00`) : null;
  const to = input?.to ? new Date(`${input.to.slice(0, 10)}T23:59:59`) : null;
  const entries = await prisma.timeEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(from && to ? { date: { gte: from, lte: to } } : {}),
      approvalStatus: input?.status ?? { in: ["SUBMITTED", "SYNC_ERROR", "REJECTED", "APPROVED", "SYNCED"] },
    },
    include: {
      user: { select: { name: true, email: true } },
      project: { select: { name: true, parentId: true, parent: { select: { name: true } } } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "asc" }],
    take: 1000,
  });
  const [mapping, salaryTypes] = await Promise.all([
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
  const activities = await prisma.accountingActivity.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
  });
  const projects = await prisma.project.findMany({
    where: { tenantId: ctx.tenantId, status: { in: ["ACTIVE", "PLANNING"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 300,
  });
  const usage =
    entries.length === 0
      ? []
      : await prisma.projectUsageLine.findMany({
          where: {
            tenantId: ctx.tenantId,
            userId: { in: [...new Set(entries.map((entry) => entry.userId))] },
            date: { in: entries.map((entry) => entry.date) },
          },
        });
  const rows = entries.map((entry) => ({
    ...entry,
    project: {
      name: entry.project.name,
      parentName: entry.project.parent?.name ?? null,
    },
  }));
  return JSON.parse(JSON.stringify({ entries: rows, usage, mapping, salaryTypes, activities, projects }));
}

export async function reviseApprovalDay(input: {
  entryIds: string[];
  projectId?: string;
  clockFrom?: string;
  clockTo?: string;
  lunchMinutes?: number;
  comment?: string;
  billingActivityId?: string | null;
  salaryTypeId?: string | null;
  usage?: Array<{ id: string; quantity: number; fromAddress?: string; toAddress?: string }>;
}) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    const entries = await prisma.timeEntry.findMany({
      where: { tenantId: ctx.tenantId, id: { in: input.entryIds }, approvalStatus: { in: ["SUBMITTED", "SYNC_ERROR"] } },
    });
    if (entries.length === 0) return { success: false as const, error: "Ingen linjer å endre" };
    const comment = input.comment?.trim();
    if (comment !== undefined && comment.length < 2) {
      return { success: false as const, error: "Kommentar er påkrevd" };
    }
    const first = entries[0];
    if (!first) return { success: false as const, error: "Ingen linjer å endre" };
    const clockFrom = input.clockFrom || first.clockFrom || "07:00";
    const clockTo = input.clockTo || first.clockTo || "15:30";
    const lunchMinutes = input.lunchMinutes ?? first.lunchMinutes ?? 0;
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        dayStartHour: true,
        dayEndHour: true,
        overtime50CapHours: true,
        saturdayOt50UntilHour: true,
        lunchBreakMinutes: true,
      },
    });
    const segments = splitDayHours({
      date: first.date,
      clockFrom,
      clockTo,
      lunchMinutes,
      rules: {
        dayStartHour: tenant?.dayStartHour ?? 7,
        dayEndHour: tenant?.dayEndHour ?? 15.5,
        overtime50CapHours: tenant?.overtime50CapHours ?? 4.5,
        saturdayOt50UntilHour: tenant?.saturdayOt50UntilHour ?? 12,
        lunchMinutes: tenant?.lunchBreakMinutes ?? 30,
      },
    });
    for (const entry of entries) {
      const segment = segments.find((row) => row.timeType === entry.timeType);
      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          projectId: input.projectId || entry.projectId,
          clockFrom,
          clockTo,
          lunchMinutes,
          comment: comment ?? entry.comment,
          hours: segment?.hours ?? entry.hours,
          billingActivityId: input.billingActivityId !== undefined ? input.billingActivityId : entry.billingActivityId,
          salaryTypeId: input.salaryTypeId !== undefined && input.salaryTypeId ? input.salaryTypeId : entry.salaryTypeId,
          editedById: ctx.userId,
          editedAt: new Date(),
        },
      });
    }
    for (const line of input.usage ?? []) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) continue;
      await prisma.projectUsageLine.updateMany({
        where: { id: line.id, tenantId: ctx.tenantId, syncStatus: { not: "SYNCED" } },
        data: {
          quantity: line.quantity,
          fromAddress: line.fromAddress?.trim() || null,
          toAddress: line.toAddress?.trim() || null,
          projectId: input.projectId || undefined,
        },
      });
    }
    revalidateTimesheet();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke endre dagen") };
  }
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
  const factor = pickTimeBankFactor(rules, { salaryTypeId, timeType, userId });
  const earned = applyTimeBankFactor(hours, factor);
  if (earned <= 0) return;
  const last = await prisma.timeBankLedger.findFirst({
    where: { tenantId, userId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });
  const balance = nextTimeBankBalance(last?.balanceAfter ?? 0, "EARN", earned);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timeBankMaxBalance: true, timeBankMinBalance: true },
  });
  const check = assertTimeBankBalance(balance, {
    min: tenant?.timeBankMinBalance,
    max: tenant?.timeBankMaxBalance,
  });
  if (!check.ok) return;
  await prisma.timeBankLedger.create({
    data: {
      tenantId,
      userId,
      kind: "EARN",
      status: "APPROVED",
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
        await ensureProjectSyncedToAccounting(ctx.tenantId, entry.projectId);
        await enqueueAccountingJob({
          tenantId: ctx.tenantId,
          entityType: "TimeEntry",
          entityId: entry.id,
          action: "UPSERT_TIME",
          payload: {},
        });
        await enqueueUsageLinesForDay({
          tenantId: ctx.tenantId,
          userId: entry.userId,
          date: entry.date,
          projectId: entry.projectId,
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
        rejectionReason: reason.trim(),
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
    await ensureProjectSyncedToAccounting(ctx.tenantId, entry.projectId);
    await enqueueAccountingJob({
      tenantId: ctx.tenantId,
      entityType: "TimeEntry",
      entityId: id,
      action: "UPSERT_TIME",
      payload: {},
    });
    await enqueueUsageLinesForDay({
      tenantId: ctx.tenantId,
      userId: entry.userId,
      date: entry.date,
      projectId: entry.projectId,
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
    select: {
      id: true,
      action: true,
      status: true,
      lastError: true,
      attempts: true,
      createdAt: true,
      entityType: true,
      entityId: true,
    },
  });

  const timeIds = jobs.filter((job) => job.entityType === "TimeEntry").map((job) => job.entityId);
  const projectIds = jobs.filter((job) => job.entityType === "Project").map((job) => job.entityId);
  const lineIds = jobs.filter((job) => job.entityType === "ProjectUsageLine").map((job) => job.entityId);
  const absenceIds = jobs.filter((job) => job.entityType === "Absence").map((job) => job.entityId);

  const [entries, projects, lines, absences] = await Promise.all([
    timeIds.length
      ? prisma.timeEntry.findMany({
          where: { id: { in: timeIds }, tenantId: ctx.tenantId },
          select: {
            id: true,
            hours: true,
            date: true,
            user: { select: { name: true, email: true } },
            project: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.project.findMany({
          where: { id: { in: projectIds }, tenantId: ctx.tenantId },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    lineIds.length
      ? prisma.projectUsageLine.findMany({
          where: { id: { in: lineIds }, tenantId: ctx.tenantId },
          select: {
            id: true,
            productName: true,
            quantity: true,
            date: true,
            kind: true,
            isPrivateCar: true,
            project: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    absenceIds.length
      ? prisma.absence.findMany({
          where: { id: { in: absenceIds }, tenantId: ctx.tenantId },
          select: {
            id: true,
            startDate: true,
            user: { select: { name: true, email: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const entryById = new Map(entries.map((row) => [row.id, row]));
  const projectById = new Map(projects.map((row) => [row.id, row]));
  const lineById = new Map(lines.map((row) => [row.id, row]));
  const absenceById = new Map(absences.map((row) => [row.id, row]));

  const items = jobs.map((job) => {
    const error = humanizeAccountingSyncError(job.lastError);
    let subject: string | null = null;
    if (job.entityType === "TimeEntry") {
      const entry = entryById.get(job.entityId);
      subject = formatSyncSubject({
        employee: entry?.user.name || entry?.user.email,
        project: entry?.project.name,
        date: entry?.date.toISOString().slice(0, 10) ?? null,
        hours: entry?.hours,
      });
    } else if (job.entityType === "Project") {
      subject = formatSyncSubject({ project: projectById.get(job.entityId)?.name });
    } else if (job.entityType === "ProjectUsageLine") {
      const line = lineById.get(job.entityId);
      subject = formatSyncSubject({
        project: line?.project.name,
        date: line?.date.toISOString().slice(0, 10) ?? null,
        product:
          line?.kind === "KM"
            ? `${line.quantity} km · ${line.isPrivateCar ? "privatbil" : "firmabil"}`
            : line?.productName,
        quantity: line?.kind === "KM" ? null : line?.quantity,
      });
    } else if (job.entityType === "Absence") {
      const absence = absenceById.get(job.entityId);
      subject = formatSyncSubject({
        employee: absence?.user.name || absence?.user.email,
        date: absence?.startDate.toISOString().slice(0, 10) ?? null,
      });
    }

    return {
      id: job.id,
      action: job.action,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      attempts: job.attempts,
      subject,
      errorTitle: error?.title ?? null,
      errorHint: error?.hint ?? null,
      canRetry: canRetrySyncJob(job.status, job.lastError),
    };
  });

  items.sort((a, b) => {
    const rank = syncLogStatusRank(a.status) - syncLogStatusRank(b.status);
    if (rank !== 0) return rank;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return items;
}

export async function retryAccountingSyncJob(jobId: string) {
  try {
    const ctx = await requirePermission("canApproveTimesheet");
    const job = await prisma.accountingSyncJob.findFirst({
      where: { id: jobId, tenantId: ctx.tenantId },
    });
    if (!job) return { success: false as const, error: "Jobb ikke funnet" };
    if (job.action === "UPSERT_LINE") {
      await prisma.projectUsageLine.updateMany({
        where: { id: job.entityId, tenantId: ctx.tenantId },
        data: { syncStatus: "PENDING" },
      });
    }
    if (job.action === "UPSERT_TIME") {
      await prisma.timeEntry.updateMany({
        where: { id: job.entityId, tenantId: ctx.tenantId },
        data: { syncStatus: "PENDING", approvalStatus: "APPROVED" },
      });
    }
    const result = await requeueAccountingJob(jobId);
    if (!result.ok) {
      const copy = humanizeAccountingSyncError(result.error ?? null);
      return { success: false as const, error: copy?.title ?? result.error ?? "Kunne ikke kjøre på nytt" };
    }
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke kjøre på nytt") };
  }
}

export async function addUsageToDay(input: {
  date: string;
  projectId: string;
  kind: ProjectUsageKind;
  productExternalId: string;
  quantity: number;
  comment?: string;
  isPrivateCar?: boolean;
  kmTaxable?: boolean;
  carKind?: CarKind;
}) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false as const, error: "Ikke autentisert" };
    if (!ctx.permissions.canAccessTimeRegistration) {
      return { success: false as const, error: "Ingen tilgang til timeregistrering" };
    }
    if (input.quantity <= 0) {
      return { success: false as const, error: input.kind === "KM" ? "Antall km må være over 0" : "Antall må være større enn 0" };
    }

    const date = new Date(`${input.date.slice(0, 10)}T12:00:00`);
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, tenantId: ctx.tenantId },
    });
    if (!project) return { success: false as const, error: "Prosjekt ikke funnet" };

    const dayEntry = await prisma.timeEntry.findFirst({
      where: { tenantId: ctx.tenantId, userId: ctx.userId, date, projectId: input.projectId },
      orderBy: { createdAt: "desc" },
    });
    if (!dayEntry) {
      return { success: false as const, error: "Send inn dagen før du etterregistrerer forbruk" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        tripletexProductKmId: true,
        tripletexProductKmNonTaxableId: true,
        defaultKmRate: true,
        kmAllowanceTaxable: true,
        accountingProvider: true,
      },
    });

    const approved = ["APPROVED", "SYNCED", "SYNC_ERROR"].includes(dayEntry.approvalStatus);
    const syncStatus = approved ? "PENDING" : "IDLE";

    if (input.kind === "KM") {
      const mapping = await ensureDefaultKmProducts(ctx.tenantId);
      const line = await createDayKmLine({
        db: prisma,
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        userId: ctx.userId,
        date,
        kilometers: input.quantity,
        carKind: carKindFromLine(input),
        comment: input.comment?.trim() || null,
        mapping: {
          taxable: mapping.taxable ?? tenant?.tripletexProductKmId ?? null,
          nonTaxable: mapping.nonTaxable ?? tenant?.tripletexProductKmNonTaxableId ?? null,
        },
        defaultKmRate: tenant?.defaultKmRate ?? null,
        kmAllowanceTaxable: Boolean(tenant?.kmAllowanceTaxable),
        syncStatus,
      });
      if (approved && isAccountingEnabled(tenant?.accountingProvider)) {
        await enqueueAccountingJob({
          tenantId: ctx.tenantId,
          entityType: "ProjectUsageLine",
          entityId: line.id,
          action: "UPSERT_LINE",
          payload: {},
        });
      }
      revalidateTimesheet();
      return { success: true as const, data: { id: line.id } };
    }

    const product = await prisma.accountingProduct.findUnique({
      where: { tenantId_externalId: { tenantId: ctx.tenantId, externalId: input.productExternalId } },
    });
    if (!product) {
      return { success: false as const, error: "Produkt ikke funnet" };
    }

    const line = await prisma.projectUsageLine.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        userId: ctx.userId,
        date,
        kind: input.kind,
        productExternalId: input.productExternalId,
        productName: product.name,
        quantity: input.quantity,
        unitPrice: product.priceExclVat,
        comment: input.comment?.trim() || null,
        syncStatus,
      },
    });

    if (approved && isAccountingEnabled(tenant?.accountingProvider)) {
      await enqueueAccountingJob({
        tenantId: ctx.tenantId,
        entityType: "ProjectUsageLine",
        entityId: line.id,
        action: "UPSERT_LINE",
        payload: {},
      });
    }

    revalidateTimesheet();
    return { success: true as const, data: { id: line.id } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke legge til forbruk") };
  }
}
