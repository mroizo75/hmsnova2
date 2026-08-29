"use server";

import { prisma } from "@/lib/db";
import {
  requireCorporateGroupContext,
  requireTenantInGroup,
} from "@/lib/corporate-group-context";

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 25;

async function verifyTenantAccess(tenantId: string) {
  const context = await requireCorporateGroupContext();
  await requireTenantInGroup(context.groupId, tenantId);

  await prisma.corporateGroupAuditLog.create({
    data: {
      groupId: context.groupId,
      userId: context.userId,
      action: "VIEW_TENANT_DATA",
      targetType: "tenant",
      targetId: tenantId,
    },
  });

  return context;
}

export async function getGroupTenantInfo(tenantId: string) {
  await verifyTenantAccess(tenantId);

  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      orgNumber: true,
      industry: true,
      employeeCount: true,
      status: true,
      contactPerson: true,
      contactEmail: true,
    },
  });
}

export async function getGroupTenantOverview(tenantId: string) {
  await verifyTenantAccess(tenantId);

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [
    employeeCount,
    openIncidents,
    totalIncidents,
    activeRoutines,
    needsReviewRoutines,
    approvedDocuments,
    riskAssessments,
    completedInspections,
    plannedInspections,
    validTraining,
    expiredTraining,
    recentIncidents,
  ] = await Promise.all([
    prisma.userTenant.count({ where: { tenantId } }),
    prisma.incident.count({ where: { tenantId, status: { in: ["OPEN", "INVESTIGATING"] } } }),
    prisma.incident.count({ where: { tenantId, occurredAt: { gte: twelveMonthsAgo } } }),
    prisma.routine.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.routine.count({ where: { tenantId, status: "NEEDS_REVIEW" } }),
    prisma.document.count({ where: { tenantId, status: "APPROVED" } }),
    prisma.riskAssessment.count({ where: { tenantId, updatedAt: { gte: twelveMonthsAgo } } }),
    prisma.inspection.count({ where: { tenantId, status: "COMPLETED", scheduledDate: { gte: twelveMonthsAgo } } }),
    prisma.inspection.count({ where: { tenantId, status: "PLANNED" } }),
    prisma.training.count({
      where: { tenantId, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
    }),
    prisma.training.count({ where: { tenantId, validUntil: { lt: now } } }),
    prisma.incident.findMany({
      where: { tenantId, occurredAt: { gte: twelveMonthsAgo } },
      select: { id: true, title: true, type: true, status: true, severity: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    employeeCount,
    openIncidents,
    totalIncidents,
    activeRoutines,
    needsReviewRoutines,
    approvedDocuments,
    riskAssessments,
    completedInspections,
    plannedInspections,
    validTraining,
    expiredTraining,
    recentIncidents,
  };
}

export async function getGroupTenantIncidents(tenantId: string, options?: PaginationOptions) {
  await verifyTenantAccess(tenantId);

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const offset = options?.offset ?? 0;

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where: { tenantId },
      select: {
        id: true,
        avviksnummer: true,
        title: true,
        type: true,
        status: true,
        stage: true,
        severity: true,
        occurredAt: true,
        location: true,
      },
      orderBy: { occurredAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.incident.count({ where: { tenantId } }),
  ]);

  return { incidents, total };
}

export async function getGroupTenantRoutines(tenantId: string, options?: PaginationOptions) {
  await verifyTenantAccess(tenantId);

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const offset = options?.offset ?? 0;

  const [routines, total] = await Promise.all([
    prisma.routine.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        legalReference: true,
        nextReviewAt: true,
        lastReviewedAt: true,
        isLockedByGroup: true,
        corporateGroupContentId: true,
        updatedAt: true,
      },
      orderBy: { title: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.routine.count({ where: { tenantId } }),
  ]);

  return { routines, total };
}

export async function getGroupTenantDocuments(tenantId: string, options?: PaginationOptions) {
  await verifyTenantAccess(tenantId);

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const offset = options?.offset ?? 0;

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        kind: true,
        status: true,
        version: true,
        approvedAt: true,
        nextReviewDate: true,
        isLockedByGroup: true,
        corporateGroupContentId: true,
        updatedAt: true,
      },
      orderBy: { title: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.document.count({ where: { tenantId } }),
  ]);

  return { documents, total };
}

export async function getGroupTenantRiskAssessments(tenantId: string, options?: PaginationOptions) {
  await verifyTenantAccess(tenantId);

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const offset = options?.offset ?? 0;

  const [assessments, total] = await Promise.all([
    prisma.riskAssessment.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        assessmentYear: true,
        approvedAt: true,
        reviewedAt: true,
        isLockedByGroup: true,
        corporateGroupContentId: true,
        updatedAt: true,
        _count: { select: { risks: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.riskAssessment.count({ where: { tenantId } }),
  ]);

  return { assessments, total };
}

export async function getGroupTenantSjaAnalyses(tenantId: string, options?: PaginationOptions) {
  await verifyTenantAccess(tenantId);

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const offset = options?.offset ?? 0;

  const [analyses, total] = await Promise.all([
    prisma.sjaAnalysis.findMany({
      where: { tenantId },
      select: {
        id: true,
        sjaNummer: true,
        title: true,
        status: true,
        conclusion: true,
        workLocation: true,
        plannedDate: true,
        createdByName: true,
        updatedAt: true,
      },
      orderBy: { plannedDate: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.sjaAnalysis.count({ where: { tenantId } }),
  ]);

  return { analyses, total };
}

export async function getGroupTenantEmployees(tenantId: string, options?: PaginationOptions) {
  await verifyTenantAccess(tenantId);

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const offset = options?.offset ?? 0;

  const [employees, total] = await Promise.all([
    prisma.userTenant.findMany({
      where: { tenantId },
      select: {
        id: true,
        role: true,
        department: true,
        position: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
      take: limit,
      skip: offset,
    }),
    prisma.userTenant.count({ where: { tenantId } }),
  ]);

  return { employees, total };
}

export async function getGroupTenantInspections(tenantId: string, options?: PaginationOptions) {
  await verifyTenantAccess(tenantId);

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const offset = options?.offset ?? 0;

  const [inspections, total] = await Promise.all([
    prisma.inspection.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        scheduledDate: true,
        completedDate: true,
        location: true,
        area: true,
        updatedAt: true,
      },
      orderBy: { scheduledDate: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.inspection.count({ where: { tenantId } }),
  ]);

  return { inspections, total };
}

export async function getGroupAuditLog(options?: PaginationOptions) {
  const context = await requireCorporateGroupContext();

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const offset = options?.offset ?? 0;

  const [logs, total] = await Promise.all([
    prisma.corporateGroupAuditLog.findMany({
      where: { groupId: context.groupId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.corporateGroupAuditLog.count({
      where: { groupId: context.groupId },
    }),
  ]);

  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    logs: logs.map((log) => ({
      ...log,
      user: userMap.get(log.userId) ?? null,
    })),
    total,
  };
}
