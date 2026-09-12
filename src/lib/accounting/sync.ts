import { prisma } from "@/lib/db";
import type { OutboxAction } from "./outbox";
import { ACCOUNTING_OUTBOX_MAX_ATTEMPTS, shouldMarkSyncError } from "./outbox";
import { getAccountingProvider, isAccountingEnabled } from "./factory";
import { activityIdForTimeType } from "./timesheet";
import { canEnqueueTimesheetSync } from "@/lib/time/approval";
import { upsertContacts, upsertCustomers, upsertProducts, upsertSalaryTypes } from "./cache";
import { upsertPulledProjects } from "./project-pull";

export async function pullAccountingMaster(tenantId: string): Promise<void> {
  const provider = await getAccountingProvider(tenantId);
  if (!provider) return;

  const [customers, products, salaryTypes, contacts, projects] = await Promise.all([
    provider.listCustomers(),
    provider.listProducts(),
    provider.listSalaryTypes().catch(() => []),
    provider.listContacts().catch(() => []),
    provider.listProjects().catch(() => []),
  ]);
  await upsertCustomers(tenantId, customers);
  await upsertProducts(tenantId, products);
  await upsertSalaryTypes(tenantId, salaryTypes);
  await upsertContacts(tenantId, contacts);
  await upsertPulledProjects(tenantId, projects);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { accountingLastPullAt: new Date() },
  });
}

export async function enqueueAccountingJob(input: {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: OutboxAction;
  payload: Record<string, unknown>;
}): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { accountingProvider: true },
  });
  if (!tenant || !isAccountingEnabled(tenant.accountingProvider)) return;

  const job = await prisma.accountingSyncJob.create({
    data: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload as object,
      status: "PENDING",
    },
  });

  try {
    const { enqueueOutboxJob } = await import("@/lib/jobs/accounting-outbox");
    await enqueueOutboxJob(job.id);
  } catch {
    // Redis kan mangle lokalt — nattlig/polling plukker PENDING
  }

  try {
    await processAccountingJob(job.id);
  } catch {
    // Beholdes som PENDING for retry
  }
}

export async function processAccountingJob(jobId: string): Promise<{ ok: boolean; error?: string }> {
  const job = await prisma.accountingSyncJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "SYNCED") return { ok: true };

  const attempts = job.attempts + 1;
  await prisma.accountingSyncJob.update({
    where: { id: jobId },
    data: { attempts, status: "PENDING" },
  });

  try {
    await dispatchJob(job.tenantId, job.action as OutboxAction, job.entityType, job.entityId, job.payload);
    await prisma.accountingSyncJob.update({
      where: { id: jobId },
      data: { status: "SYNCED", lastError: null },
    });
    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjent synk-feil";
    const status = shouldMarkSyncError(attempts, ACCOUNTING_OUTBOX_MAX_ATTEMPTS) ? "ERROR" : "PENDING";
    await prisma.accountingSyncJob.update({
      where: { id: jobId },
      data: { status, lastError: message.slice(0, 4000) },
    });
    if (job.action === "UPSERT_TIME") {
      await prisma.timeEntry.updateMany({
        where: { id: job.entityId, tenantId: job.tenantId },
        data: { syncStatus: "ERROR", approvalStatus: "SYNC_ERROR" },
      });
    }
    if (job.action === "UPSERT_ABSENCE") {
      await prisma.absence.updateMany({
        where: { id: job.entityId, tenantId: job.tenantId },
        data: { syncStatus: "ERROR" },
      });
    }
    return { ok: false, error: message };
  }
}

async function dispatchJob(
  tenantId: string,
  action: OutboxAction,
  entityType: string,
  entityId: string,
  payload: unknown
): Promise<void> {
  const provider = await getAccountingProvider(tenantId);
  if (!provider) return;

  const data = (payload ?? {}) as Record<string, unknown>;

  if (action === "CREATE_PROJECT") {
    const project = await prisma.project.findFirst({
      where: { id: entityId, tenantId },
      include: { parent: { select: { externalProjectId: true } } },
    });
    if (!project) return;
    const parentExternalId =
      String(data.parentExternalId ?? project.parent?.externalProjectId ?? "") || null;
    const created = await provider.createProject({
      name: project.name,
      startDate: (project.startDate ?? project.createdAt).toISOString().slice(0, 10),
      customerExternalId: String(data.customerExternalId ?? project.externalCustomerId ?? "") || null,
      parentExternalId,
      description: project.description,
      location: project.location,
      reference: project.orderNumber,
    });
    await prisma.project.update({
      where: { id: project.id },
      data: {
        externalProjectId: created.externalId,
        code: project.code || created.number || project.code,
      },
    });
    return;
  }

  if (action === "UPDATE_PROJECT") {
    const project = await prisma.project.findFirst({ where: { id: entityId, tenantId } });
    if (!project?.externalProjectId) return;
    await provider.updateProject(project.externalProjectId, {
      name: project.name,
      isReadyForInvoicing: project.billingStatus === "READY" || project.billingStatus === "INVOICED",
      isClosed: project.billingStatus === "INVOICED",
      description: project.description,
    });
    return;
  }

  if (action === "UPSERT_TIME") {
    const entry = await prisma.timeEntry.findFirst({
      where: { id: entityId, tenantId },
      include: { project: true, user: { include: { tenants: true } } },
    });
    if (!entry?.project.externalProjectId) return;
    if (!canEnqueueTimesheetSync(entry.approvalStatus)) {
      throw new Error("Timer må godkjennes før Tripletex-synk");
    }
    const membership = entry.user.tenants.find((t) => t.tenantId === tenantId);
    if (!membership?.externalEmployeeId) {
      throw new Error("Ansatt er ikke koblet til Tripletex-bruker");
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        tripletexActivityNormalId: true,
        tripletexActivityOt50Id: true,
        tripletexActivityOt100Id: true,
      },
    });
    const activityId =
      entry.billingActivityId ||
      activityIdForTimeType(entry.timeType, {
        normal: tenant?.tripletexActivityNormalId,
        ot50: tenant?.tripletexActivityOt50Id,
        ot100: tenant?.tripletexActivityOt100Id,
      });
    if (!activityId) throw new Error("Timeaktivitet er ikke mappet i innstillinger");
    const result = await provider.upsertTimeEntry({
      projectExternalId: entry.project.externalProjectId,
      employeeExternalId: membership.externalEmployeeId,
      activityExternalId: activityId,
      salaryTypeExternalId: entry.salaryTypeId,
      date: entry.date.toISOString().slice(0, 10),
      hours: entry.hours,
      comment: entry.comment,
      existingExternalId: entry.externalId,
    });
    await prisma.timeEntry.update({
      where: { id: entry.id },
      data: { externalId: result.externalId, syncStatus: "SYNCED", approvalStatus: "SYNCED" },
    });
    return;
  }

  if (action === "DELETE_TIME") {
    const externalId = String(data.externalId ?? "");
    if (externalId) await provider.deleteTimeEntry(externalId);
    return;
  }

  if (action === "UPSERT_LINE") {
    const line = await prisma.projectUsageLine.findFirst({
      where: { id: entityId, tenantId },
      include: { project: true },
    });
    if (!line?.project.externalProjectId || !line.project.externalCustomerId) return;
    const result = await provider.upsertOrderLine({
      orderExternalId: line.project.externalOrderId,
      projectExternalId: line.project.externalProjectId,
      customerExternalId: line.project.externalCustomerId,
      productExternalId: line.productExternalId,
      count: line.quantity,
      description: line.comment ?? line.productName,
      unitPriceExclVat: line.unitPrice,
      existingExternalId: line.externalId,
      orderDate: new Date().toISOString().slice(0, 10),
    });
    await prisma.projectUsageLine.update({
      where: { id: line.id },
      data: { externalId: result.lineExternalId, syncStatus: "SYNCED" },
    });
    if (!line.project.externalOrderId) {
      await prisma.project.update({
        where: { id: line.projectId },
        data: { externalOrderId: result.orderExternalId },
      });
    }
    return;
  }

  if (action === "CREATE_INVOICE") {
    return;
  }

  if (action === "PULL_MASTER") {
    await pullAccountingMaster(tenantId);
    return;
  }

  if (action === "UPSERT_ABSENCE") {
    const absence = await prisma.absence.findFirst({
      where: { id: entityId, tenantId },
      include: { user: { include: { tenants: true } }, project: true },
    });
    if (!absence || absence.status !== "APPROVED") return;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        absenceProjectId: true,
        tripletexActivityNormalId: true,
      },
    });
    const project =
      absence.project ??
      (tenant?.absenceProjectId
        ? await prisma.project.findFirst({
            where: { id: tenant.absenceProjectId, tenantId },
          })
        : null);
    if (!project?.externalProjectId) {
      throw new Error("Fraværsprosjekt er ikke synket til Tripletex");
    }
    const membership = absence.user.tenants.find((t) => t.tenantId === tenantId);
    if (!membership?.externalEmployeeId) {
      throw new Error("Ansatt er ikke koblet til Tripletex-bruker");
    }
    const activityId = tenant?.tripletexActivityNormalId;
    if (!activityId) throw new Error("Timeaktivitet er ikke mappet i innstillinger");
    const hours = absence.workdays ? absence.workdays * 7.5 * ((absence.percentage || 100) / 100) : 7.5;
    const result = await provider.upsertTimeEntry({
      projectExternalId: project.externalProjectId,
      employeeExternalId: membership.externalEmployeeId,
      activityExternalId: activityId,
      salaryTypeExternalId: absence.salaryTypeExternalId,
      date: absence.startDate.toISOString().slice(0, 10),
      hours,
      comment: "Fravær",
      existingExternalId: absence.externalId,
    });
    await prisma.absence.update({
      where: { id: absence.id },
      data: { externalId: result.externalId, syncStatus: "SYNCED" },
    });
    return;
  }

  void entityType;
}

export async function processPendingOutbox(limit = 25): Promise<number> {
  const jobs = await prisma.accountingSyncJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let processed = 0;
  for (const job of jobs) {
    await processAccountingJob(job.id);
    processed += 1;
  }
  return processed;
}
