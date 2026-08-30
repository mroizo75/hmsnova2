import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canViewWhistleblowingContent,
  canViewWhistleblowingInbox,
  toWhistleblowingInboxView,
} from "@/lib/whistleblowing-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canViewWhistleblowingInbox(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canSeeContent = canViewWhistleblowingContent(session.user.role);

    if (!canSeeContent) {
      const reports = await db.whistleblowing.findMany({
        where: { tenantId: session.user.tenantId },
        select: {
          id: true,
          caseNumber: true,
          status: true,
          receivedAt: true,
          closedAt: true,
          isAnonymous: true,
        },
        orderBy: { receivedAt: "desc" },
      });
      return NextResponse.json({
        data: reports.map((r) => toWhistleblowingInboxView(r)),
        canViewContent: false,
      });
    }

    const reports = await db.whistleblowing.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { receivedAt: "desc" },
    });

    return NextResponse.json({ data: reports, canViewContent: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
