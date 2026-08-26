"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchAudits() {
  const auth = await getAuthContext();
  if (!auth) return [];
  const { tenantId } = auth;

  const audits = await prisma.audit.findMany({
    where: { tenantId },
    include: {
      findings: true,
    },
    orderBy: { scheduledDate: "desc" },
    take: 50,
  });

  return JSON.parse(JSON.stringify(audits));
}

export async function fetchAuditDetail(id: string) {
  const auth = await getAuthContext();
  if (!auth) return null;
  const { tenantId } = auth;

  const audit = await prisma.audit.findUnique({
    where: { id, tenantId },
    include: {
      findings: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!audit) return null;

  const leadAuditor = await prisma.user.findUnique({
    where: { id: audit.leadAuditorId },
    select: { id: true, name: true, email: true },
  });

  const teamMemberIds = audit.teamMemberIds ? JSON.parse(audit.teamMemberIds) : [];
  const teamMembers = await prisma.user.findMany({
    where: { id: { in: teamMemberIds } },
    select: { id: true, name: true, email: true },
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

  return JSON.parse(JSON.stringify({
    audit,
    leadAuditor,
    teamMembers,
    tenantUsers,
  }));
}
