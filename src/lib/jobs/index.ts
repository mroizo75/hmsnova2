import { scheduleInvoiceCheck, invoiceWorker } from "./invoice-checker";
import { scheduleReminderJobs, reminderWorker } from "./reminder-queue";
import { scheduleAccountingJobs, accountingWorker } from "./accounting-outbox";

/**
 * Initialiser alle scheduled jobs
 * Kjøres når serveren starter
 */
export async function initializeJobs() {
  console.log("[Jobs] Initializing scheduled jobs...");

  try {
    await Promise.all([
      scheduleInvoiceCheck(),
      scheduleReminderJobs(),
      scheduleAccountingJobs(),
    ]);

    console.log("[Jobs] All jobs initialized successfully");
  } catch (error) {
    console.error("[Jobs] Failed to initialize jobs:", error);
  }
}

export { invoiceWorker, reminderWorker, accountingWorker };
