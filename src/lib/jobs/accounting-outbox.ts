import { Queue, Worker } from "bullmq";
import { processAccountingJob, processPendingOutbox, pullAccountingMaster } from "@/lib/accounting/sync";
import { nextRetryDelayMs } from "@/lib/accounting/outbox";
import { prisma } from "@/lib/db";
import { isAccountingEnabled } from "@/lib/accounting/factory";
import { createJobsRedis, isJobsRedisConfigured } from "@/lib/jobs/redis";

let queue: Queue | null = null;
let worker: Worker | null = null;

function getAccountingQueue(): Queue | null {
  if (!isJobsRedisConfigured()) return null;
  if (queue) return queue;
  const connection = createJobsRedis();
  queue = new Queue("accounting-outbox", {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  queue.on("error", () => undefined);
  return queue;
}

function getAccountingWorker(): Worker | null {
  if (!isJobsRedisConfigured()) return null;
  if (worker) return worker;
  const connection = createJobsRedis();
  worker = new Worker(
    "accounting-outbox",
    async (job) => {
      if (job.name === "process-job") {
        return processAccountingJob(String(job.data.jobId));
      }
      if (job.name === "drain-pending") {
        return { processed: await processPendingOutbox(50) };
      }
      if (job.name === "nightly-reconcile") {
        return nightlyReconcile();
      }
      throw new Error(`Unknown accounting job: ${job.name}`);
    },
    { connection, concurrency: 2 }
  );
  worker.on("error", () => undefined);
  return worker;
}

export async function enqueueOutboxJob(jobId: string, delayMs = 0): Promise<void> {
  const accountingQueue = getAccountingQueue();
  if (!accountingQueue) return;
  await accountingQueue.add(
    "process-job",
    { jobId },
    { jobId: `accounting-${jobId}-${Date.now()}`, delay: delayMs }
  );
}

export async function scheduleAccountingJobs() {
  const accountingQueue = getAccountingQueue();
  getAccountingWorker();
  if (!accountingQueue) return;

  const repeatable = await accountingQueue.getRepeatableJobs();
  for (const job of repeatable) {
    await accountingQueue.removeRepeatableByKey(job.key);
  }

  await accountingQueue.add(
    "drain-pending",
    {},
    {
      repeat: { every: 60_000 },
      jobId: "accounting-drain-pending",
    }
  );

  await accountingQueue.add(
    "nightly-reconcile",
    {},
    {
      repeat: { pattern: "17 3 * * *" },
      jobId: "accounting-nightly-reconcile",
    }
  );
}

async function nightlyReconcile() {
  const tenants = await prisma.tenant.findMany({
    where: { accountingProvider: { not: "NONE" } },
    select: { id: true, accountingProvider: true },
  });

  let pulled = 0;
  for (const tenant of tenants) {
    if (!isAccountingEnabled(tenant.accountingProvider)) continue;
    await pullAccountingMaster(tenant.id);
    pulled += 1;
  }

  await processPendingOutbox(100);
  return { tenants: pulled };
}

export const accountingQueue = {
  get instance() {
    return getAccountingQueue();
  },
};

export const accountingWorker = {
  get instance() {
    return getAccountingWorker();
  },
};

export { upsertContacts, upsertCustomers, upsertProducts, upsertSalaryTypes } from "@/lib/accounting/cache";
export { nextRetryDelayMs };
