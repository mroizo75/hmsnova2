"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchMeasureDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const measure = await prisma.measure.findUnique({
    where: { id, tenantId },
    include: {
      risk: { select: { id: true, title: true } },
      incident: { select: { id: true, title: true } },
      audit: { select: { id: true, title: true } },
      goal: { select: { id: true, title: true } },
      responsible: { select: { id: true, name: true, email: true } },
    },
  });

  if (!measure) {
    return null;
  }

  const tenantUsers = await prisma.user.findMany({
    where: {
      tenants: { some: { tenantId } },
    },
    select: { id: true, name: true, email: true },
  });

  return JSON.parse(JSON.stringify({ measure, tenantUsers }));
}
