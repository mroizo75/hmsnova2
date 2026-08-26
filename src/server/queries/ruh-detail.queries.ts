"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export async function fetchRuhDetail(id: string) {
  const { tenantId } = await getRequiredTenantContext();

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
