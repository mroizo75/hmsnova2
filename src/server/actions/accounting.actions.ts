"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { encryptField } from "@/lib/field-encryption";
import { TripletexApiError, TripletexClient } from "@/lib/accounting/tripletex/client";
import {
  getTripletexApplicationName,
  isTripletexConsumerConfigured,
} from "@/lib/accounting/tripletex/env";
import { hashWebhookSecret } from "@/lib/accounting/security";
import { assertTripletexCompanyAvailable } from "@/lib/accounting/webhook-auth";
import { getAuthContext, requirePermission } from "@/lib/server-authorization";
import { getAccountingProvider, getTripletexAdapterForToken, isAccountingEnabled } from "@/lib/accounting/factory";
import { enqueueAccountingJob, pullAccountingMaster } from "@/lib/accounting/sync";
import { activityIdForTimeType } from "@/lib/accounting/timesheet";
import { filterProductsByAndQuery } from "@/lib/time/product-search";
import { jobKindAfterPromote } from "@/lib/accounting/job-kind";

function tripletexPublicErrorMessage(body?: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as {
      message?: unknown;
      validationMessages?: Array<{ message?: string }>;
    };
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    const validation = parsed.validationMessages
      ?.map((item) => item.message)
      .filter((item): item is string => Boolean(item))
      .join("; ");
    const combined = [message, validation].filter(Boolean).join(" — ");
    if (combined.length > 0 && combined.length < 300) return combined;
  } catch {
    return null;
  }
  return null;
}

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof TripletexApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Ugyldig Tripletex-token eller manglende tilgang for denne virksomheten";
    }
    const fromBody = tripletexPublicErrorMessage(error.body);
    if (fromBody) return fromBody;
    if (error.status === 500) return error.message;
    return fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.hmsnova.no").replace(/\/$/, "");
}

export async function getAccountingSettings() {
  const ctx = await getAuthContext();
  if (!ctx) return { success: false as const, error: "Ikke autentisert" };

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      accountingProvider: true,
      tripletexCompanyId: true,
      tripletexActivityNormalId: true,
      tripletexActivityOt50Id: true,
      tripletexActivityOt100Id: true,
      tripletexProductKmId: true,
      tripletexProductMachineHoursId: true,
      accountingLastPullAt: true,
      timeRegistrationEnabled: true,
      absenceProjectId: true,
    },
  });

  const provider = isAccountingEnabled(tenant?.accountingProvider)
    ? await getAccountingProvider(ctx.tenantId)
    : null;

  if (provider) {
    const linked = await prisma.project.count({
      where: { tenantId: ctx.tenantId, externalProjectId: { not: null } },
    });
    if (linked === 0) {
      await pullAccountingMaster(ctx.tenantId).catch(() => undefined);
    }
  }

  const [products, activities, txEmployees, employees, projects] = await Promise.all([
    prisma.accountingProduct.findMany({
      where: { tenantId: ctx.tenantId, isInactive: false },
      orderBy: { name: "asc" },
    }),
    provider ? provider.listActivities().catch(() => []) : Promise.resolve([]),
    provider ? provider.listEmployees().catch(() => []) : Promise.resolve([]),
    prisma.userTenant.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, name: true, isAbsenceProject: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  return {
    success: true as const,
    data: {
      ...tenant,
      connected: isAccountingEnabled(tenant?.accountingProvider),
      products,
      activities,
      txEmployees,
      employees: employees.map((e) => ({
        userId: e.userId,
        name: e.user.name,
        email: e.user.email,
        employeeNumber: e.employeeNumber,
        externalEmployeeId: e.externalEmployeeId,
      })),
      unmatchedCount: employees.filter((e) => !e.externalEmployeeId).length,
      projects,
      consumerConfigured: isTripletexConsumerConfigured(),
      applicationName: getTripletexApplicationName(),
    },
  };
}

export async function connectTripletex(employeeToken: string) {
  try {
    const ctx = await requirePermission("canUpdateSettings");
    if (!isTripletexConsumerConfigured()) {
      return {
        success: false as const,
        error: "HMS Nova sin Tripletex-integrasjon er ikke konfigurert på serveren",
      };
    }
    const token = employeeToken.trim();
    if (token.length < 8) {
      return { success: false as const, error: "Ugyldig employee token" };
    }

    const adapter = await getTripletexAdapterForToken(ctx.tenantId, token);
    const who = await adapter.testConnection();
    if (!who.companyId) {
      return { success: false as const, error: "Fant ikke Tripletex-selskap på tokenet" };
    }
    await assertTripletexCompanyAvailable(who.companyId, ctx.tenantId);

    TripletexClient.clearTenantSessions(ctx.tenantId);

    const webhookPlain = randomBytes(32).toString("hex");
    const webhookSecret = hashWebhookSecret(webhookPlain);
    const encrypted = encryptField(token);

    await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        accountingProvider: "TRIPLETEX",
        tripletexEmployeeToken: encrypted,
        tripletexCompanyId: who.companyId,
        accountingWebhookSecret: webhookSecret,
        timeRegistrationEnabled: true,
      },
    });

    const txEmployees = await adapter.listEmployees().catch(() => []);
    await pullAccountingMaster(ctx.tenantId);

    const memberships = await prisma.userTenant.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: { select: { email: true } } },
    });
    for (const m of memberships) {
      const match = txEmployees.find(
        (e) =>
          (e.email && m.user.email && e.email.toLowerCase() === m.user.email.toLowerCase()) ||
          (e.employeeNumber && m.employeeNumber && e.employeeNumber === m.employeeNumber)
      );
      if (match) {
        await prisma.userTenant.update({
          where: { id: m.id },
          data: { externalEmployeeId: match.externalId },
        });
      }
    }

    const targetUrl = `${appBaseUrl()}/api/webhooks/tripletex`;
    try {
      await adapter.subscribeWebhooks(targetUrl, `Bearer ${webhookPlain}`);
    } catch {
      // Webhooks kan feile i testmiljø — masterdata er allerede hentet
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/time-registration");
    revalidatePath("/ansatt/timeregistrering");
    revalidatePath("/ansatt/jobber");
    return { success: true as const, data: { companyName: who.companyName, companyId: who.companyId } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke koble til Tripletex") };
  }
}

export async function disconnectTripletex() {
  try {
    const ctx = await requirePermission("canUpdateSettings");
    TripletexClient.clearTenantSessions(ctx.tenantId);
    await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        accountingProvider: "NONE",
        tripletexEmployeeToken: null,
        tripletexCompanyId: null,
        accountingWebhookSecret: null,
      },
    });
    revalidatePath("/dashboard/settings");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke koble fra") };
  }
}

export async function saveTripletexMapping(input: {
  activityNormalId?: string | null;
  activityOt50Id?: string | null;
  activityOt100Id?: string | null;
  productKmId?: string | null;
  productMachineHoursId?: string | null;
  absenceProjectId?: string | null;
}) {
  try {
    const ctx = await requirePermission("canUpdateSettings");
    let absenceProjectId = input.absenceProjectId || null;
    if (absenceProjectId) {
      const own = await prisma.project.findFirst({
        where: { id: absenceProjectId, tenantId: ctx.tenantId },
        select: { id: true },
      });
      if (!own) {
        return { success: false as const, error: "Fraværsprosjektet tilhører ikke denne virksomheten" };
      }
    }
    await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        tripletexActivityNormalId: input.activityNormalId || null,
        tripletexActivityOt50Id: input.activityOt50Id || null,
        tripletexActivityOt100Id: input.activityOt100Id || null,
        tripletexProductKmId: input.productKmId || null,
        tripletexProductMachineHoursId: input.productMachineHoursId || null,
        absenceProjectId,
      },
    });
    if (absenceProjectId) {
      await prisma.project.updateMany({
        where: { tenantId: ctx.tenantId, isAbsenceProject: true },
        data: { isAbsenceProject: false },
      });
      await prisma.project.updateMany({
        where: { id: absenceProjectId, tenantId: ctx.tenantId },
        data: { isAbsenceProject: true },
      });
    }
    revalidatePath("/dashboard/settings");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre mapping") };
  }
}

export async function mapTenantEmployee(userId: string, externalEmployeeId: string) {
  try {
    const ctx = await requirePermission("canUpdateSettings");
    await prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId: ctx.tenantId } },
      data: { externalEmployeeId: externalEmployeeId || null },
    });
    revalidatePath("/dashboard/settings");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke koble ansatt") };
  }
}

export async function listCachedCustomers(query?: string) {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  return prisma.accountingCustomer.findMany({
    where: {
      tenantId: ctx.tenantId,
      isInactive: false,
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { organizationNumber: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 50,
  });
}

export async function listCachedProducts(query?: string) {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  const products = await prisma.accountingProduct.findMany({
    where: { tenantId: ctx.tenantId, isInactive: false },
    orderBy: { name: "asc" },
    take: 400,
  });
  return filterProductsByAndQuery(products, query ?? "").slice(0, 80);
}

export async function createFieldJob(input: {
  name: string;
  customerExternalId?: string;
  location?: string;
  description?: string;
  jobKind?: "SERVICE" | "HMS";
  parentId?: string;
  contactExternalId?: string;
}) {
  try {
    const ctx = await requirePermission("canCreateFieldProject");
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { accountingProvider: true },
    });

    const name = input.name.trim();
    if (name.length < 2) {
      return { success: false as const, error: "Skriv hva som skal gjøres" };
    }

    let clientName: string | null = null;
    let externalCustomerId: string | null = null;
    if (input.customerExternalId) {
      const customer = await prisma.accountingCustomer.findUnique({
        where: {
          tenantId_externalId: {
            tenantId: ctx.tenantId,
            externalId: input.customerExternalId,
          },
        },
      });
      if (!customer) {
        return { success: false as const, error: "Kunde ikke funnet" };
      }
      clientName = customer.name;
      externalCustomerId = customer.externalId;
    }

    let parentId: string | null = input.parentId ?? null;
    if (parentId) {
      const parent = await prisma.project.findFirst({
        where: { id: parentId, tenantId: ctx.tenantId },
        select: { id: true, externalCustomerId: true, clientName: true },
      });
      if (!parent) return { success: false as const, error: "Hovedprosjekt ikke funnet" };
      if (!externalCustomerId) {
        externalCustomerId = parent.externalCustomerId;
        clientName = parent.clientName;
      }
    }

    const project = await prisma.project.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        location: input.location?.trim() || null,
        description: input.description?.trim() || null,
        clientName,
        status: "ACTIVE",
        startDate: new Date(),
        jobKind: input.jobKind ?? "SERVICE",
        billingStatus: "OPEN",
        externalCustomerId,
        parentId,
        contactExternalId: input.contactExternalId || null,
        createdById: ctx.userId,
      },
    });

    if (isAccountingEnabled(tenant?.accountingProvider)) {
      await enqueueAccountingJob({
        tenantId: ctx.tenantId,
        entityType: "Project",
        entityId: project.id,
        action: "CREATE_PROJECT",
        payload: { customerExternalId: externalCustomerId },
      });
    }

    revalidatePath("/ansatt/jobber");
    revalidatePath("/ansatt/timeregistrering");
    revalidatePath("/dashboard/projects");
    return { success: true as const, data: project };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke opprette jobb") };
  }
}

export async function completeFieldJob(projectId: string) {
  try {
    const ctx = await requirePermission("canCreateFieldProject");
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: ctx.tenantId },
    });
    if (!project) return { success: false as const, error: "Jobb ikke funnet" };

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED", billingStatus: "READY", endDate: new Date() },
    });

    await enqueueAccountingJob({
      tenantId: ctx.tenantId,
      entityType: "Project",
      entityId: projectId,
      action: "UPDATE_PROJECT",
      payload: {},
    });

    revalidatePath("/ansatt/jobber");
    revalidatePath("/dashboard/projects");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke fullføre jobben") };
  }
}

export async function promoteJobToHms(projectId: string) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false as const, error: "Ikke autentisert" };
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: ctx.tenantId },
    });
    if (!project) return { success: false as const, error: "Jobb ikke funnet" };

    await prisma.project.update({
      where: { id: projectId },
      data: { jobKind: jobKindAfterPromote() },
    });
    // Ingen CREATE_PROJECT — samme externalProjectId beholdes.
    revalidatePath(`/ansatt/jobber/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke løfte jobben") };
  }
}

export async function addUsageLine(input: {
  projectId: string;
  kind: "PRODUCT" | "MACHINE" | "KM";
  productExternalId: string;
  quantity: number;
  comment?: string;
}) {
  try {
    const ctx = await requirePermission("canCreateFieldProject");
    if (input.quantity <= 0) {
      return { success: false as const, error: "Antall må være større enn 0" };
    }

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, tenantId: ctx.tenantId },
    });
    if (!project || project.status !== "ACTIVE") {
      return { success: false as const, error: "Jobben er ikke aktiv" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { tripletexProductKmId: true, defaultKmRate: true },
    });

    const productId =
      input.kind === "KM" && tenant?.tripletexProductKmId
        ? tenant.tripletexProductKmId
        : input.productExternalId;

    const product = await prisma.accountingProduct.findUnique({
      where: { tenantId_externalId: { tenantId: ctx.tenantId, externalId: productId } },
    });
    if (!product && input.kind !== "KM") {
      return { success: false as const, error: "Produkt ikke funnet" };
    }

    const line = await prisma.projectUsageLine.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        userId: ctx.userId,
        kind: input.kind,
        productExternalId: productId,
        productName: product?.name ?? (input.kind === "KM" ? "Km-tillegg" : "Produkt"),
        quantity: input.quantity,
        unitPrice: product?.priceExclVat ?? (input.kind === "KM" ? tenant?.defaultKmRate : null),
        comment: input.comment?.trim() || null,
        syncStatus: "PENDING",
      },
    });

    if (input.kind === "KM") {
      await prisma.mileageEntry.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: input.projectId,
          userId: ctx.userId,
          date: new Date(),
          kilometers: input.quantity,
          ratePerKm: tenant?.defaultKmRate ?? product?.priceExclVat,
          amount: (tenant?.defaultKmRate ?? product?.priceExclVat ?? 0) * input.quantity,
          comment: input.comment?.trim() || null,
          syncStatus: "PENDING",
        },
      });
    }

    await enqueueAccountingJob({
      tenantId: ctx.tenantId,
      entityType: "ProjectUsageLine",
      entityId: line.id,
      action: "UPSERT_LINE",
      payload: {},
    });

    revalidatePath(`/ansatt/jobber/${input.projectId}`);
    return { success: true as const, data: line };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke legge til linje") };
  }
}

export async function addJobTimeEntry(input: {
  projectId: string;
  hours: number;
  timeType: "NORMAL" | "OVERTIME_50" | "OVERTIME_100";
  comment?: string;
}) {
  try {
    const ctx = await requirePermission("canCreateFieldProject");
    if (input.hours <= 0 || input.hours > 24) {
      return { success: false as const, error: "Timer må være mellom 0 og 24" };
    }

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, tenantId: ctx.tenantId },
    });
    if (!project || project.status !== "ACTIVE") {
      return { success: false as const, error: "Jobben er ikke aktiv" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        timeRegistrationEnabled: true,
        tripletexActivityNormalId: true,
        tripletexActivityOt50Id: true,
        tripletexActivityOt100Id: true,
      },
    });
    if (!tenant?.timeRegistrationEnabled) {
      return { success: false as const, error: "Timeregistrering er ikke aktivert" };
    }

    const activityId = activityIdForTimeType(input.timeType, {
      normal: tenant.tripletexActivityNormalId,
      ot50: tenant.tripletexActivityOt50Id,
      ot100: tenant.tripletexActivityOt100Id,
    });

    const entry = await prisma.timeEntry.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        userId: ctx.userId,
        date: new Date(),
        hours: input.hours,
        timeType: input.timeType,
        comment: input.comment?.trim() || null,
        billingActivityId: activityId,
        approvalStatus: "SUBMITTED",
        syncStatus: "IDLE",
      },
    });

    revalidatePath(`/ansatt/jobber/${input.projectId}`);
    revalidatePath("/ansatt/jobber");
    revalidatePath("/ansatt/timeregistrering");
    return { success: true as const, data: entry };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke registrere timer") };
  }
}

export async function getInvoicePreview(projectId: string) {
  const ctx = await requirePermission("canInvoiceProject");
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: {
      timeEntries: { where: { invoicedAt: null } },
      usageLines: { where: { invoicedAt: null } },
    },
  });
  if (!project) return { success: false as const, error: "Prosjekt ikke funnet" };

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { defaultHourlyRate: true, overtime50Multiplier: true, overtime100Multiplier: true },
  });
  const baseRate = tenant?.defaultHourlyRate ?? 0;

  const lines = [
    ...project.timeEntries.map((e) => {
      const multiplier =
        e.timeType === "OVERTIME_100" || e.timeType === "WEEKEND"
          ? tenant?.overtime100Multiplier ?? 2
          : e.timeType === "OVERTIME_50" || e.timeType === "OVERTIME_40"
            ? tenant?.overtime50Multiplier ?? 1.5
            : 1;
      const unit = baseRate * multiplier;
      return {
        kind: "TIME" as const,
        id: e.id,
        description: `${timeTypeLabel(e.timeType)} (${e.hours} t)`,
        count: e.hours,
        unitPrice: unit,
        amount: e.hours * unit,
      };
    }),
    ...project.usageLines.map((l) => ({
      kind: "USAGE" as const,
      id: l.id,
      description: l.productName,
      count: l.quantity,
      unitPrice: l.unitPrice ?? 0,
      amount: l.quantity * (l.unitPrice ?? 0),
      productExternalId: l.productExternalId,
    })),
  ];

  const total = lines.reduce((s, l) => s + l.amount, 0);
  return {
    success: true as const,
    data: {
      project: {
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        billingStatus: project.billingStatus,
        externalOrderId: project.externalOrderId,
        externalProjectId: project.externalProjectId,
        externalCustomerId: project.externalCustomerId,
      },
      lines,
      total,
    },
  };
}

export async function createUnsentProjectInvoice(projectId: string) {
  try {
    const ctx = await requirePermission("canInvoiceProject");
    const preview = await getInvoicePreview(projectId);
    if (!preview.success) {
      return { success: false as const, error: preview.error };
    }
    const { project, lines } = preview.data;
    if (!project.externalCustomerId || !project.externalProjectId) {
      return { success: false as const, error: "Jobben er ikke synket til Tripletex ennå" };
    }
    if (lines.length === 0) {
      return { success: false as const, error: "Ingen linjer å fakturere" };
    }

    const provider = await getAccountingProvider(ctx.tenantId);
    if (!provider) {
      return { success: false as const, error: "Regnskapssystem er ikke aktivert" };
    }

    const invoiceDate = new Date().toISOString().slice(0, 10);
    const created = await provider.createUnsentInvoice({
      orderExternalId: project.externalOrderId,
      projectExternalId: project.externalProjectId,
      customerExternalId: project.externalCustomerId,
      invoiceDate,
      lines: lines.map((l) => ({
        description: l.description,
        count: l.count,
        productExternalId: "productExternalId" in l ? l.productExternalId : undefined,
        unitPriceExclVat: l.unitPrice || undefined,
      })),
    });

    const now = new Date();
    await prisma.$transaction([
      prisma.project.update({
        where: { id: projectId },
        data: { billingStatus: "INVOICED", status: "COMPLETED", externalOrderId: project.externalOrderId },
      }),
      prisma.timeEntry.updateMany({
        where: { projectId, tenantId: ctx.tenantId, invoicedAt: null },
        data: { invoicedAt: now },
      }),
      prisma.projectUsageLine.updateMany({
        where: { projectId, tenantId: ctx.tenantId, invoicedAt: null },
        data: { invoicedAt: now },
      }),
      prisma.mileageEntry.updateMany({
        where: { projectId, tenantId: ctx.tenantId, invoicedAt: null },
        data: { invoicedAt: now },
      }),
      prisma.projectInvoice.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          createdById: ctx.userId,
          externalInvoiceId: created.invoiceId,
          invoiceNumber: created.number,
          amountExclVat: created.amountExclVat ?? preview.data.total,
        },
      }),
    ]);

    await enqueueAccountingJob({
      tenantId: ctx.tenantId,
      entityType: "Project",
      entityId: projectId,
      action: "UPDATE_PROJECT",
      payload: {},
    });

    revalidatePath("/dashboard/projects");
    return {
      success: true as const,
      data: { invoiceNumber: created.number, invoiceId: created.invoiceId },
    };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke opprette faktura") };
  }
}

function timeTypeLabel(type: string): string {
  switch (type) {
    case "OVERTIME_50":
    case "OVERTIME_40":
      return "Overtid 50 %";
    case "OVERTIME_100":
    case "WEEKEND":
      return "Overtid 100 %";
    default:
      return "Ordinær tid";
  }
}
