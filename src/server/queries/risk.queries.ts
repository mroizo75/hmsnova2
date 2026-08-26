"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchRisks() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const risks = await prisma.risk.findMany({
    where: { tenantId },
    include: {
      measures: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
      inspectionTemplate: {
        select: { id: true, name: true },
      },
      kpi: {
        select: { id: true, title: true },
      },
    },
    orderBy: [
      { score: "desc" },
      { createdAt: "desc" },
    ],
  });

  return JSON.parse(JSON.stringify(risks));
}

export async function fetchRiskAssessments() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const assessments = await prisma.riskAssessment.findMany({
    where: { tenantId },
    include: { _count: { select: { risks: true } } },
    orderBy: [{ assessmentYear: "desc" }, { createdAt: "desc" }],
  });

  return JSON.parse(JSON.stringify(assessments));
}
