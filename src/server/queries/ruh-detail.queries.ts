"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchRuhDetail(id: string) {
  const ctx = await getTenantContextSafe();
  if (!ctx) return null;
  const { tenantId } = ctx;

  const report = await prisma.ruhReport.findUnique({
    where: { id, tenantId },
    include: {
      attachments: true,
    },
  });

  if (!report) {
    return null;
  }

  return JSON.parse(JSON.stringify(report));
}
