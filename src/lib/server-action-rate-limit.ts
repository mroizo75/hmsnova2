import { headers } from "next/headers";

import {
  checkRateLimitPolicy,
  getClientIpFromHeaders,
  type RateLimitPolicyName,
} from "@/lib/rate-limit";

export async function checkServerActionRateLimit(input: {
  policy: RateLimitPolicyName;
  scope: string;
  identifiers?: Array<string | null | undefined>;
}): Promise<boolean> {
  const requestHeaders = await headers();
  const result = await checkRateLimitPolicy({
    policy: input.policy,
    scope: input.scope,
    identifiers: [
      getClientIpFromHeaders(new Headers(requestHeaders)),
      ...(input.identifiers ?? []),
    ],
    failClosed: true,
  });

  return result.success;
}
