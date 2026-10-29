import { prisma } from "@/lib/db";
import { hasTenantFeature } from "@/lib/tenant-features";
import { roleMatchFilter } from "@/lib/extra-roles";
import { createNotification } from "@/server/actions/notification.actions";
import { daysUntil, expiryDigestMessage, pickCurrentTrainings } from "@/features/training/lib/current-training";

type AlertRunResult = {
  tenantId: string;
  tenantName: string;
  sent: number;
};

export async function runHealthcareTrainingExpiryAlerts(options?: {
  tenantId?: string;
}): Promise<{
  totalSent: number;
  tenantsProcessed: number;
  results: AlertRunResult[];
}> {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const tenantFilter = options?.tenantId
    ? { id: options.tenantId }
    : { status: "ACTIVE" as const };

  const tenants = await prisma.tenant.findMany({
    where: tenantFilter,
    select: {
      id: true,
      name: true,
      industry: true,
      status: true,
      trainingReminderDaysBefore: true,
    },
  });

  const healthcareTenants = tenants.filter((tenant) =>
    hasTenantFeature(tenant.industry, "helseforetak"),
  );

  const results: AlertRunResult[] = [];

  for (const tenant of healthcareTenants) {
    const reminderDays = tenant.trainingReminderDaysBefore ?? 30;
    const recorded = await prisma.training.findMany({
      where: {
        tenantId: tenant.id,
        isRequired: true,
        validUntil: { not: null },
      },
    });
    const current = pickCurrentTrainings(recorded);
    const expiring = current.filter((training) => {
      const days = daysUntil(training.validUntil, now);
      return days !== null && days > 0 && days <= reminderDays;
    });
    const expired = current.filter((training) => {
      const days = daysUntil(training.validUntil, now);
      return days !== null && days <= 0;
    });

    if (expiring.length === 0 && expired.length === 0) {
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        sent: 0,
      });
      continue;
    }

    const byCourse = new Map<string, { courseKey: string; title: string; expiring: number; expired: number }>();
    for (const training of [...expiring, ...expired]) {
      const row = byCourse.get(training.courseKey) ?? {
        courseKey: training.courseKey,
        title: training.title,
        expiring: 0,
        expired: 0,
      };
      if (expired.includes(training)) row.expired += 1;
      else row.expiring += 1;
      byCourse.set(training.courseKey, row);
    }

    const recipients = await prisma.userTenant.findMany({
      where: {
        tenantId: tenant.id,
        ...roleMatchFilter(["ADMIN", "HMS"]),
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    let tenantSent = 0;
    const message = expiryDigestMessage({
      expiringCount: expiring.length,
      expiredCount: expired.length,
      reminderDays,
      courses: [...byCourse.values()],
    });

    for (const recipient of recipients) {
      const existing = await prisma.notification.findFirst({
        where: {
          tenantId: tenant.id,
          userId: recipient.userId,
          type: "TRAINING_DUE",
          title: "Kompetanse som må fornyes",
          createdAt: { gte: dayStart },
        },
        select: { id: true },
      });
      if (existing) continue;

      const created = await createNotification({
        tenantId: tenant.id,
        userId: recipient.userId,
        type: "TRAINING_DUE",
        title: "Kompetanse som må fornyes",
        message,
        link: "/dashboard/training",
      });
      if (created.success) tenantSent += 1;
    }

    results.push({
      tenantId: tenant.id,
      tenantName: tenant.name,
      sent: tenantSent,
    });
  }

  return {
    totalSent: results.reduce((sum, result) => sum + result.sent, 0),
    tenantsProcessed: healthcareTenants.length,
    results,
  };
}

