"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchProjects() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const projects = await prisma.project.findMany({
    where: { tenantId },
    include: {
      projectManager: { select: { name: true, email: true } },
      _count: {
        select: { incidents: true, sjaAnalyses: true, inspections: true, measures: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return JSON.parse(JSON.stringify(projects));
}

export async function fetchProjectDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const project = await prisma.project.findUnique({
    where: { id, tenantId },
    include: {
      createdBy: { select: { name: true, email: true } },
      projectManager: { select: { name: true, email: true } },
      incidents: {
        orderBy: { occurredAt: "desc" },
        select: {
          id: true, avviksnummer: true, title: true, type: true,
          severity: true, status: true, occurredAt: true,
          isFatal: true, isLostTimeIncident: true, lostWorkdays: true,
          isRestrictedWork: true, medicalAttentionRequired: true,
        },
      },
      sjaAnalyses: {
        orderBy: { plannedDate: "desc" },
        select: {
          id: true, sjaNummer: true, title: true, status: true,
          plannedDate: true, workLocation: true,
        },
      },
      inspections: {
        orderBy: { scheduledDate: "desc" },
        select: {
          id: true, title: true, type: true, status: true,
          scheduledDate: true, location: true,
        },
      },
      measures: {
        orderBy: { dueAt: "asc" },
        select: {
          id: true, title: true, status: true, dueAt: true, category: true,
          riskId: true, incidentId: true, projectId: true,
        },
      },
      timeEntries: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          hours: true,
          timeType: true,
          comment: true,
          user: { select: { name: true, email: true } },
        },
        take: 20,
      },
      formSubmissions: {
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          submissionNumber: true,
          status: true,
          createdAt: true,
          formTemplateId: true,
          formTemplate: {
            select: { title: true },
          },
          submittedBy: {
            select: { name: true, email: true },
          },
        },
        take: 20,
      },
    },
  });

  if (!project) return null;

  const attachments = await prisma.attachment.findMany({
    where: {
      tenantId,
      objectType: "PROJECT",
      objectId: project.id,
    },
    select: {
      id: true,
      fileKey: true,
      name: true,
      mime: true,
      size: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify({ project, attachments }));
}

export async function fetchConstructionComplianceOverview() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const projects = await prisma.project.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      location: true,
      constructionShaPlan: { select: { id: true } },
      constructionPreNotification: { select: { id: true } },
      constructionRosterEntries: {
        where: { isActive: true },
        select: { id: true },
      },
      constructionRosterChecks: {
        orderBy: { checkedDate: "desc" },
        take: 1,
        select: { checkedDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return JSON.parse(JSON.stringify(projects));
}
