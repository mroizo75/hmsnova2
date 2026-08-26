"use server";

import { prisma } from "@/lib/db";
import {
  requireCorporateGroupContext,
  requireTenantInGroup,
} from "@/lib/corporate-group-context";

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

export async function getGroupTenantIncidents(tenantId: string, options?: { limit?: number; offset?: number }) {
  await verifyTenantAccess(tenantId);

  const limit = options?.limit ?? 50;
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

export async function getGroupTenantRoutines(tenantId: string) {
  await verifyTenantAccess(tenantId);

  return prisma.routine.findMany({
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
  });
}

export async function getGroupTenantDocuments(tenantId: string) {
  await verifyTenantAccess(tenantId);

  return prisma.document.findMany({
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
  });
}

export async function getGroupTenantRiskAssessments(tenantId: string) {
  await verifyTenantAccess(tenantId);

  return prisma.riskAssessment.findMany({
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
  });
}

export async function getGroupTenantSjaAnalyses(tenantId: string) {
  await verifyTenantAccess(tenantId);

  return prisma.sjaAnalysis.findMany({
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
  });
}

export async function getGroupTenantEmployees(tenantId: string) {
  await verifyTenantAccess(tenantId);

  // GDPR: Kun vis nødvendig informasjon -- ikke personnummer, adresse, helseopplysninger
  return prisma.userTenant.findMany({
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
  });
}

export async function getGroupTenantInspections(tenantId: string) {
  await verifyTenantAccess(tenantId);

  return prisma.inspection.findMany({
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
  });
}
