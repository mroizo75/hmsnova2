"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  canHandleWhistleblowingCases,
  canViewWhistleblowingContent,
  canViewWhistleblowingInbox,
} from "@/lib/whistleblowing-access";
import { resolveCaseAccess } from "@/lib/whistleblowing-case-access";

export async function fetchWhistleblowings() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return null;
  }

  const tenantId = session.user.tenantId;
  const role = session.user.role;
  const isHandler = canViewWhistleblowingInbox(role) && canViewWhistleblowingContent(role);

  const [cases, tenant, grants] = await Promise.all([
    isHandler
      ? prisma.whistleblowing.findMany({
          where: { tenantId },
          include: {
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            parties: { where: { role: "ACCUSED", userId: { not: null } }, select: { userId: true } },
          },
          orderBy: { receivedAt: "desc" },
        })
      : prisma.whistleblowing.findMany({
          where: {
            tenantId,
            grants: {
              some: {
                granteeId: session.user.id,
                revokedAt: null,
                expiresAt: { gt: new Date() },
                type: { in: ["ASSIGN", "ASSIST", "BREAK_GLASS"] },
              },
            },
          },
          select: {
            id: true,
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
    prisma.whistleblowAccessGrant.findMany({
      where: {
        tenantId,
        granteeId: session.user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { whistleblowingId: true, type: true, objects: true, expiresAt: true, revokedAt: true, id: true, granteeId: true },
    }),
  ]);

  const safeCases = isHandler
    ? (cases as Array<{
        id: string;
        caseNumber: string;
        status: string;
        receivedAt: Date;
        closedAt: Date | null;
        isAnonymous: boolean;
        title: string;
        category: string;
        severity: string;
        parties: { userId: string | null }[];
        messages: unknown[];
      }>).map((report) => {
        const accusedUserIds = report.parties.map((p) => p.userId).filter((id): id is string => Boolean(id));
        const decision = resolveCaseAccess({
          actor: { userId: session.user.id, role },
          accusedUserIds,
          grants: grants.filter((g) => g.whistleblowingId === report.id),
        });
        if (decision.reason === "INHABILE") {
          return {
            id: report.id,
            caseNumber: report.caseNumber,
            status: report.status,
            receivedAt: report.receivedAt,
            closedAt: report.closedAt,
            isAnonymous: true,
            inhabile: true,
            title: "Utilgjengelig (inhabil)",
          };
        }
        return report;
      })
    : cases.map((c) => ({
        id: c.id,
        caseNumber: "Konfidensiell sak",
        status: c.status,
        receivedAt: c.receivedAt,
        closedAt: c.closedAt,
        isAnonymous: true,
      }));

  return JSON.parse(
    JSON.stringify({
      cases: safeCases,
      tenantSlug: tenant?.slug ?? "",
      canViewContent: isHandler,
      canHandle: canHandleWhistleblowingCases(role),
    }),
  );
}
