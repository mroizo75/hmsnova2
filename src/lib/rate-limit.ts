import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Sjekk om vi har Upstash credentials
const hasUpstashConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Fallback in-memory rate limiter for development
class MemoryRateLimiter {
  private cache: Map<string, { count: number; reset: number }> = new Map();
  private limit: number;
  private window: number;

  constructor(limit: number, windowSeconds: number) {
    this.limit = limit;
    this.window = windowSeconds * 1000; // Convert to ms
  }

  async limit(identifier: string): Promise<{ success: boolean; reset: number }> {
    const now = Date.now();
    const key = identifier;
    const cached = this.cache.get(key);

    if (!cached || cached.reset < now) {
      // New window
      this.cache.set(key, { count: 1, reset: now + this.window });
      return { success: true, reset: now + this.window };
    }

    if (cached.count >= this.limit) {
      // Rate limit exceeded
      return { success: false, reset: cached.reset };
    }

    // Increment count
    cached.count++;
    this.cache.set(key, cached);
    return { success: true, reset: cached.reset };
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.reset < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Auth rate limiter: 5 forsøk per 15 sekunder
export const authRateLimiter = hasUpstashConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "15 s"),
      analytics: true,
      prefix: "@upstash/ratelimit/auth",
    })
  : new MemoryRateLimiter(5, 15);

// Generell API rate limiter: 100 requests per minutt
export const apiRateLimiter = hasUpstashConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
      prefix: "@upstash/ratelimit/api",
    })
  : new MemoryRateLimiter(100, 60);

// Strict rate limiter for sensitive operations: 3 forsøk per 60 sekunder
export const strictRateLimiter = hasUpstashConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(3, "60 s"),
      analytics: true,
      prefix: "@upstash/ratelimit/strict",
    })
  : new MemoryRateLimiter(3, 60);

/**
 * Hent IP-adresse fra request
 */
export function getClientIp(request: Request): string {
  // Sjekk for proxied IP først
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback til "unknown" hvis vi ikke finner IP
  return "unknown";
}

/**
 * Rate limit middleware helper
 */
export async function checkRateLimit(
  identifier: string,
  limiter: typeof authRateLimiter | typeof apiRateLimiter | typeof strictRateLimiter = apiRateLimiter
): Promise<{ success: boolean; reset: number; remaining?: number }> {
  try {
    const result = await limiter.limit(identifier);
    return result;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Hvis rate limiting feiler, la requesten gå gjennom (fail open)
    return { success: true, reset: Date.now() + 60000 };
  }
}

