"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export async function getIntelligenceConsent() {
  const { tenantId } = await getRequiredTenantContext();

  const consent = await prisma.intelligenceConsent.findUnique({
    where: { tenantId },
  });

  // Default: opted-in (ingen rad = deltar)
  return consent ?? { optedIn: true, optedInAt: null, optedOutAt: null };
}

export async function updateIntelligenceConsent(optIn: boolean): Promise<{ success: boolean; error?: string }> {
  const { tenantId, userId } = await getRequiredTenantContext();

  const userTenant = await prisma.userTenant.findFirst({
    where: { tenantId, userId },
  });

  if (!userTenant || userTenant.role !== "ADMIN") {
    return { success: false, error: "Kun administrator kan endre dette" };
  }

  const now = new Date();

  await prisma.intelligenceConsent.upsert({
    where: { tenantId },
    create: {
      tenantId,
      optedIn: optIn,
      optedInAt: optIn ? now : null,
      optedOutAt: optIn ? null : now,
    },
    update: {
      optedIn: optIn,
      optedInAt: optIn ? now : undefined,
      optedOutAt: optIn ? undefined : now,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
