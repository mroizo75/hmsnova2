"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export async function fetchWellbeingData() {
  const { tenantId } = await getRequiredTenantContext();

  const wellbeingForms = await prisma.formTemplate.findMany({
    where: {
      OR: [
        { tenantId, category: "WELLBEING" },
        { isGlobal: true, category: "WELLBEING" },
      ],
      isActive: true,
    },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
      _count: {
        select: {
          submissions: {
            where: { tenantId },
          },
        },
      },
      submissions: {
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const allSubmissions = await prisma.formSubmission.findMany({
    where: {
      tenantId,
      formTemplate: {
        category: "WELLBEING",
      },
    },
    include: {
      fieldValues: {
        include: {
          field: true,
        },
      },
      formTemplate: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const wellbeingRisks = await prisma.risk.findMany({
    where: {
      tenantId,
      category: "HEALTH",
      title: {
        contains: "psykososial",
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalSubmissions = allSubmissions.length;
  const submissionsThisMonth = allSubmissions.filter((s) => {
    const date = new Date(s.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const likertValues = allSubmissions.flatMap((s) =>
    s.fieldValues
      .filter((fv) => fv.field.fieldType === "LIKERT_SCALE")
      .map((fv) => parseInt(fv.value || "0"))
      .filter((v) => v > 0),
  );

  const averageScore =
    likertValues.length > 0
      ? (likertValues.reduce((sum, val) => sum + val, 0) / likertValues.length).toFixed(1)
      : null;

  const criticalIncidents = allSubmissions.filter((s) =>
    s.fieldValues.some(
      (fv) => fv.field.fieldType === "RADIO" && fv.value === "Ofte",
    ),
  ).length;

  return JSON.parse(JSON.stringify({
    wellbeingForms,
    allSubmissions,
    wellbeingRisks,
    totalSubmissions,
    submissionsThisMonth,
    averageScore,
    criticalIncidents,
  }));
}
