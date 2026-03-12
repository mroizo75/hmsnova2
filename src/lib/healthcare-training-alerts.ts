import { prisma } from "@/lib/db";
import { hasTenantFeature } from "@/lib/tenant-features";
import { createNotification } from "@/server/actions/notification.actions";

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
  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);
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
    },
  });

  const healthcareTenants = tenants.filter((tenant) =>
    hasTenantFeature(tenant.industry, "helseforetak"),
  );

  const results: AlertRunResult[] = [];

  for (const tenant of healthcareTenants) {
    const trainings = await prisma.training.findMany({
      where: {
        tenantId: tenant.id,
        isRequired: true,
        validUntil: {
          lte: in30Days,
        },
      },
      orderBy: {
        validUntil: "asc",
      },
      take: 200,
    });

    if (trainings.length === 0) {
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        sent: 0,
      });
      continue;
    }

    const recipients = await prisma.userTenant.findMany({
      where: {
        tenantId: tenant.id,
        role: {
          in: ["ADMIN", "HMS", "LEDER"],
        },
      },
      select: { userId: true },
    });

    let tenantSent = 0;
    const employeeIds = Array.from(new Set(trainings.map((training) => training.userId)));
    const employees = await prisma.user.findMany({
      where: {
        id: {
          in: employeeIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

    for (const training of trainings) {
      if (!training.validUntil) {
        continue;
      }

      const validUntil = new Date(training.validUntil);
      const daysUntilExpiry = Math.ceil(
        (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isExpired = daysUntilExpiry <= 0;
      const type = isExpired ? "TRAINING_EXPIRED" : "TRAINING_DUE";
      const title = isExpired
        ? "Kompetanse utløpt (helse)"
        : "Kompetanse utløper snart (helse)";
      const employee = employeeById.get(training.userId);
      const employeeName = employee?.name || employee?.email || "Ukjent ansatt";
      const message = isExpired
        ? `${training.title} for ${employeeName} er utløpt og må fornyes.`
        : `${training.title} for ${employeeName} utløper om ${daysUntilExpiry} dager.`;
      const link = `/dashboard/training?trainingId=${training.id}`;

      for (const recipient of recipients) {
        const existing = await prisma.notification.findFirst({
          where: {
            tenantId: tenant.id,
            userId: recipient.userId,
            type,
            title,
            link,
            createdAt: {
              gte: dayStart,
            },
          },
          select: { id: true },
        });

        if (existing) {
          continue;
        }

        const created = await createNotification({
          tenantId: tenant.id,
          userId: recipient.userId,
          type,
          title,
          message,
          link,
        });

        if (created.success) {
          tenantSent += 1;
        }
      }
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

