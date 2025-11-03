import { scheduleInvoiceCheck, invoiceWorker } from "./invoice-checker";

/**
 * Initialiser alle scheduled jobs
 * Kjøres når serveren starter
 */
export async function initializeJobs() {
  console.log("[Jobs] Initializing scheduled jobs...");

  try {
    // Start invoice checker
    await scheduleInvoiceCheck();
    
    console.log("[Jobs] All jobs initialized successfully");
  } catch (error) {
    console.error("[Jobs] Failed to initialize jobs:", error);
  }
}

// Export workers for cleanup
export { invoiceWorker };

