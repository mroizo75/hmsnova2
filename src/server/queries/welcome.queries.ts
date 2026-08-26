"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function fetchWelcomeData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true, startpakkeCompleted: true },
  });

  if (!tenant) return null;

  return JSON.parse(JSON.stringify({
    tenantId: session.user.tenantId,
    tenantName: tenant.name ?? "Din bedrift",
    startpakkeCompleted: tenant.startpakkeCompleted,
  }));
}
