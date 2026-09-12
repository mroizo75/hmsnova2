"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { startOfWeek, endOfWeek } from "date-fns";
import { nb } from "date-fns/locale";

export async function fetchFieldJobs() {
  const ctx = await getAuthContext();
  if (!ctx) return { jobs: [], accountingEnabled: false, weekEntries: [] };

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { accountingProvider: true, defaultKmRate: true },
  });
  const accountingEnabled = tenant?.accountingProvider === "TRIPLETEX";

  const jobs = await prisma.project.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: { in: ["ACTIVE", "PLANNING"] },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { timeEntries: true, usageLines: true } },
    },
    take: 40,
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1, locale: nb });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1, locale: nb });
  const weekEntries = await prisma.timeEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      date: { gte: weekStart, lte: weekEnd },
    },
    include: { project: { select: { name: true } } },
    orderBy: { date: "asc" },
  });

  return JSON.parse(
    JSON.stringify({
      jobs,
      accountingEnabled,
      weekEntries,
      weekStart,
    })
  );
}

export async function fetchFieldJobDetail(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  const project = await prisma.project.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      timeEntries: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { user: { select: { name: true } } },
      },
      usageLines: { orderBy: { createdAt: "desc" }, take: 30 },
      mileageEntries: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!project) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      accountingProvider: true,
      tripletexProductKmId: true,
      tripletexProductMachineHoursId: true,
    },
  });

  const products = await prisma.accountingProduct.findMany({
    where: { tenantId: ctx.tenantId, isInactive: false },
    orderBy: { name: "asc" },
    take: 100,
  });

  return JSON.parse(JSON.stringify({ project, tenant, products }));
}

export async function fetchProjectsForBilling() {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  return prisma.project.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      projectManager: { select: { name: true, email: true } },
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: { incidents: true, sjaAnalyses: true, inspections: true, measures: true },
      },
    },
    orderBy: [{ billingStatus: "asc" }, { status: "asc" }, { createdAt: "desc" }],
  });
}
