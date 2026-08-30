"use server";

import { revalidatePath } from "next/cache";
import { MessagePriority } from "@prisma/client";

import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  requireCorporateGroupContext,
  requireGroupPermission,
  assertTenantsInGroup,
} from "@/lib/corporate-group-context";

// ── Konsern-side: opprett melding ──

export async function createGroupMessage(data: {
  title: string;
  body: string;
  priority: MessagePriority;
  requiresAck: boolean;
  deadline?: string | null;
  targetAll: boolean;
  targetTenantIds?: string[];
}) {
  const context = await requireGroupPermission("canManageTenants");

  if (!data.title.trim() || !data.body.trim()) {
    throw new Error("Tittel og melding er påkrevd");
  }

  const message = await prisma.corporateGroupMessage.create({
    data: {
      groupId: context.groupId,
      authorId: context.userId,
      title: data.title.trim(),
      body: data.body.trim(),
      priority: data.priority,
      requiresAck: data.requiresAck,
      deadline: data.deadline ? new Date(data.deadline) : null,
      targetAll: data.targetAll,
    },
  });

  if (!data.targetAll && data.targetTenantIds?.length) {
    await assertTenantsInGroup(context.groupId, data.targetTenantIds);
    await prisma.corporateGroupMessageTarget.createMany({
      data: data.targetTenantIds.map((tenantId) => ({
        messageId: message.id,
        tenantId,
      })),
    });
  }

  revalidatePath("/konsern/meldinger");
  return message;
}

// ── Konsern-side: hent alle meldinger med lesekvittering-status ──

export async function listGroupMessages() {
  const context = await requireCorporateGroupContext();

  const messages = await prisma.corporateGroupMessage.findMany({
    where: { groupId: context.groupId },
    include: {
      author: { select: { name: true, email: true } },
      targets: {
        include: { tenant: { select: { id: true, name: true } } },
      },
      receipts: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          tenant: { select: { id: true, name: true } },
        },
      },
      _count: { select: { receipts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Hent alle aktive tenants for å beregne lesedekning
  const tenants = await prisma.corporateGroupTenant.findMany({
    where: { groupId: context.groupId, status: "ACTIVE" },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          users: { select: { userId: true } },
        },
      },
    },
  });

  const tenantMap = new Map(tenants.map((t) => [t.tenantId, t.tenant]));
  const allTenantIds = tenants.map((t) => t.tenantId);

  return messages.map((msg) => {
    const targetTenantIds = msg.targetAll
      ? allTenantIds
      : msg.targets.map((t) => t.tenantId);

    // Finn totalt antall brukere i målbedrifter
    let totalUsers = 0;
    const tenantStatus: Array<{
      tenantId: string;
      tenantName: string;
      totalUsers: number;
      readUsers: number;
      readBy: Array<{ name: string | null; email: string; readAt: Date }>;
    }> = [];

    for (const tid of targetTenantIds) {
      const tenant = tenantMap.get(tid);
      if (!tenant) continue;
      const tenantUserCount = tenant.users.length;
      totalUsers += tenantUserCount;

      const tenantReceipts = msg.receipts.filter((r) => r.tenantId === tid);
      tenantStatus.push({
        tenantId: tid,
        tenantName: tenant.name,
        totalUsers: tenantUserCount,
        readUsers: tenantReceipts.length,
        readBy: tenantReceipts.map((r) => ({
          name: r.user.name,
          email: r.user.email,
          readAt: r.readAt,
        })),
      });
    }

    return {
      id: msg.id,
      title: msg.title,
      body: msg.body,
      priority: msg.priority,
      requiresAck: msg.requiresAck,
      deadline: msg.deadline,
      targetAll: msg.targetAll,
      author: msg.author,
      createdAt: msg.createdAt,
      totalRecipientTenants: targetTenantIds.length,
      totalRecipientUsers: totalUsers,
      totalRead: msg._count.receipts,
      readPercentage: totalUsers > 0 ? Math.round((msg._count.receipts / totalUsers) * 100) : 0,
      tenantStatus,
    };
  });
}

// ── Konsern-side: hent én melding med full status ──

export async function getGroupMessage(messageId: string) {
  const context = await requireCorporateGroupContext();

  const msg = await prisma.corporateGroupMessage.findFirst({
    where: { id: messageId, groupId: context.groupId },
    include: {
      author: { select: { name: true, email: true } },
      targets: { include: { tenant: { select: { id: true, name: true } } } },
      receipts: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { readAt: "asc" },
      },
    },
  });

  if (!msg) throw new Error("Melding ikke funnet");
  return msg;
}

// ── Konsern-side: slett melding ──

export async function deleteGroupMessage(messageId: string) {
  const context = await requireGroupPermission("canManageTenants");

  await prisma.corporateGroupMessage.delete({
    where: { id: messageId, groupId: context.groupId },
  });

  revalidatePath("/konsern/meldinger");
}

async function requireSessionTenantMembership() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const tenantId = session?.user?.tenantId;

  if (!userId || !tenantId) {
    return null;
  }

  const userTenant = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: { userId, tenantId },
    },
    select: { userId: true, tenantId: true },
  });

  if (!userTenant) {
    return null;
  }

  return userTenant;
}

// ── Bedrift-side: hent meldinger til min tenant ──

export async function getMessagesForTenant() {
  const sessionTenant = await requireSessionTenantMembership();
  if (!sessionTenant) return [];

  const { userId, tenantId } = sessionTenant;

  const membership = await prisma.corporateGroupTenant.findFirst({
    where: { tenantId, status: "ACTIVE" },
    select: { groupId: true },
  });

  if (!membership) return [];

  const messages = await prisma.corporateGroupMessage.findMany({
    where: {
      groupId: membership.groupId,
      OR: [
        { targetAll: true },
        { targets: { some: { tenantId } } },
      ],
    },
    include: {
      author: { select: { name: true } },
      receipts: {
        where: { userId },
        select: { readAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return messages.map((msg) => ({
    id: msg.id,
    title: msg.title,
    body: msg.body,
    priority: msg.priority,
    requiresAck: msg.requiresAck,
    deadline: msg.deadline,
    author: msg.author.name,
    createdAt: msg.createdAt,
    isRead: msg.receipts.length > 0,
    readAt: msg.receipts[0]?.readAt ?? null,
  }));
}

// ── Bedrift-side: bekreft lesing ──

export async function acknowledgeMessage(messageId: string) {
  const sessionTenant = await requireSessionTenantMembership();
  if (!sessionTenant) {
    throw new Error("Ikke autorisert");
  }

  const { userId, tenantId } = sessionTenant;

  const membership = await prisma.corporateGroupTenant.findFirst({
    where: { tenantId, status: "ACTIVE" },
    select: { groupId: true },
  });

  if (!membership) {
    throw new Error("Bedriften tilhører ikke et konsern");
  }

  const message = await prisma.corporateGroupMessage.findFirst({
    where: {
      id: messageId,
      groupId: membership.groupId,
      OR: [
        { targetAll: true },
        { targets: { some: { tenantId } } },
      ],
    },
    select: { id: true },
  });

  if (!message) {
    throw new Error("Melding ikke funnet");
  }

  const existing = await prisma.corporateGroupMessageReceipt.findUnique({
    where: { messageId_userId: { messageId, userId } },
  });

  if (existing) return existing;

  const receipt = await prisma.corporateGroupMessageReceipt.create({
    data: { messageId, userId, tenantId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meldinger");
  return receipt;
}

// ── Bedrift-side: antall uleste meldinger ──

export async function getUnreadMessageCount(): Promise<number> {
  const sessionTenant = await requireSessionTenantMembership();
  if (!sessionTenant) return 0;

  const { userId, tenantId } = sessionTenant;

  const membership = await prisma.corporateGroupTenant.findFirst({
    where: { tenantId, status: "ACTIVE" },
    select: { groupId: true },
  });

  if (!membership) return 0;

  const totalMessages = await prisma.corporateGroupMessage.count({
    where: {
      groupId: membership.groupId,
      requiresAck: true,
      OR: [
        { targetAll: true },
        { targets: { some: { tenantId } } },
      ],
    },
  });

  const readMessages = await prisma.corporateGroupMessageReceipt.count({
    where: {
      userId,
      message: {
        groupId: membership.groupId,
        requiresAck: true,
        OR: [
          { targetAll: true },
          { targets: { some: { tenantId } } },
        ],
      },
    },
  });

  return totalMessages - readMessages;
}
