import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type TenantContext = {
  userId: string;
  email: string;
  tenantId: string;
};

export const getRequiredTenantContext = async (): Promise<TenantContext> => {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id?.trim() ?? "";
  const sessionEmail = session?.user?.email?.trim() ?? "";
  const sessionTenantId = session?.user?.tenantId?.trim() ?? "";

  if (!sessionUserId || !sessionEmail || !sessionTenantId) {
    throw new Error("Unauthorized");
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
    throw new Error("User not associated with selected tenant");
  }

  return {
    userId: membership.userId,
    email: sessionEmail,
    tenantId: membership.tenantId,
  };
};
