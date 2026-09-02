import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canViewWhistleblowingContent,
  canViewWhistleblowingInbox,
  toWhistleblowingInboxView,
} from "@/lib/whistleblowing-access";
import { isAccusedOfCase } from "@/lib/whistleblowing-impartiality";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canViewWhistleblowingInbox(session.user.role) || !canViewWhistleblowingContent(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reports = await db.whistleblowing.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        parties: {
          where: { role: "ACCUSED" },
          select: { userId: true },
        },
      },
      orderBy: { receivedAt: "desc" },
    });

    const data = reports.map((report) => {
      const accusedUserIds = report.parties
        .map((party) => party.userId)
        .filter((id): id is string => Boolean(id));
      if (isAccusedOfCase(session.user.id, accusedUserIds)) {
        return {
          ...toWhistleblowingInboxView(report),
          inhabile: true,
          title: "Utilgjengelig (inhabil)",
        };
      }
      const { parties: _parties, ...safe } = report;
      return safe;
    });

    return NextResponse.json({ data, canViewContent: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
