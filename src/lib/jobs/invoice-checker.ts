import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { 
  checkOverdueInvoices, 
  sendTrialExpiringReminders,
  syncInvoicesWithFiken 
} from "@/server/actions/invoice.actions";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Opprett queue for faktura-sjekk
export const invoiceQueue = new Queue("invoice-check", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

// Worker som prosesserer jobber
export const invoiceWorker = new Worker(
  "invoice-check",
  async (job) => {
    console.log(`[Invoice Checker] Starting job ${job.id} (${job.name})...`);
    
    try {
      if (job.name === "check-overdue") {
        // Sjekk forfalte fakturaer og suspender
        const result = await checkOverdueInvoices();
        
        if (result.success) {
          console.log(`[Invoice Checker] Suspended ${result.suspended} tenants`);
          return { success: true, suspended: result.suspended };
        } else {
          console.error(`[Invoice Checker] Error:`, result.error);
          throw new Error(result.error);
        }
      } else if (job.name === "trial-expiring-reminders") {
        // Send påminnelser om prøveperiode som utløper
        const result = await sendTrialExpiringReminders();
        
        if (result.success) {
          console.log(`[Invoice Checker] Sent ${result.sent} trial expiring reminders`);
          return { success: true, sent: result.sent };
        } else {
          console.error(`[Invoice Checker] Error:`, result.error);
          throw new Error(result.error);
        }
      } else if (job.name === "sync-fiken-morning" || job.name === "sync-fiken-afternoon" || job.name === "sync-fiken-evening") {
        // Synkroniser betalingsstatus fra Fiken (3 ganger daglig)
        const result = await syncInvoicesWithFiken();
        
        if (result.success) {
          console.log(`[Invoice Checker] Synced ${result.updated} invoices from Fiken, reactivated ${result.reactivated} tenants`);
          return { success: true, updated: result.updated, reactivated: result.reactivated };
        } else {
          console.error(`[Invoice Checker] Error:`, result.error);
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error(`[Invoice Checker] Failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1,
  }
);

// Schedule daglige jobber
export async function scheduleInvoiceCheck() {
  try {
    // Slett eksisterende repeatable jobs
    const repeatableJobs = await invoiceQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await invoiceQueue.removeRepeatableByKey(job.key);
    }

    // 1. Sjekk forfalte fakturaer hver dag kl 02:00
    await invoiceQueue.add(
      "check-overdue",
      {},
      {
        repeat: {
          pattern: "0 2 * * *", // Cron: Hver dag kl 02:00
        },
      }
    );

    // 2. Send påminnelser om prøveperiode som utløper hver dag kl 10:00
    await invoiceQueue.add(
      "trial-expiring-reminders",
      {},
      {
        repeat: {
          pattern: "0 10 * * *", // Cron: Hver dag kl 10:00
        },
      }
    );

    // 3. Synkroniser med Fiken 3 ganger per dag
    // Morgen (08:00), Ettermiddag (14:00), Kveld (20:00)
    await invoiceQueue.add(
      "sync-fiken-morning",
      {},
      {
        repeat: {
          pattern: "0 8 * * *", // Cron: Kl 08:00
        },
      }
    );

    await invoiceQueue.add(
      "sync-fiken-afternoon",
      {},
      {
        repeat: {
          pattern: "0 14 * * *", // Cron: Kl 14:00
        },
      }
    );

    await invoiceQueue.add(
      "sync-fiken-evening",
      {},
      {
        repeat: {
          pattern: "0 20 * * *", // Cron: Kl 20:00
        },
      }
    );

    console.log("[Invoice Checker] Scheduled jobs:");
    console.log("  - Overdue check: 02:00 (daily)");
    console.log("  - Trial expiring reminders: 10:00 (daily)");
    console.log("  - Fiken sync: 08:00, 14:00, 20:00 (3x daily)");
  } catch (error) {
    console.error("[Invoice Checker] Failed to schedule:", error);
  }
}

// Event listeners
invoiceWorker.on("completed", (job) => {
  console.log(`[Invoice Checker] Job ${job.id} completed`);
});

invoiceWorker.on("failed", (job, err) => {
  console.error(`[Invoice Checker] Job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await invoiceWorker.close();
  await invoiceQueue.close();
  connection.disconnect();
});

