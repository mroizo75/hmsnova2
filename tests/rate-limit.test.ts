import assert from "node:assert/strict";
import test from "node:test";

import {
  checkRateLimit,
  checkRateLimitPolicy,
  createRateLimitIdentifier,
  createRateLimitResponse,
  getClientIpFromHeaders,
} from "../src/lib/rate-limit";

test("rate-limit-identifikatorer er deterministiske og skjuler rådata", async () => {
  const first = await createRateLimitIdentifier("login", [
    "Kenneth@example.com",
    "192.0.2.1",
  ]);
  const second = await createRateLimitIdentifier("login", [
    "kenneth@example.com",
    "192.0.2.1",
  ]);

  assert.equal(first, second);
  assert.equal(first.includes("kenneth@example.com"), false);
  assert.equal(first.includes("192.0.2.1"), false);
});

test("strict-policy avviser forespørsler over grensen", async () => {
  const uniqueClient = `test-${crypto.randomUUID()}`;
  const results = await Promise.all(
    Array.from({ length: 3 }, () =>
      checkRateLimitPolicy({
        policy: "strict",
        scope: "test-boundary",
        identifiers: [uniqueClient],
        failClosed: true,
      })
    )
  );
  const blocked = await checkRateLimitPolicy({
    policy: "strict",
    scope: "test-boundary",
    identifiers: [uniqueClient],
    failClosed: true,
  });

  assert.equal(results.every((result) => result.success), true);
  assert.equal(blocked.success, false);
  assert.equal(blocked.remaining, 0);
});

test("rate-limit-feil kan håndteres fail-closed og fail-open", async () => {
  const failingLimiter = {
    limit: async () => {
      throw new Error("Redis utilgjengelig");
    },
  };

  const closed = await checkRateLimit("closed", failingLimiter, {
    failClosed: true,
  });
  const open = await checkRateLimit("open", failingLimiter, {
    failClosed: false,
  });

  assert.equal(closed.success, false);
  assert.equal(open.success, true);
});

test("429-respons har standardformat og retry-headere", async () => {
  const response = createRateLimitResponse({
    success: false,
    reset: Date.now() + 30_000,
    remaining: 0,
    limit: 5,
  });
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(body.code, "RATE_LIMIT_EXCEEDED");
  assert.equal(typeof body.message, "string");
  assert.equal(typeof body.details.retryAfter, "number");
  assert.equal(response.headers.get("Retry-After") !== null, true);
  assert.equal(response.headers.get("X-RateLimit-Limit"), "5");
  assert.equal(response.headers.get("X-RateLimit-Remaining"), "0");
});

test("klient-IP bruker første videresendte adresse", () => {
  const headers = new Headers({
    "x-forwarded-for": "192.0.2.1, 198.51.100.3",
    "x-real-ip": "203.0.113.2",
  });

  assert.equal(getClientIpFromHeaders(headers), "192.0.2.1");
});
