"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Ikke autentisert");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true, isSupport: true },
  });

  if (!user?.isSuperAdmin && !user?.isSupport) {
    throw new Error("Ingen tilgang");
  }

  return user;
}

export async function getAllServiceRequests() {
  await requireSuperAdmin();

  return prisma.serviceRequest.findMany({
    include: {
      tenant: { select: { id: true, name: true, contactEmail: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateServiceRequest(input: {
  id: string;
  status?: string;
  price?: number | null;
  notes?: string | null;
}) {
  await requireSuperAdmin();

  const data: Record<string, unknown> = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.price !== undefined) data.price = input.price;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status === "COMPLETED") data.completedAt = new Date();

  const updated = await prisma.serviceRequest.update({
    where: { id: input.id },
    data,
  });

  revalidatePath("/admin/service-requests");
  return { success: true, data: updated };
}
