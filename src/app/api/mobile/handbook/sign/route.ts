import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { signHandbook } from "@/server/actions/hms-handbok.actions";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = (await request.json()) as { versionId?: string; comment?: string };
    const result = await signHandbook({
      tenantId: session.user.tenantId,
      versionId: body.versionId,
      comment: body.comment,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Kunne ikke signere" }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Mobile Handbook Sign] Error:", error);
    return NextResponse.json({ error: "Kunne ikke signere håndboken" }, { status: 500 });
  }
}
