import { prisma } from "@/lib/db";
import type { OutboxAction } from "./outbox";
import { ACCOUNTING_OUTBOX_MAX_ATTEMPTS, shouldMarkSyncError } from "./outbox";
import { getAccountingProvider, isAccountingEnabled } from "./factory";
import type { AccountingProvider } from "./provider";
import { activityIdForTimeType, pickDefaultTimesheetActivities } from "./timesheet";
import { canEnqueueTimesheetSync } from "@/lib/time/approval";
import { pickTripletexEmployeeId } from "./employee-map";
import { upsertActivities, upsertContacts, upsertCustomers, upsertProducts, upsertSalaryTypes, replaceProductGroups } from "./cache";
import { upsertPulledProjects } from "./project-pull";
import { kmProductExternalId, pickDefaultKmProducts } from "@/lib/time/km-product";
import { earliestIsoDate, isoDateOnly, projectStartNeedsMove } from "./tripletex/project-payload";

export async function pullAccountingMaster(tenantId: string): Promise<void> {
  const provider = await getAccountingProvider(tenantId);
  if (!provider) return;

  const [customers, products, salaryTypes, contacts, projects, activities, groups, members] = await Promise.all([
    provider.listCustomers().catch(() => []),
    provider.listProducts().catch(() => []),
    provider.listSalaryTypes().catch(() => []),
    provider.listContacts().catch(() => []),
    provider.listProjects().catch(() => []),
    provider.listActivities().catch(() => []),
    provider.listProductGroups().catch(() => []),
    provider.listProductGroupMembers().catch(() => []),
  ]);
  await upsertCustomers(tenantId, customers);
  await upsertProducts(tenantId, products);
  await upsertSalaryTypes(tenantId, salaryTypes);
  await upsertContacts(tenantId, contacts);
  await upsertActivities(tenantId, activities);
  await replaceProductGroups(tenantId, groups, members);
  await upsertPulledProjects(tenantId, projects);
  if (projects.length > 0) {
    lastProjectPullAt.set(tenantId, Date.now());
    await closePulledProjects(tenantId, provider);
  }
  await ensureDefaultKmProducts(tenantId);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { accountingLastPullAt: new Date() },
  });
}

const catalogPulls = new Map<string, Promise<void>>();

export async function pullAccountingCatalog(tenantId: string): Promise<void> {
  const provider = await getAccountingProvider(tenantId);
  if (!provider) return;

  const [customers, products, salaryTypes, contacts, activities, groups, members] = await Promise.all([
    provider.listCustomers().catch(() => []),
    provider.listProducts().catch(() => []),
    provider.listSalaryTypes().catch(() => []),
    provider.listContacts().catch(() => []),
    provider.listActivities().catch(() => []),
    provider.listProductGroups().catch(() => []),
    provider.listProductGroupMembers().catch(() => []),
  ]);
  await upsertCustomers(tenantId, customers);
  await upsertProducts(tenantId, products);
  await upsertSalaryTypes(tenantId, salaryTypes);
  await upsertContacts(tenantId, contacts);
  await upsertActivities(tenantId, activities);
  await replaceProductGroups(tenantId, groups, members);
  await ensureDefaultKmProducts(tenantId);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { accountingLastPullAt: new Date() },
  });
}

/** Hent produkter/kunder på nytt hvis cachen er tom eller eldre enn maxAgeMs. */
export async function refreshAccountingCatalogIfStale(
  tenantId: string,
  maxAgeMs = 120_000
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { accountingProvider: true, accountingLastPullAt: true },
  });
  if (!tenant || !isAccountingEnabled(tenant.accountingProvider)) return;

  const productCount = await prisma.accountingProduct.count({
    where: { tenantId, isInactive: false },
  });
  const stale =
    productCount === 0 ||
    !tenant.accountingLastPullAt ||
    Date.now() - tenant.accountingLastPullAt.getTime() >= maxAgeMs;
  if (!stale) return;

  const existing = catalogPulls.get(tenantId);
  if (existing) {
    await existing;
    return;
  }
  const run = pullAccountingCatalog(tenantId).finally(() => {
    catalogPulls.delete(tenantId);
  });
  catalogPulls.set(tenantId, run);
  await run;
}

const projectPulls = new Map<string, Promise<void>>();
const lastProjectPullAt = new Map<string, number>();

/** Hent prosjekter og underprosjekter fra Tripletex (master) og oppdater NOVA. */
export async function pullAccountingProjects(tenantId: string): Promise<void> {
  const provider = await getAccountingProvider(tenantId);
  if (!provider) return;
  const projects = await provider.listProjects();
  await upsertPulledProjects(tenantId, projects);
  await closePulledProjects(tenantId, provider);
  lastProjectPullAt.set(tenantId, Date.now());
}

/** Prosjekt som er avsluttet i Tripletex skal ikke kunne stemples på. Tom liste betyr at kallet feilet eller at ingen er avsluttet. */
async function closePulledProjects(tenantId: string, provider: AccountingProvider): Promise<void> {
  const closedIds = await provider.listClosedProjectIds().catch(() => [] as string[]);
  const chunkSize = 500;
  for (let index = 0; index < closedIds.length; index += chunkSize) {
    const chunk = closedIds.slice(index, index + chunkSize);
    await prisma.project.updateMany({
      where: {
        tenantId,
        externalProjectId: { in: chunk },
        isAbsenceProject: false,
        status: { in: ["ACTIVE", "PLANNING"] },
      },
      data: { status: "COMPLETED" },
    });
  }
}

/**
 * Synk prosjekter når timeregistreringen åpnes. Throttles per tenant (per server-instans)
 * så dato-bytte og produktsøk ikke trigger nye API-kall hele tiden.
 */
export async function refreshAccountingProjectsIfStale(
  tenantId: string,
  maxAgeMs = 60_000,
  options: { force?: boolean } = {}
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { accountingProvider: true },
  });
  if (!tenant || !isAccountingEnabled(tenant.accountingProvider)) return;

  const last = lastProjectPullAt.get(tenantId);
  if (!options.force && last && Date.now() - last < maxAgeMs) return;

  const existing = projectPulls.get(tenantId);
  if (existing) {
    await existing;
    return;
  }
  const run = pullAccountingProjects(tenantId).finally(() => {
    projectPulls.delete(tenantId);
  });
  projectPulls.set(tenantId, run);
  await run;
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

  await processAccountingJob(job.id).catch(() => undefined);
}

/** Kjør eksisterende jobb på nytt — uten å lage en ny rad i synk-loggen. */
export async function requeueAccountingJob(jobId: string): Promise<{ ok: boolean; error?: string }> {
  const job = await prisma.accountingSyncJob.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, error: "Jobb ikke funnet" };
  if (job.status === "SYNCED") return { ok: true };

  await prisma.accountingSyncJob.update({
    where: { id: jobId },
    data: { status: "PENDING", lastError: null },
  });

  return processAccountingJob(jobId);
}

export async function ensureProjectSyncedToAccounting(
  tenantId: string,
  projectId: string
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: { id: true, externalProjectId: true },
  });
  if (!project || project.externalProjectId) return;

  const existing = await prisma.accountingSyncJob.findFirst({
    where: {
      tenantId,
      entityId: projectId,
      action: "CREATE_PROJECT",
      status: { in: ["PENDING", "ERROR"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await processAccountingJob(existing.id);
    return;
  }

  await enqueueAccountingJob({
    tenantId,
    entityType: "Project",
    entityId: projectId,
    action: "CREATE_PROJECT",
    payload: {},
  });
}

export async function syncProjectToAccounting(tenantId: string, projectId: string): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: { externalProjectId: true, externalCustomerId: true },
  });
  if (!project) return;
  await enqueueAccountingJob({
    tenantId,
    entityType: "Project",
    entityId: projectId,
    action: project.externalProjectId ? "UPDATE_PROJECT" : "CREATE_PROJECT",
    payload: { customerExternalId: project.externalCustomerId },
  });
}

async function processFollowUpJobsForProject(tenantId: string, projectId: string): Promise<void> {
  const [entries, lines] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { tenantId, projectId, approvalStatus: { in: ["APPROVED", "SYNC_ERROR"] } },
      select: { id: true },
    }),
    prisma.projectUsageLine.findMany({
      where: { tenantId, projectId, syncStatus: { in: ["PENDING", "ERROR"] } },
      select: { id: true },
    }),
  ]);
  const entityIds = [...entries.map((row) => row.id), ...lines.map((row) => row.id)];
  if (entityIds.length === 0) return;

  const jobs = await prisma.accountingSyncJob.findMany({
    where: {
      tenantId,
      entityId: { in: entityIds },
      action: { in: ["UPSERT_TIME", "UPSERT_LINE"] },
      status: { in: ["PENDING", "ERROR"] },
    },
    orderBy: { createdAt: "asc" },
  });
  for (const job of jobs) {
    await processAccountingJob(job.id);
  }
}

async function resolveAndPersistEmployeeId(input: {
  tenantId: string;
  membershipId?: string;
  mappedId?: string | null;
  email?: string | null;
  employeeNumber?: string | null;
  provider: AccountingProvider;
}): Promise<string | null> {
  const [employees, who, mapped] = await Promise.all([
    input.provider.listEmployees().catch(() => []),
    input.provider.testConnection().catch(() => null),
    prisma.userTenant.findMany({
      where: { tenantId: input.tenantId, NOT: { externalEmployeeId: null } },
      select: { externalEmployeeId: true, id: true },
    }),
  ]);
  const alreadyMappedIds = mapped
    .filter((row) => row.id !== input.membershipId)
    .map((row) => row.externalEmployeeId)
    .filter((value): value is string => Boolean(value));
  const id = pickTripletexEmployeeId({
    mappedId: input.mappedId,
    email: input.email,
    employeeNumber: input.employeeNumber,
    employees,
    tokenEmployeeId: who?.employeeId,
    alreadyMappedIds,
  });
  if (id && input.membershipId && id !== input.mappedId) {
    await prisma.userTenant.update({
      where: { id: input.membershipId },
      data: { externalEmployeeId: id },
    });
  }
  return id;
}

export async function ensureDefaultTimesheetActivities(
  tenantId: string,
  provider: AccountingProvider
): Promise<{ normal: string | null; ot50: string | null; ot100: string | null }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      tripletexActivityNormalId: true,
      tripletexActivityOt50Id: true,
      tripletexActivityOt100Id: true,
    },
  });
  if (tenant?.tripletexActivityNormalId) {
    return {
      normal: tenant.tripletexActivityNormalId,
      ot50: tenant.tripletexActivityOt50Id,
      ot100: tenant.tripletexActivityOt100Id,
    };
  }

  const activities = await provider.listActivities().catch(() => []);
  const picked = pickDefaultTimesheetActivities(activities);
  if (!picked.normal) {
    return { normal: null, ot50: null, ot100: null };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      tripletexActivityNormalId: picked.normal,
      tripletexActivityOt50Id: tenant?.tripletexActivityOt50Id || picked.ot50,
      tripletexActivityOt100Id: tenant?.tripletexActivityOt100Id || picked.ot100,
    },
  });
  return {
    normal: picked.normal,
    ot50: tenant?.tripletexActivityOt50Id || picked.ot50,
    ot100: tenant?.tripletexActivityOt100Id || picked.ot100,
  };
}

export async function ensureDefaultSalaryTypes(tenantId: string): Promise<{
  normal: string | null;
  ot50: string | null;
  ot100: string | null;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      tripletexSalaryNormalId: true,
      tripletexSalaryOt50Id: true,
      tripletexSalaryOt100Id: true,
    },
  });
  if (tenant?.tripletexSalaryNormalId) {
    return {
      normal: tenant.tripletexSalaryNormalId,
      ot50: tenant.tripletexSalaryOt50Id,
      ot100: tenant.tripletexSalaryOt100Id,
    };
  }
  const salaryTypes = await prisma.accountingSalaryType.findMany({
    where: { tenantId, isInactive: false },
    select: { externalId: true, name: true },
  });
  const picked = pickDefaultTimesheetActivities(salaryTypes);
  if (!picked.normal) return { normal: null, ot50: null, ot100: null };
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      tripletexSalaryNormalId: picked.normal,
      tripletexSalaryOt50Id: picked.ot50,
      tripletexSalaryOt100Id: picked.ot100,
    },
  });
  return picked;
}

async function projectManagerExternalId(tenantId: string, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const row = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { externalEmployeeId: true },
  });
  return row?.externalEmployeeId ?? null;
}

export async function ensureDefaultKmProducts(
  tenantId: string
): Promise<{ taxable: string | null; nonTaxable: string | null }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      tripletexProductKmId: true,
      tripletexProductKmNonTaxableId: true,
    },
  });
  if (tenant?.tripletexProductKmId) {
    return {
      taxable: tenant.tripletexProductKmId,
      nonTaxable: tenant.tripletexProductKmNonTaxableId,
    };
  }

  const products = await prisma.accountingProduct.findMany({
    where: { tenantId, isInactive: false },
    select: { externalId: true, name: true, unit: true },
    take: 400,
  });
  const picked = pickDefaultKmProducts(products);
  if (!picked.taxable) {
    return { taxable: null, nonTaxable: null };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      tripletexProductKmId: picked.taxable,
      tripletexProductKmNonTaxableId: tenant?.tripletexProductKmNonTaxableId || picked.nonTaxable,
    },
  });
  return {
    taxable: picked.taxable,
    nonTaxable: tenant?.tripletexProductKmNonTaxableId || picked.nonTaxable,
  };
}

async function earliestLocalProjectDate(tenantId: string, projectId: string): Promise<Date | null> {
  const [time, usage] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { tenantId, projectId },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    prisma.projectUsageLine.findFirst({
      where: { tenantId, projectId },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);
  const iso = earliestIsoDate([time?.date, usage?.date]);
  return iso ? new Date(`${iso}T12:00:00`) : null;
}

async function ensureProjectCoversDate(
  provider: AccountingProvider,
  input: { tenantId: string; projectId: string; projectExternalId: string; dateIso: string }
): Promise<void> {
  const dateIso = isoDateOnly(input.dateIso);
  const remote = await provider.getProject(input.projectExternalId).catch(() => null);
  if (!projectStartNeedsMove(remote?.startDate, dateIso)) return;
  await provider.updateProject(input.projectExternalId, { startDate: dateIso });
  await prisma.project.updateMany({
    where: { id: input.projectId, tenantId: input.tenantId },
    data: { startDate: new Date(`${dateIso}T12:00:00`) },
  });
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
        data:
          status === "ERROR"
            ? { syncStatus: "ERROR", approvalStatus: "SYNC_ERROR" }
            : { syncStatus: "PENDING" },
      });
    }
    if (job.action === "UPSERT_LINE") {
      await prisma.projectUsageLine.updateMany({
        where: { id: job.entityId, tenantId: job.tenantId },
        data: { syncStatus: status === "ERROR" ? "ERROR" : "PENDING" },
      });
    }
    if (job.action === "UPSERT_ABSENCE") {
      await prisma.absence.updateMany({
        where: { id: job.entityId, tenantId: job.tenantId },
        data: { syncStatus: status === "ERROR" ? "ERROR" : "PENDING" },
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
  if (!provider) {
    throw new Error("Regnskapssystem er ikke aktivert");
  }

  const data = (payload ?? {}) as Record<string, unknown>;

  if (action === "CREATE_PROJECT") {
    const project = await prisma.project.findFirst({
      where: { id: entityId, tenantId },
      include: { parent: { select: { externalProjectId: true } } },
    });
    if (!project) return;
    if (project.parentId && project.parentId !== project.id && !project.parent?.externalProjectId) {
      await ensureProjectSyncedToAccounting(tenantId, project.parentId);
    }
    const parentAfter = project.parentId
      ? await prisma.project.findFirst({
          where: { id: project.parentId, tenantId },
          select: { externalProjectId: true },
        })
      : null;
    const parentExternalId =
      String(data.parentExternalId ?? parentAfter?.externalProjectId ?? project.parent?.externalProjectId ?? "") || null;
    const firstWork = await earliestLocalProjectDate(tenantId, project.id);
    const startDate =
      earliestIsoDate([project.startDate, project.createdAt, firstWork]) ??
      isoDateOnly(new Date());
    const managerExternalId = await projectManagerExternalId(tenantId, project.projectManagerId);
    const created = await provider.createProject({
      name: project.name,
      startDate,
      customerExternalId: String(data.customerExternalId ?? project.externalCustomerId ?? "") || null,
      parentExternalId,
      contactExternalId: project.contactExternalId,
      projectManagerExternalId: managerExternalId,
      description: project.description,
      location: project.location,
      reference: project.orderNumber,
    });
    await prisma.project.update({
      where: { id: project.id },
      data: {
        externalProjectId: created.externalId,
        code: project.code || created.number || project.code,
        startDate: new Date(`${startDate}T12:00:00`),
      },
    });
    const tenantTemplate = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tripletexTemplateProjectExternalId: true },
    });
    const templateId = String(data.priceTemplateExternalId ?? tenantTemplate?.tripletexTemplateProjectExternalId ?? "");
    if (templateId && templateId !== created.externalId) {
      await provider.copyProjectPricing(templateId, created.externalId);
    }
    await processFollowUpJobsForProject(tenantId, project.id).catch(() => undefined);
    return;
  }

  if (action === "UPDATE_PROJECT") {
    const project = await prisma.project.findFirst({
      where: { id: entityId, tenantId },
      include: { parent: { select: { externalProjectId: true } } },
    });
    if (!project?.externalProjectId) return;
    const firstWork = await earliestLocalProjectDate(tenantId, project.id);
    const startDate = earliestIsoDate([project.startDate, firstWork, project.createdAt]);
    const managerExternalId = await projectManagerExternalId(tenantId, project.projectManagerId);
    await provider.updateProject(project.externalProjectId, {
      name: project.name,
      startDate: startDate ?? undefined,
      endDate: project.endDate ? isoDateOnly(project.endDate) : null,
      description: project.description,
      reference: project.orderNumber,
      isReadyForInvoicing: project.billingStatus === "READY" || project.billingStatus === "INVOICED",
      isClosed: project.billingStatus === "INVOICED" || project.status === "COMPLETED" || project.status === "ARCHIVED",
      customerExternalId: project.externalCustomerId,
      parentExternalId: project.parent?.externalProjectId ?? null,
      contactExternalId: project.contactExternalId,
      projectManagerExternalId: managerExternalId,
    });
    return;
  }

  if (action === "UPSERT_TIME") {
    const entry = await prisma.timeEntry.findFirst({
      where: { id: entityId, tenantId },
      include: { project: true, user: { include: { tenants: true } } },
    });
    if (!entry) return;
    if (!entry.project.externalProjectId) {
      throw new Error("Prosjektet er ikke synket til Tripletex ennå");
    }
    if (!canEnqueueTimesheetSync(entry.approvalStatus)) {
      throw new Error("Timer må godkjennes før Tripletex-synk");
    }
    const membership = entry.user.tenants.find((t) => t.tenantId === tenantId);
    const employeeExternalId = await resolveAndPersistEmployeeId({
      tenantId,
      membershipId: membership?.id,
      mappedId: membership?.externalEmployeeId,
      email: entry.user.email,
      employeeNumber: membership?.employeeNumber,
      provider,
    });
    if (!employeeExternalId) {
      throw new Error("Ansatt er ikke koblet til Tripletex-bruker");
    }
    const mapping = await ensureDefaultTimesheetActivities(tenantId, provider);
    const salary = await ensureDefaultSalaryTypes(tenantId);
    const activityId =
      entry.billingActivityId ||
      activityIdForTimeType(entry.timeType, mapping);
    if (!activityId) throw new Error("Timeaktivitet er ikke mappet i innstillinger");
    const salaryTypeId = entry.salaryTypeId || activityIdForTimeType(entry.timeType, salary);
    const dateIso = entry.date.toISOString().slice(0, 10);
    await ensureProjectCoversDate(provider, {
      tenantId,
      projectId: entry.projectId,
      projectExternalId: entry.project.externalProjectId,
      dateIso,
    });
    const result = await provider.upsertTimeEntry({
      projectExternalId: entry.project.externalProjectId,
      employeeExternalId,
      activityExternalId: activityId,
      salaryTypeExternalId: salaryTypeId,
      date: dateIso,
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
    if (!line?.project.externalProjectId || !line.project.externalCustomerId) {
      throw new Error("Prosjekt mangler Tripletex-kunde eller prosjekt-ID for varelinje");
    }
    let productExternalId = line.productExternalId;
    let productName = line.productName;
    if (line.kind === "KM") {
      const mapping = await ensureDefaultKmProducts(tenantId);
      const resolved =
        kmProductExternalId({
          kmTaxable: line.kmTaxable,
          taxableProductId: mapping.taxable,
          nonTaxableProductId: mapping.nonTaxable,
        }) || mapping.taxable;
      if (resolved && resolved !== productExternalId) {
        productExternalId = resolved;
        const product = await prisma.accountingProduct.findUnique({
          where: { tenantId_externalId: { tenantId, externalId: resolved } },
          select: { name: true },
        });
        if (product?.name) productName = product.name;
        await prisma.projectUsageLine.update({
          where: { id: line.id },
          data: { productExternalId, productName },
        });
      }
    }
    const carLabel = line.kind === "KM" ? (line.isPrivateCar ? "privatbil" : "firmabil") : null;
    const orderDate = line.date.toISOString().slice(0, 10);
    await ensureProjectCoversDate(provider, {
      tenantId,
      projectId: line.projectId,
      projectExternalId: line.project.externalProjectId,
      dateIso: orderDate,
    });
    const result = await provider.upsertOrderLine({
      projectExternalId: line.project.externalProjectId,
      customerExternalId: line.project.externalCustomerId,
      productExternalId,
      count: line.quantity,
      description:
        line.comment ||
        (carLabel
          ? `${productName} · ${line.quantity} km · ${carLabel}${line.fromAddress ? ` · ${line.fromAddress}–${line.toAddress ?? ""}` : ""}`
          : productName),
      unitPriceExclVat: line.unitPrice,
      existingExternalId: line.externalId,
      orderDate,
    });
    let travelExternalId = line.travelExternalId;
    if (line.kind === "KM" && line.isPrivateCar && !travelExternalId) {
      if (!line.fromAddress || !line.toAddress) {
        throw new Error("Kjøring med privatbil krever fra- og til-adresse");
      }
      const user = await prisma.user.findUnique({
        where: { id: line.userId },
        include: { tenants: true },
      });
      const membership = user?.tenants.find((row) => row.tenantId === tenantId);
      const employeeExternalId = await resolveAndPersistEmployeeId({
        tenantId,
        membershipId: membership?.id,
        mappedId: membership?.externalEmployeeId,
        email: user?.email,
        employeeNumber: membership?.employeeNumber,
        provider,
      });
      if (!employeeExternalId) throw new Error("Ansatt er ikke koblet til Tripletex-bruker");
      const tenantRate = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tripletexMileageRateTypeId: true },
      });
      const travel = await provider.createMileageAllowance({
        employeeExternalId,
        projectExternalId: line.project.externalProjectId,
        date: orderDate,
        km: line.quantity,
        fromAddress: line.fromAddress,
        toAddress: line.toAddress,
        rateTypeExternalId: tenantRate?.tripletexMileageRateTypeId,
      });
      travelExternalId = travel.externalId;
      if (!tenantRate?.tripletexMileageRateTypeId) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { tripletexMileageRateTypeId: travel.rateTypeExternalId },
        });
      }
    }
    await prisma.projectUsageLine.update({
      where: { id: line.id },
      data: { externalId: result.lineExternalId, travelExternalId, syncStatus: "SYNCED" },
    });
    return;
  }

  if (action === "CREATE_INVOICE") {
    throw new Error("Faktura opprettes fra jobben når den faktureres, ikke for hver dag");
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
        absencePayrollTypes: true,
      },
    });
    const { shouldSyncAbsenceToPayroll } = await import("@/lib/time/absence-payroll");
    if (!shouldSyncAbsenceToPayroll(absence.type, tenant?.absencePayrollTypes)) {
      await prisma.absence.update({
        where: { id: absence.id },
        data: { syncStatus: "IDLE" },
      });
      return;
    }
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
    const employeeExternalId = await resolveAndPersistEmployeeId({
      tenantId,
      membershipId: membership?.id,
      mappedId: membership?.externalEmployeeId,
      email: absence.user.email,
      employeeNumber: membership?.employeeNumber,
      provider,
    });
    if (!employeeExternalId) {
      throw new Error("Ansatt er ikke koblet til Tripletex-bruker");
    }
    const mapping = await ensureDefaultTimesheetActivities(tenantId, provider);
    const activityId = mapping.normal;
    if (!activityId) throw new Error("Timeaktivitet er ikke mappet i innstillinger");
    const dateIso = absence.startDate.toISOString().slice(0, 10);
    await ensureProjectCoversDate(provider, {
      tenantId,
      projectId: project.id,
      projectExternalId: project.externalProjectId,
      dateIso,
    });
    const hours = absence.workdays ? absence.workdays * 7.5 * ((absence.percentage || 100) / 100) : 7.5;
    const result = await provider.upsertTimeEntry({
      projectExternalId: project.externalProjectId,
      employeeExternalId,
      activityExternalId: activityId,
      salaryTypeExternalId: absence.salaryTypeExternalId,
      date: dateIso,
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
