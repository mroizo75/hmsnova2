import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type TenantContext = {
  userId: string;
  email: string;
  tenantId: string;
};

export const getRequiredTenantContext = async (): Promise<TenantContext> => {
  const ctx = await getTenantContextSafe();
  if (!ctx) throw new Error("Unauthorized");
  return ctx;
};

export const getTenantContextSafe = async (): Promise<TenantContext | null> => {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id?.trim() ?? "";
  const sessionEmail = session?.user?.email?.trim() ?? "";
  const sessionTenantId = session?.user?.tenantId?.trim() ?? "";

  if (!sessionUserId || !sessionEmail || !sessionTenantId) {
    return null;
  }

  const membership = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: sessionUserId,
        tenantId: sessionTenantId,
      },
    },
    select: {
      userId: true,
      tenantId: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    userId: membership.userId,
    email: sessionEmail,
    tenantId: membership.tenantId,
  };
};
