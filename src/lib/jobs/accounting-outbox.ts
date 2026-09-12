import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { processAccountingJob, processPendingOutbox, pullAccountingMaster } from "@/lib/accounting/sync";
import { nextRetryDelayMs } from "@/lib/accounting/outbox";
import { prisma } from "@/lib/db";
import { isAccountingEnabled } from "@/lib/accounting/factory";

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

export const accountingQueue = new Queue("accounting-outbox", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const accountingWorker = new Worker(
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
  { connection: redisConnection, concurrency: 2 }
);

export async function enqueueOutboxJob(jobId: string, delayMs = 0) {
  await accountingQueue.add(
    "process-job",
    { jobId },
    { jobId: `accounting-${jobId}-${Date.now()}`, delay: delayMs }
  );
}

export async function scheduleAccountingJobs() {
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

export { upsertContacts, upsertCustomers, upsertProducts, upsertSalaryTypes } from "@/lib/accounting/cache";
export { nextRetryDelayMs };
