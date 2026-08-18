import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export interface ApiKeyContext {
  apiKeyId: string;
  name: string;
  permissions: { industries: string[]; metrics: string[] };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { raw: string; hashed: string } {
  const raw = `hmsni_${crypto.randomBytes(32).toString("hex")}`;
  const hashed = hashApiKey(raw);
  return { raw, hashed };
}

export async function validateApiKey(request: Request): Promise<ApiKeyContext | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 },
    );
  }

  const rawKey = authHeader.slice(7);
  const hashed = hashApiKey(rawKey);

  const apiKey = await prisma.intelligenceApiKey.findUnique({
    where: { hashedKey: hashed },
  });

  if (!apiKey || !apiKey.isActive) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json({ error: "API key expired" }, { status: 401 });
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentRequests = await prisma.intelligenceApiLog.count({
    where: { apiKeyId: apiKey.id, createdAt: { gte: hourAgo } },
  });

  if (recentRequests >= apiKey.rateLimit) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: 3600 },
      { status: 429 },
    );
  }

  await prisma.intelligenceApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  const permissions = apiKey.permissions as { industries?: string[]; metrics?: string[] };

  return {
    apiKeyId: apiKey.id,
    name: apiKey.name,
    permissions: {
      industries: permissions.industries ?? ["all"],
      metrics: permissions.metrics ?? ["all"],
    },
  };
}

export async function logApiRequest(
  apiKeyId: string,
  endpoint: string,
  params: Record<string, unknown> | null,
  startTime: number,
) {
  const responseMs = Date.now() - startTime;
  await prisma.intelligenceApiLog.create({
    data: { apiKeyId, endpoint, params, responseMs },
  });
}

export function checkPermission(
  ctx: ApiKeyContext,
  industry?: string,
  metric?: string,
): NextResponse | null {
  if (industry && !ctx.permissions.industries.includes("all")) {
    if (!ctx.permissions.industries.includes(industry)) {
      return NextResponse.json(
        { error: `No access to industry: ${industry}` },
        { status: 403 },
      );
    }
  }

  if (metric && !ctx.permissions.metrics.includes("all")) {
    if (!ctx.permissions.metrics.includes(metric)) {
      return NextResponse.json(
        { error: `No access to metric: ${metric}` },
        { status: 403 },
      );
    }
  }

  return null;
}
