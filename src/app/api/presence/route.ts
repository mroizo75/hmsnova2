import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { touchUserPresence } from "@/lib/presence";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Ikke innlogget" }, { status: 401 });
  }

  await touchUserPresence(session.user.id);
  return NextResponse.json({ success: true });
}
