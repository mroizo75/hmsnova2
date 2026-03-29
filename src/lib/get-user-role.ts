/**
 * Server-side utility for å hente brukerens rolle
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export async function getUserRole(): Promise<{ role: Role | null; tenantId: string | null }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email || !session.user.tenantId) {
    return { role: null, tenantId: null };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        where: { tenantId: session.user.tenantId },
        take: 1,
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return { role: null, tenantId: null };
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return { role: null, tenantId: null };
  }
  return {
    role: selectedMembership.role,
    tenantId: selectedMembership.tenantId,
  };
}

