"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { format } from "date-fns";
import { weekDateRange } from "@/lib/time/week-range";

export async function fetchFieldJobs() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return {
      jobs: [],
      assignedJobs: [],
      accountingEnabled: false,
      weekEntries: [],
      canCreateFieldProject: false,
    };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { accountingProvider: true, defaultKmRate: true },
  });
  const accountingEnabled = tenant?.accountingProvider === "TRIPLETEX";
  const week = weekDateRange(format(new Date(), "yyyy-MM-dd"));

  const [jobs, weekEntries, assignments, ownHours] = await Promise.all([
    prisma.project.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ["ACTIVE", "PLANNING"] },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { timeEntries: true, usageLines: true } },
      },
      take: 80,
    }),
    prisma.timeEntry.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        date: { gte: week.from, lte: week.to },
      },
      include: { project: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.resourceAssignment.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        startDate: { lte: week.to },
        endDate: { gte: week.from },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            location: true,
            jobKind: true,
            status: true,
            billingStatus: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: { tenantId: ctx.tenantId, userId: ctx.userId },
      select: { projectId: true },
      distinct: ["projectId"],
    }),
  ]);

  const assignedIds = new Set(assignments.map((a) => a.projectId));
  const ownProjectIds = new Set(ownHours.map((e) => e.projectId));
  const isEmployee = ctx.role === "ANSATT";
  const visibleJobs = isEmployee
    ? jobs.filter(
        (job) =>
          assignedIds.has(job.id) ||
          ownProjectIds.has(job.id) ||
          job.createdById === ctx.userId
      )
    : jobs;

  const assignedJobs = [];
  const seenAssigned = new Set<string>();
  for (const a of assignments) {
    if (seenAssigned.has(a.projectId)) continue;
    seenAssigned.add(a.projectId);
    assignedJobs.push({
      id: a.project.id,
      name: a.project.name,
      clientName: a.project.clientName,
      location: a.project.location,
      jobKind: a.project.jobKind,
      status: a.project.status,
      billingStatus: a.project.billingStatus,
      startDate: a.startDate,
      endDate: a.endDate,
      plannedHours: a.plannedHours,
    });
  }

  return JSON.parse(
    JSON.stringify({
      jobs: visibleJobs,
      assignedJobs,
      accountingEnabled,
      weekEntries,
      weekStart: week.days[0],
      canCreateFieldProject: ctx.permissions.canCreateFieldProject,
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
