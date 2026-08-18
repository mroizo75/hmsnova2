"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateApiKey } from "@/lib/intelligence-api-auth";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) throw new Error("Forbidden");
}

export async function createApiKey(
  name: string,
): Promise<{ success: boolean; rawKey?: string; id?: string; error?: string }> {
  await requireSuperAdmin();

  if (!name.trim()) {
    return { success: false, error: "Navn er paakrevd" };
  }

  const { raw, hashed } = generateApiKey();

  const apiKey = await prisma.intelligenceApiKey.create({
    data: {
      name: name.trim(),
      hashedKey: hashed,
      permissions: { industries: ["all"], metrics: ["all"] },
      rateLimit: 100,
    },
  });

  return { success: true, rawKey: raw, id: apiKey.id };
}

export async function deactivateApiKey(id: string): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  await prisma.intelligenceApiKey.update({
    where: { id },
    data: { isActive: false },
  });

  return { success: true };
}

export async function getApiKeys() {
  await requireSuperAdmin();

  const keys = await prisma.intelligenceApiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { logs: true } },
    },
  });

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    isActive: k.isActive,
    rateLimit: k.rateLimit,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
    expiresAt: k.expiresAt?.toISOString() ?? null,
    requestCount: k._count.logs,
  }));
}
