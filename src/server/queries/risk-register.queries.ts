"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchRiskRegisterData() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const risks = await prisma.risk.findMany({
    where: { tenantId },
    include: {
      owner: { select: { name: true, email: true } },
      controls: { select: { status: true, effectiveness: true } },
      documentLinks: { select: { id: true } },
      auditLinks: { select: { id: true } },
      measures: { select: { status: true } },
    },
    orderBy: [
      { score: "desc" },
      { updatedAt: "desc" },
    ],
  });

  const rows = risks.map((risk) => ({
    id: risk.id,
    title: risk.title,
    category: risk.category,
    status: risk.status,
    score: risk.score,
    residualScore: risk.residualScore,
    owner: risk.owner,
    responseStrategy: risk.responseStrategy,
    trend: risk.trend,
    nextReviewDate: risk.nextReviewDate,
    controls: risk.controls,
    documentCount: risk.documentLinks.length,
    auditCount: risk.auditLinks.length,
    measuresOpen: risk.measures.filter((measure) => measure.status !== "DONE").length,
  }));

  return JSON.parse(JSON.stringify(rows));
}

export async function fetchRiskDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const risk = await prisma.risk.findUnique({
    where: { id, tenantId },
    include: {
      measures: {
        orderBy: { createdAt: "desc" },
      },
      owner: {
        select: { id: true, name: true, email: true },
      },
      kpi: {
        select: { id: true, title: true },
      },
      inspectionTemplate: {
        select: { id: true, name: true },
      },
      controls: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          evidenceDocument: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      documentLinks: {
        include: {
          document: { select: { id: true, title: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      auditLinks: {
        include: {
          audit: { select: { id: true, title: true, scheduledDate: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!risk) return null;

  const [tenantUsers, goals, inspectionTemplates, documents, audits, sjaHazards, routineLinks, availableRoutines] = await Promise.all([
    prisma.user.findMany({
      where: { tenants: { some: { tenantId } } },
      select: { id: true, name: true, email: true },
    }),
    prisma.goal.findMany({
      where: { tenantId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.inspectionTemplate.findMany({
      where: { OR: [{ tenantId }, { tenantId: null, isGlobal: true }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: { tenantId },
      select: { id: true, title: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.audit.findMany({
      where: { tenantId },
      select: { id: true, title: true, scheduledDate: true, status: true },
      orderBy: { scheduledDate: "desc" },
      take: 100,
    }),
    prisma.sjaHazard.findMany({
      where: { linkedRiskId: id },
      include: { sjaAnalysis: { select: { id: true, title: true, sjaNummer: true } } },
    }),
    prisma.riskRoutineLink.findMany({
      where: { riskId: id },
      include: { routine: { select: { id: true, title: true, status: true, category: true } } },
    }),
    prisma.routine.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const linkedRoutines = routineLinks.map((l) => l.routine);

  return JSON.parse(JSON.stringify({
    risk,
    tenantUsers,
    goals,
    inspectionTemplates,
    documents,
    audits,
    sjaHazards,
    linkedRoutines,
    availableRoutines,
  }));
}

export async function fetchRiskAssessmentDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const [assessment, userTenants] = await Promise.all([
    prisma.riskAssessment.findFirst({
      where: { id, tenantId },
      include: {
        project: { select: { id: true, name: true } },
        risks: {
          orderBy: [{ score: "desc" }, { assessmentDate: "desc" }, { createdAt: "asc" }],
          include: { owner: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  if (!assessment) return null;

  const userList = userTenants
    .filter((ut) => ut.user.email)
    .map((ut) => ({
      id: ut.user.id,
      name: ut.user.name,
      email: ut.user.email ?? "",
    }));

  return JSON.parse(JSON.stringify({ assessment, userList }));
}
