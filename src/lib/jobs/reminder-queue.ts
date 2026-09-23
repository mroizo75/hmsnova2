import { Queue, Worker } from "bullmq";
import { syncReminderWorkflows, dispatchDueReminders } from "@/lib/workflows/reminder-workflow";
import { createJobsRedis } from "@/lib/jobs/redis";

const redisConnection = createJobsRedis();

export const reminderQueue = new Queue("reminder-workflow", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const reminderWorker = new Worker(
  "reminder-workflow",
  async (job) => {
    switch (job.name) {
      case "sync-upcoming-reminders": {
        const result = await syncReminderWorkflows();
        return { created: result.created };
      }
      case "dispatch-reminders": {
        const result = await dispatchDueReminders();
        return result;
      }
      default:
        throw new Error(`Unknown reminder job: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

export async function scheduleReminderJobs() {
  const repeatable = await reminderQueue.getRepeatableJobs();
  for (const job of repeatable) {
    await reminderQueue.removeRepeatableByKey(job.key);
  }

  await reminderQueue.add(
    "sync-upcoming-reminders",
    {},
    {
      repeat: {
        pattern: process.env.REMINDER_SYNC_CRON || "0 5,17 * * *",
      },
      jobId: "sync-upcoming-reminders",
    }
  );

  const dispatchIntervalMs = Number(process.env.REMINDER_DISPATCH_INTERVAL_MS || 1000 * 60 * 30);
  await reminderQueue.add(
    "dispatch-reminders",
    {},
    {
      repeat: {
        every: dispatchIntervalMs,
      },
      jobId: "dispatch-reminders",
    }
  );
}

reminderWorker.on("completed", (job) => {
  console.log(`[Reminder Queue] Job ${job.name} (${job.id}) completed.`);
});

reminderWorker.on("failed", (job, err) => {
  console.error(`[Reminder Queue] Job ${job?.name} (${job?.id}) failed:`, err);
});

process.on("SIGTERM", async () => {
  await reminderWorker.close();
  await reminderQueue.close();
  redisConnection.disconnect();
});

