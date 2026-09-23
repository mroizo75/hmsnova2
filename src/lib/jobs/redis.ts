import IORedis from "ioredis";

/**
 * BullMQ krever maxRetriesPerRequest: null.
 * REDIS_URL (Upstash) har forrang. Upstash krever TLS selv om URL er redis://.
 * Aldri fall tilbake til localhost — det gir ECONNREFUSED i neste dev.
 */
export function jobsRedisUrl(raw = process.env.REDIS_URL?.trim() ?? ""): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.endsWith("upstash.io") && parsed.protocol === "redis:") {
      parsed.protocol = "rediss:";
      return parsed.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

export function isJobsRedisConfigured(): boolean {
  if (process.env.JOBS_REDIS === "0") return false;
  return Boolean(jobsRedisUrl() || process.env.REDIS_HOST?.trim());
}

let shared: IORedis | null = null;

export function createJobsRedis(): IORedis {
  if (shared) return shared;
  if (!isJobsRedisConfigured()) {
    throw new Error("JOBS_REDIS_NOT_CONFIGURED");
  }

  const url = jobsRedisUrl();
  const client = url
    ? new IORedis(url, redisOptions())
    : new IORedis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        ...redisOptions(),
      });

  client.on("error", () => undefined);
  shared = client;
  return client;
}

function redisOptions() {
  return {
    maxRetriesPerRequest: null as null,
    family: 0,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 2) return null;
      return Math.min(times * 200, 800);
    },
  };
}
