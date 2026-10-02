import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import { createErrorResponse, ErrorCodes } from "@/lib/validations/api";

type RateLimitResult = {
  success: boolean;
  reset: number;
  remaining?: number;
  limit?: number;
};

type RateLimiter = {
  limit(identifier: string): Promise<RateLimitResult>;
};

type RateLimitPolicyConfig = {
  limit: number;
  window: `${number} s` | `${number} m` | `${number} h`;
  windowSeconds: number;
};

export const RATE_LIMIT_POLICIES = {
  login: { limit: 5, window: "15 s", windowSeconds: 15 },
  generalApi: { limit: 100, window: "1 m", windowSeconds: 60 },
  authenticatedMutation: { limit: 120, window: "1 m", windowSeconds: 60 },
  employeeSubmission: { limit: 30, window: "10 m", windowSeconds: 600 },
  publicForm: { limit: 5, window: "10 m", windowSeconds: 600 },
  publicSignup: { limit: 3, window: "1 h", windowSeconds: 3600 },
  sensitiveLookup: { limit: 10, window: "10 m", windowSeconds: 600 },
  upload: { limit: 20, window: "10 m", windowSeconds: 600 },
  expensiveOperation: { limit: 10, window: "1 h", windowSeconds: 3600 },
  strict: { limit: 3, window: "60 s", windowSeconds: 60 },
} as const satisfies Record<string, RateLimitPolicyConfig>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
);

if (process.env.NODE_ENV === "production" && !hasUpstashConfig) {
  throw new Error(
    "UPSTASH_REDIS_REST_URL og UPSTASH_REDIS_REST_TOKEN er påkrevd i produksjon"
  );
}

class MemoryRateLimiter {
  private readonly cache = new Map<string, { count: number; reset: number }>();
  private requestCount = 0;

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number
  ) {}

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    this.requestCount += 1;
    if (this.requestCount % 100 === 0) {
      this.cleanup(now);
    }

    const cached = this.cache.get(identifier);

    if (!cached || cached.reset < now) {
      const reset = now + this.windowMs;
      this.cache.set(identifier, { count: 1, reset });
      return {
        success: true,
        reset,
        remaining: this.maxAttempts - 1,
        limit: this.maxAttempts,
      };
    }

    if (cached.count >= this.maxAttempts) {
      return {
        success: false,
        reset: cached.reset,
        remaining: 0,
        limit: this.maxAttempts,
      };
    }

    const nextCount = cached.count + 1;
    this.cache.set(identifier, { ...cached, count: nextCount });
    return {
      success: true,
      reset: cached.reset,
      remaining: this.maxAttempts - nextCount,
      limit: this.maxAttempts,
    };
  }

  private cleanup(now: number): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.reset < now) {
        this.cache.delete(key);
      }
    }
  }
}

function createRateLimiter(
  name: RateLimitPolicyName,
  config: RateLimitPolicyConfig
): RateLimiter {
  if (!hasUpstashConfig) {
    return new MemoryRateLimiter(config.limit, config.windowSeconds * 1000);
  }

  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    analytics: true,
    prefix: `@upstash/ratelimit/${name}`,
  });
}

export const rateLimiters = Object.fromEntries(
  Object.entries(RATE_LIMIT_POLICIES).map(([name, config]) => [
    name,
    createRateLimiter(name as RateLimitPolicyName, config),
  ])
) as Record<RateLimitPolicyName, RateLimiter>;

export function getClientIpFromHeaders(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim().slice(0, 64);
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim().slice(0, 64);
  }

  return "unknown";
}

export function getClientIp(request: Request): string {
  return getClientIpFromHeaders(request.headers);
}

export async function createRateLimitIdentifier(
  scope: string,
  identifiers: Array<string | null | undefined>
): Promise<string> {
  const normalized = identifiers
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value))
    .join("|");
  const bytes = new TextEncoder().encode(normalized || "anonymous");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `${scope}:${hash}`;
}

export async function checkRateLimit(
  identifier: string,
  limiter: RateLimiter = rateLimiters.generalApi,
  options?: { failClosed?: boolean }
): Promise<RateLimitResult> {
  try {
    return await limiter.limit(identifier);
  } catch {
    if (options?.failClosed) {
      return { success: false, reset: Date.now() + 60000 };
    }

    return { success: true, reset: Date.now() + 60000 };
  }
}

export async function checkRateLimitPolicy(input: {
  policy: RateLimitPolicyName;
  scope: string;
  identifiers: Array<string | null | undefined>;
  failClosed?: boolean;
}): Promise<RateLimitResult> {
  const identifier = await createRateLimitIdentifier(
    input.scope,
    input.identifiers
  );

  return checkRateLimit(identifier, rateLimiters[input.policy], {
    failClosed: input.failClosed ?? true,
  });
}

export function createRateLimitResponse(
  result: RateLimitResult,
  message = "For mange forespørsler. Prøv igjen senere."
): NextResponse {
  const retryAfter = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000)
  );
  const response = createErrorResponse(
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    message,
    429,
    { retryAfter }
  );
  response.headers.set("Retry-After", String(retryAfter));
  if (result.limit !== undefined) {
    response.headers.set("X-RateLimit-Limit", String(result.limit));
  }
  if (result.remaining !== undefined) {
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  }
  response.headers.set("X-RateLimit-Reset", String(result.reset));
  return response;
}
