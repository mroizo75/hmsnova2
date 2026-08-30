"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  canViewWhistleblowingContent,
  canViewWhistleblowingInbox,
  toWhistleblowingInboxView,
} from "@/lib/whistleblowing-access";

export async function fetchWhistleblowings() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !canViewWhistleblowingInbox(session.user.role)) {
    return null;
  }

  const canSeeContent = canViewWhistleblowingContent(session.user.role);
  const tenantId = session.user.tenantId;

  const [cases, tenant] = await Promise.all([
    canSeeContent
      ? prisma.whistleblowing.findMany({
          where: { tenantId },
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { receivedAt: "desc" },
        })
      : prisma.whistleblowing.findMany({
          where: { tenantId },
          select: {
            id: true,
            caseNumber: true,
            status: true,
            receivedAt: true,
            closedAt: true,
            isAnonymous: true,
          },
          orderBy: { receivedAt: "desc" },
        }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    }),
  ]);

  const safeCases = canSeeContent
    ? cases
    : cases.map((c) => toWhistleblowingInboxView(c));

  return JSON.parse(
    JSON.stringify({
      cases: safeCases,
      tenantSlug: tenant?.slug ?? "",
      canViewContent: canSeeContent,
    })
  );
}
