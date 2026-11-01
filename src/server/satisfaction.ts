import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { averageRating, sentimentFromRating } from "@/lib/customer-satisfaction";

export async function ensureSurveyForTenant(tenantId: string, userId: string) {
  const existing = await prisma.satisfactionSurvey.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return prisma.satisfactionSurvey.create({
    data: {
      tenantId,
      createdById: userId,
      token: randomBytes(24).toString("hex"),
    },
  });
}

export async function syncCustomerSatisfactionGoal(tenantId: string, ownerId: string) {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const rows = await prisma.customerFeedback.findMany({
    where: { tenantId, rating: { not: null }, feedbackDate: { gte: start } },
    select: { rating: true },
  });
  const avg = averageRating(rows.flatMap((row) => (typeof row.rating === "number" ? [row.rating] : [])));
  if (avg === null) return null;

  const existing = await prisma.goal.findFirst({
    where: { tenantId, category: "CUSTOMER", year, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  const goal = existing
    ? await prisma.goal.update({ where: { id: existing.id }, data: { currentValue: avg } })
    : await prisma.goal.create({
        data: {
          tenantId,
          title: `Kundetilfredshet ${year}`,
          description: "Snitt av innhentede kundevurderinger. ISO 9001:2015 pkt. 9.1.2.",
          category: "CUSTOMER",
          targetValue: 4,
          currentValue: avg,
          unit: "poeng (1–5)",
          year,
          ownerId,
          status: "ACTIVE",
        },
      });

  await prisma.kpiMeasurement.create({
    data: {
      goalId: goal.id,
      tenantId,
      value: avg,
      measurementDate: new Date(),
      measurementType: "AUTOMATIC",
      source: "customer_satisfaction",
      comment: "Snitt av kundevurderinger 1–5 (ISO 9001 pkt. 9.1.2)",
    },
  });

  return avg;
}

export function surveySentiment(rating: number) {
  return sentimentFromRating(rating);
}
