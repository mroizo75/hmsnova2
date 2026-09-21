import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOnlinePresenceSnapshot } from "@/lib/presence";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Ikke innlogget" }, { status: 401 });
  }

  const staff = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true, isSupport: true },
  });

  if (!staff?.isSuperAdmin && !staff?.isSupport) {
    return NextResponse.json({ code: "FORBIDDEN", message: "Ingen tilgang" }, { status: 403 });
  }

  const snapshot = await getOnlinePresenceSnapshot();
  return NextResponse.json(snapshot);
}
