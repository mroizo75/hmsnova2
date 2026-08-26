"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchEnvironmentList() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return { aspects: [], nonCompliantCount: 0, allMeasurements: [], tenant: null };
  const { tenantId } = ctx;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });

  const [aspects, nonCompliantCount, allMeasurements] = await Promise.all([
    prisma.environmentalAspect.findMany({
      where: { tenantId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        goal: { select: { id: true, title: true } },
        measurements: {
          orderBy: { measurementDate: "desc" },
          take: 1,
        },
      },
      orderBy: [
        { significanceScore: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.environmentalMeasurement.count({
      where: { tenantId, status: "NON_COMPLIANT" },
    }),
    prisma.environmentalMeasurement.findMany({
      where: {
        tenantId,
        measurementDate: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
      include: {
        aspect: {
          select: { category: true, title: true },
        },
      },
      orderBy: { measurementDate: "desc" },
    }),
  ]);

  return JSON.parse(JSON.stringify({ aspects, nonCompliantCount, allMeasurements, tenant }));
}

export async function fetchEnvironmentDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const aspect = await prisma.environmentalAspect.findUnique({
    where: { id, tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      goal: { select: { id: true, title: true } },
      measurements: {
        orderBy: { measurementDate: "desc" },
        include: {
          responsible: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!aspect) return null;

  const [users, goals] = await Promise.all([
    prisma.user.findMany({
      where: { tenants: { some: { tenantId } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.goal.findMany({
      where: { tenantId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return JSON.parse(JSON.stringify({ aspect, users, goals }));
}
