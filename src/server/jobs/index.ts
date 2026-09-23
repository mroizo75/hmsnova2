/**
 * CRON JOBS - SMART SDS-SJEKK
 * 
 * Intelligent scheduling basert på prioritet:
 * - Mandag: CMR-substanser
 * - Tirsdag: SVHC-stoffer
 * - Onsdag: Høy faregrad
 * - Torsdag: Medium faregrad (kvartalsvis)
 * - Fredag: Lav risiko (årlig)
 */

import { Queue, Worker } from "bullmq";
import { weeklySDSVersionCheck } from "./weekly-sds-check";
import { createJobsRedis } from "@/lib/jobs/redis";

const connection = createJobsRedis();

// Opprett queue
export const sdsQueue = new Queue("sds-automation", { connection });

/**
 * Registrer DAGLIG SDS-sjekk (med intelligent prioritering)
 * Kjøres hver dag kl 03:00 (sjekker forskjellige prioriteter hver dag)
 */
export async function scheduleSmartSDSCheckJob() {
  await sdsQueue.add(
    "smart-sds-check",
    {},
    {
      repeat: {
        pattern: "0 3 * * *", // Hver dag kl 03:00
      },
    }
  );

  console.log("✅ Smart SDS-sjekk er planlagt (daglig kl 03:00)");
  console.log("   - Mandag: CMR-substanser");
  console.log("   - Tirsdag: SVHC-stoffer");
  console.log("   - Onsdag: Høy faregrad");
  console.log("   - Torsdag: Medium faregrad (kvartalsvis)");
  console.log("   - Fredag: Lav risiko (årlig)");
}

// Worker for å prosessere jobber
export const sdsWorker = new Worker(
  "sds-automation",
  async (job) => {
    if (job.name === "smart-sds-check") {
      console.log("🚀 Starter SMART SDS-sjekk...");
      await weeklySDSVersionCheck();
      console.log("✅ Smart SDS-sjekk fullført");
    }
  },
  { 
    connection,
    concurrency: 1, // Kun 1 jobb om gangen (unngå overlapping)
  }
);

sdsWorker.on("completed", (job) => {
  console.log(`✅ Jobb ${job.name} fullført`);
});

sdsWorker.on("failed", (job, err) => {
  console.error(`❌ Jobb ${job?.name} feilet:`, err);
});
