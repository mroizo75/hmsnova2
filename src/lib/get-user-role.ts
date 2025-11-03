/**
 * Server-side utility for å hente brukerens rolle
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export async function getUserRole(): Promise<{ role: Role | null; tenantId: string | null }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return { role: null, tenantId: null };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        take: 1,
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return { role: null, tenantId: null };
  }

  return {
    role: user.tenants[0].role,
    tenantId: user.tenants[0].tenantId,
  };
}

