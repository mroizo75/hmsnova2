import { scheduleInvoiceCheck } from "./invoice-checker";
import { scheduleReminderJobs } from "./reminder-queue";
import { scheduleAccountingJobs } from "./accounting-outbox";

/**
 * Initialiser alle scheduled jobs
 * Kjøres når serveren starter
 */
export async function initializeJobs() {
  try {
    await Promise.all([
      scheduleInvoiceCheck(),
      scheduleReminderJobs(),
      scheduleAccountingJobs(),
    ]);
  } catch {
    // Redis kan mangle lokalt
  }
}
