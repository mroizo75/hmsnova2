"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function fetchWhistleblowings() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return null;

  const [cases, tenant] = await Promise.all([
    prisma.whistleblowing.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { slug: true },
    }),
  ]);

  return JSON.parse(JSON.stringify({ cases, tenantSlug: tenant?.slug ?? "" }));
}
