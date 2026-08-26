"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function fetchComplaints() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return null;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return null;
  }

  const tenantId = selectedMembership.tenantId;

  const complaints = await prisma.incident.findMany({
    where: { tenantId, type: "CUSTOMER" },
    include: {
      measures: true,
    },
    orderBy: { occurredAt: "desc" },
  });

  return JSON.parse(JSON.stringify(complaints));
}
