"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function fetchMeasures(source?: string) {
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

  const sourceFilter: Record<string, object> = {
    risk: { riskId: { not: null } },
    incident: { incidentId: { not: null } },
    audit: { auditId: { not: null } },
    goal: { goalId: { not: null } },
    inspection: { inspectionFindings: { some: {} } },
    meeting: { decisionMeasures: { some: {} } },
  };

  const measures = await prisma.measure.findMany({
    where: {
      tenantId,
      ...(source && sourceFilter[source] ? sourceFilter[source] : {}),
    },
    include: {
      risk: { select: { id: true, title: true } },
      incident: { select: { id: true, title: true, avviksnummer: true } },
      audit: { select: { id: true, title: true } },
      goal: { select: { id: true, title: true } },
      inspectionFindings: {
        select: {
          id: true,
          title: true,
          inspection: { select: { id: true, title: true } },
        },
      },
      decisionMeasures: {
        select: {
          id: true,
          title: true,
          meeting: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { dueAt: "asc" },
    ],
  });

  const tenantUsers = await prisma.user.findMany({
    where: {
      tenants: {
        some: { tenantId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const now = new Date();
  const stats = {
    total: measures.length,
    pending: measures.filter((m: any) => m.status === "PENDING").length,
    inProgress: measures.filter((m: any) => m.status === "IN_PROGRESS").length,
    done: measures.filter((m: any) => m.status === "DONE").length,
    overdue: measures.filter((m: any) => m.status !== "DONE" && new Date(m.dueAt) < now).length,
  };

  return JSON.parse(JSON.stringify({
    measures,
    tenantUsers,
    tenantId,
    stats,
  }));
}
