"use server";

import { prisma } from "@/lib/db";
import { getActionContext } from "@/server/actions/action-context";
import { revalidatePath } from "next/cache";

export async function createServiceRequest(input: {
  type: string;
  description?: string;
}) {
  const { tenantId } = await getActionContext();

  const request = await prisma.serviceRequest.create({
    data: {
      tenantId,
      type: input.type as any,
      description: input.description,
    },
  });

  revalidatePath("/dashboard");
  return { success: true, data: request };
}

export async function getServiceRequests() {
  const { tenantId } = await getActionContext();

  return prisma.serviceRequest.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function dismissServiceOffer() {
  const { tenantId } = await getActionContext();

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { serviceOfferDismissed: true },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
