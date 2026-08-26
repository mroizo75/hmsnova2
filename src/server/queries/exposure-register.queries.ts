"use server";

import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";

export async function fetchExposureRegister() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return [];
  const { tenantId } = ctx;

  const entries = await prisma.exposureRegister.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    omit: { employeeBirthNumber: true },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      chemical: { select: { id: true, productName: true, casNumber: true } },
      ruhReport: { select: { id: true, ruhNummer: true, title: true, occurredAt: true } },
      risk: {
        select: {
          id: true, title: true, score: true, status: true,
          riskAssessment: { select: { title: true, assessmentYear: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify(entries));
}
