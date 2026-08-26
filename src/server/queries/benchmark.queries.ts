"use server";

import { getTenantBenchmark } from "@/server/actions/benchmark.actions";

export async function fetchBenchmarkData() {
  const data = await getTenantBenchmark();
  return JSON.parse(JSON.stringify(data));
}
